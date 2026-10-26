const { fmtPeriod } = require("../engine/dates");
const { round2 } = require("./_shared");
const { FINAL_LABELS, STATUS_LABEL, PERIOD_FILTERS, periodOf, payrollDocsByMonth } = require("./_payroll");

const T = {
  earning: "Earning",
  deduction: "Deduction",
  employer: "Employer Contribution",
  memo: "Memo (not part of net pay)",
};
const TYPE_OPTIONS = Object.values(T).map((v) => ({ value: v, label: v }));

/**
 * PURE (unit-tested): unpivot ONE stored payroll document into component rows.
 *  - Earnings and Deductions reconcile to the stored totals. If the itemised
 *    parts do not add up to a stored total, the gap is emitted as an explicit
 *    "(unitemised)" row so sums always tie out instead of silently drifting.
 *  - Employer contributions are a SEPARATE type and never enter net pay.
 *  - Loss of Pay is NOT a deduction in this engine (it is already reflected in
 *    the pro-rated earnings and excluded from totalDeductions), so it is a memo row.
 */
function unpivot(doc) {
  const e = doc.earnings || {};
  const d = doc.deductions || {};
  const ec = doc.employerContribution || {};
  const b = doc.breakup || {};
  const rows = [];
  const add = (component, type, amount) => {
    const a = round2(amount);
    if (a !== 0) rows.push({ component, type, amount: a });
  };
  const itemised = (list, fallbackName, type, storedTotal, unitemisedName) => {
    let s = 0;
    for (const c of list || []) { add(c.name || fallbackName, type, c.amount); s += Number(c.amount) || 0; }
    const gap = round2((Number(storedTotal) || 0) - s);
    if (Math.abs(gap) >= 0.01) add(unitemisedName, type, gap);
  };

  // ---- Earnings ----
  add("Basic", T.earning, b.basic);
  add("HRA", T.earning, b.hra);
  let gross = (Number(b.basic) || 0) + (Number(b.hra) || 0);
  for (const a of b.allowances || []) { add(a.name || "Allowance", T.earning, a.amount); gross += Number(a.amount) || 0; }
  const grossGap = round2((Number(e.gross) || 0) - gross);
  if (Math.abs(grossGap) >= 0.01) add("Other Gross Components (unitemised)", T.earning, grossGap);
  add("Bonus", T.earning, e.bonus);
  add("Incentive", T.earning, e.incentive);
  add("Overtime", T.earning, e.overtime);
  add("Reimbursement", T.earning, e.reimbursement);
  add("Other Earnings", T.earning, e.other);
  itemised(b.benefitComponents, "Benefit", T.earning, e.benefits, "Benefits (unitemised)");
  itemised(b.reimbursementComponents, "Reimbursement Component", T.earning, e.reimbursementComponents, "Reimbursement Components (unitemised)");

  // ---- Deductions (employee side) ----
  add("Provident Fund (Employee)", T.deduction, d.pf);
  add("ESI (Employee)", T.deduction, d.esi);
  add("Professional Tax", T.deduction, d.professionalTax);
  add("TDS", T.deduction, d.tds);
  add("Labour Welfare Fund (Employee)", T.deduction, d.lwf);
  add("Loan Recovery", T.deduction, d.loan);
  add("Advance Recovery", T.deduction, d.advance);
  add("Other Deductions", T.deduction, d.other);
  itemised(b.deductionComponents, "Deduction Component", T.deduction, d.components, "Deduction Components (unitemised)");

  // ---- Employer side - separate type, NOT part of net pay ----
  add("Provident Fund (Employer)", T.employer, ec.pf);
  add("ESI (Employer)", T.employer, ec.esi);
  add("Labour Welfare Fund (Employer)", T.employer, ec.lwf);
  add("Gratuity (estimate)", T.employer, ec.gratuity);
  add("Statutory Bonus (estimate)", T.employer, ec.statutoryBonus);

  // ---- Memo ----
  add("Loss of Pay (already reflected in earnings)", T.memo, d.lossOfPay);
  return rows;
}

/** PURE: do stored earnings - deductions equal the stored net salary? */
const reconciles = (doc) =>
  Math.abs(round2((doc.earnings?.totalEarnings || 0) - (doc.deductions?.totalDeductions || 0)) - round2(doc.netSalary || 0)) < 0.01;

