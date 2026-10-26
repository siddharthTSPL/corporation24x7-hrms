const { fmtPeriod } = require("../engine/dates");
const { makeAccumulator } = require("../engine/summary");
const { round2 } = require("./_shared");
const { FINAL_LABELS, STATUS_LABEL, PERIOD_FILTERS, periodOf, payrollDocsByMonth } = require("./_payroll");

const sum = (arr) => (arr || []).reduce((s, x) => s + (Number(x?.amount) || 0), 0);

/**
 * PURE (unit-tested): one stored payroll document -> one register row.
 * "Gross Salary" = earnings.gross, i.e. the gross EARNED for the paid days (after
 * proration). It is NOT breakup.monthlyGross (the full fixed gross) - that one
 * is shown as "Fixed Monthly Gross" for comparison.
 * Net salary is the STORED netSalary; we only verify it, never recompute it.
 * Employer contributions are deliberately absent here (they are not part of net pay).
 */
function registerRow(doc) {
  const e = doc.earnings || {};
  const d = doc.deductions || {};
  const a = doc.attendance || {};
  const b = doc.breakup || {};
  const snap = doc.employeeSnapshot || {};
  const totalEarnings = Number(e.totalEarnings) || 0;
  const totalDeductions = Number(d.totalDeductions) || 0;
  const net = Number(doc.netSalary) || 0;
  return {
    uid: snap.employeeId || "",
    name: snap.name || "",
    department: snap.department || "",
    designation: snap.designation || "",
    period: fmtPeriod(doc.year, doc.month),
    workingDays: a.workingDays ?? null,
    paidDays: a.paidDays ?? null,
    lopDays: a.lopDays ?? null,
    basic: b.basic || 0,
    hra: b.hra || 0,
    allowances: round2(sum(b.allowances)),
    bonus: e.bonus || 0,
    incentive: e.incentive || 0,
    overtime: e.overtime || 0,
    reimbursement: e.reimbursement || 0,
    otherEarnings: round2((e.other || 0) + (e.benefits || 0) + (e.reimbursementComponents || 0)),
    totalEarnings: round2(totalEarnings),
    pf: d.pf || 0,
    esi: d.esi || 0,
    professionalTax: d.professionalTax || 0,
    tds: d.tds || 0,
    lwf: d.lwf || 0,
    loanAdvance: round2((d.loan || 0) + (d.advance || 0)),
    otherDeductions: round2((d.other || 0) + (d.components || 0)),
    totalDeductions: round2(totalDeductions),
    grossSalary: round2(e.gross || 0),
    fixedMonthlyGross: round2(b.monthlyGross || 0),
    netSalary: round2(net),
    status: STATUS_LABEL[doc.status] || doc.status,
    check: Math.abs(round2(totalEarnings - totalDeductions) - round2(net)) < 0.01 ? "OK" : "Mismatch",
  };
}

const money = (key, header, extra = {}) => ({ key, header, type: "currency", width: 14, ...extra });

const columns = [
  { key: "uid", header: "Employee ID", type: "text", width: 14 },
  { key: "name", header: "Employee Name", type: "text", width: 26 },
  { key: "department", header: "Department", type: "text", width: 18 },
  { key: "designation", header: "Designation", type: "text", width: 20 },
  { key: "period", header: "Payroll Period", type: "text", width: 14 },
  { key: "workingDays", header: "Working Days", type: "number", width: 13 },
  { key: "paidDays", header: "Paid Days", type: "number", width: 11 },
  { key: "lopDays", header: "LOP Days", type: "number", width: 11 },
  money("basic", "Basic", { total: true }),
  money("hra", "HRA", { total: true }),
  money("allowances", "Allowances", { total: true }),
  money("bonus", "Bonus", { total: true }),
  money("incentive", "Incentive", { total: true }),
  money("overtime", "Overtime", { total: true }),
  money("reimbursement", "Reimbursement", { total: true }),
  money("otherEarnings", "Other Earnings & Benefits", { total: true }),
  money("totalEarnings", "Total Earnings", { total: true }),
  money("pf", "PF (Employee)", { total: true }),
  money("esi", "ESI (Employee)", { total: true }),
  money("professionalTax", "Professional Tax", { total: true }),
  money("tds", "TDS", { total: true }),
  money("lwf", "LWF (Employee)", { total: true }),
  money("loanAdvance", "Loan & Advance", { total: true }),
  money("otherDeductions", "Other Deductions", { total: true }),
  money("totalDeductions", "Total Deductions", { total: true }),
  money("grossSalary", "Gross Salary (Earned)", { total: true }),
  money("fixedMonthlyGross", "Fixed Monthly Gross"),
  money("netSalary", "Net Salary", { total: true }),
  { key: "status", header: "Payroll Status", type: "text", width: 18 },
  { key: "check", header: "Net Check", type: "text", width: 11 },
];

module.exports = {
  key: "monthly-payroll-register",
  name: "Monthly Payroll Register",
  category: "payroll",
  sensitive: true, // run, export AND denied attempts are audited
  description: "Employee-wise earnings, deductions, gross and net salary from finalised payroll.",
  filters: PERIOD_FILTERS,
  columns,
  notes: [
    "Read from stored payroll results - the payroll engine is not re-run. Totals count FINALISED payroll only (Approved + Paid).",
    "Gross Salary is the gross earned for the paid days; 'Fixed Monthly Gross' is the full monthly gross before loss of pay.",
    "Employee deductions only. Employer contributions are not part of net pay and appear in the Payroll Earnings & Deductions report.",
    "Bank and account details are intentionally excluded.",
  ],
  period: (f) => {
    const { from, to } = periodOf(f);
    return from.year === to.year && from.month === to.month ? fmtPeriod(from.year, from.month) : `${fmtPeriod(from.year, from.month)} to ${fmtPeriod(to.year, to.month)}`;
  },
  validate(f) { periodOf(f); },
  registerRow,
  accumulator() {
    const base = makeAccumulator(columns);
    let excluded = 0;
    let mismatches = 0;
    return {
      add(row) {
        if (!FINAL_LABELS.has(row.status)) { excluded += 1; return; }
        base.add(row);
        if (row.check !== "OK") mismatches += 1;
      },
      result() {
        const r = base.result();
        r.items[0].label = "Finalised payroll records";
        if (excluded) r.items.push({ label: "Draft / on-hold records (excluded from totals)", value: excluded, type: "integer" });
        r.items.push({ label: "Records where Net ≠ Earnings − Deductions", value: mismatches, type: "integer" });
        return r;
      },
    };
  },
  async *rows(ctx, f) {
    for await (const docs of payrollDocsByMonth(ctx, f)) yield docs.map(registerRow);
  },
};
