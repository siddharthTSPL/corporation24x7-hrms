// Shared by the two payroll reports. They NEVER re-run the payroll engine:
// they only read the stored Payroll documents (the snapshot written when the
// payslip was generated), so a report can never disagree with the payslip.
const Payroll = require("../../Models/payroll.model");
const { parseMonthStrict, monthsBetween, getISTDateParts } = require("../engine/dates");
const { getTeamIds, assertEmployeesInScope, OID } = require("../engine/people");
const { F } = require("./_shared");

// Payroll status has no "draft/final" flag: generated -> approved -> paid, plus on_hold.
// "Finalised" = approved + paid. A force-regenerate sends an approved record back to
// "generated", so it correctly drops out of finalised totals until approved again.
const FINAL_STATUSES = ["approved", "paid"];
const ALL_STATUSES = ["approved", "paid", "generated", "on_hold"];
const STATUS_LABEL = { generated: "Generated (Draft)", approved: "Approved", paid: "Paid", on_hold: "On Hold" };
const FINAL_LABELS = new Set(FINAL_STATUSES.map((s) => STATUS_LABEL[s]));

const curMonth = () => { const p = getISTDateParts(new Date()); return `${p.year}-${String(p.month).padStart(2, "0")}`; };

const PERIOD_FILTERS = [
  { key: "fromMonth", label: "Payroll Period From", type: "month", required: true, default: curMonth },
  { key: "toMonth", label: "Payroll Period To", type: "month" },
  F.department,
  F.designation,
  F.employees,
  { key: "includeNonFinal", label: "Include non-finalised payroll (draft / on hold)", type: "boolean", default: false },
];

const periodOf = (f) => {
  const from = parseMonthStrict(f.fromMonth);
  const to = f.toMonth ? parseMonthStrict(f.toMonth) : from;
  return { from, to, months: monthsBetween(from, to) };
};

const SELECT = [
  "employee employeeModel month year status netSalary",
  "employeeSnapshot.name employeeSnapshot.employeeId employeeSnapshot.department employeeSnapshot.designation",
  "attendance earnings deductions employerContribution",
  "breakup.basic breakup.hra breakup.allowances breakup.monthlyGross",
  "breakup.deductionComponents breakup.benefitComponents breakup.reimbursementComponents",
].join(" "); // allow-list: bank name / account number / policy snapshot are never loaded

/**
 * Yields arrays of stored payroll docs, one calendar month at a time (so each
 * batch stays small and needs no unindexed server-side sort).
 */
async function* payrollDocsByMonth(ctx, f, opts = {}) {
  const { months } = periodOf(f);
  let ids = null;
  if (ctx.scope === "team") ids = [...(await getTeamIds(ctx))];
  if (f.employees?.length) {
    await assertEmployeesInScope(ctx, f.employees);
    ids = ids ? f.employees.filter((i) => ids.includes(i)) : f.employees;
  }
  const statuses = opts.statuses || (f.includeNonFinal ? ALL_STATUSES : FINAL_STATUSES);
  for (const { year, month } of months) {
    const q = { organisation_id: ctx.orgId, year, month, status: { $in: statuses } }; // tenant filter first, always
    if (f.department) q["employeeSnapshot.department"] = f.department;
    if (f.designation) q["employeeSnapshot.designation"] = f.designation;
    if (ids) q.employee = { $in: ids.map(OID) };
    const docs = await Payroll.find(q).select(opts.extraSelect ? `${SELECT} ${opts.extraSelect}` : SELECT).lean();
    docs.sort((a, b) => (a.employeeSnapshot?.name || "").localeCompare(b.employeeSnapshot?.name || ""));
    if (docs.length) yield docs;
  }
}

module.exports = { ALL_STATUSES, FINAL_STATUSES, FINAL_LABELS, STATUS_LABEL, PERIOD_FILTERS, periodOf, payrollDocsByMonth, curMonth };