const columns = [
  { key: "period", header: "Payroll Period", type: "text", width: 14 },
  { key: "uid", header: "Employee ID", type: "text", width: 14 },
  { key: "name", header: "Employee Name", type: "text", width: 26 },
  { key: "department", header: "Department", type: "text", width: 18 },
  { key: "component", header: "Salary Component", type: "text", width: 40 },
  { key: "type", header: "Component Type", type: "text", width: 26 },
  { key: "amount", header: "Amount", type: "currency", width: 15 },
  { key: "inNetPay", header: "Part of Net Pay", type: "text", width: 15 },
  { key: "status", header: "Payroll Status", type: "text", width: 18 },
  { key: "check", header: "Net Check", type: "text", width: 11 },
];

module.exports = {
  key: "payroll-earnings-deductions",
  name: "Payroll Earnings & Deductions Report",
  category: "payroll",
  sensitive: true,
  description: "Salary component-wise amounts with employee deductions and employer contributions kept separate.",
  filters: [
    ...PERIOD_FILTERS,
    { key: "types", label: "Component Type", type: "multiselect", options: TYPE_OPTIONS },
    { key: "component", label: "Salary Component (contains)", type: "text" },
  ],
  columns,
  notes: [
    "Read from stored payroll results. Summary totals count FINALISED payroll only (Approved + Paid).",
    "Employer contributions and Loss of Pay are shown as their own types and are never added to or subtracted from net pay.",
    "Net Check compares stored earnings minus stored deductions with the stored net salary.",
  ],
  period: (f) => {
    const { from, to } = periodOf(f);
    return from.year === to.year && from.month === to.month ? fmtPeriod(from.year, from.month) : `${fmtPeriod(from.year, from.month)} to ${fmtPeriod(to.year, to.month)}`;
  },
  validate(f) { periodOf(f); },
  unpivot,
  reconciles,
  accumulator() {
    const sums = { [T.earning]: 0, [T.deduction]: 0, [T.employer]: 0, [T.memo]: 0 };
    let count = 0;
    let excluded = 0;
    const bad = new Set();
    return {
      add(row) {
        count += 1;
        if (row.check !== "OK") bad.add(`${row.uid}|${row.period}`);
        if (!FINAL_LABELS.has(row.status)) { excluded += 1; return; }
        sums[row.type] = round2(sums[row.type] + row.amount);
      },
      result() {
        const items = [
          { label: "Component rows", value: count, type: "integer" },
          { label: "Total Earnings (finalised)", value: sums[T.earning], type: "currency" },
          { label: "Total Employee Deductions (finalised)", value: sums[T.deduction], type: "currency" },
          { label: "Net Pay = Earnings − Deductions (finalised)", value: round2(sums[T.earning] - sums[T.deduction]), type: "currency" },
          { label: "Employer Contributions (finalised, NOT part of net pay)", value: sums[T.employer], type: "currency" },
          { label: "Loss of Pay memo (finalised, already inside earnings)", value: sums[T.memo], type: "currency" },
        ];
        if (excluded) items.push({ label: "Draft / on-hold rows (excluded from totals)", value: excluded, type: "integer" });
        items.push({ label: "Payslips where Net ≠ Earnings − Deductions", value: bad.size, type: "integer" });
        return { count, columnTotals: {}, items };
      },
    };
  },
  async *rows(ctx, f) {
    const wantedTypes = f.types?.length ? new Set(f.types) : null;
    const needle = f.component ? f.component.toLowerCase() : null;
    for await (const docs of payrollDocsByMonth(ctx, f)) {
      const out = [];
      for (const doc of docs) {
        const snap = doc.employeeSnapshot || {};
        const ok = reconciles(doc) ? "OK" : "Mismatch";
        for (const r of unpivot(doc)) {
          if (wantedTypes && !wantedTypes.has(r.type)) continue;
          if (needle && !r.component.toLowerCase().includes(needle)) continue;
          out.push({
            period: fmtPeriod(doc.year, doc.month),
            uid: snap.employeeId || "",
            name: snap.name || "",
            department: snap.department || "",
            component: r.component,
            type: r.type,
            amount: r.amount,
            inNetPay: r.type === T.earning || r.type === T.deduction ? "Yes" : "No",
            status: STATUS_LABEL[doc.status] || doc.status,
            check: ok,
          });
        }
      }
      if (out.length) yield out;
    }
  },
};
