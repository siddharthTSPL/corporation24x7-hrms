const Payroll = require("../../Models/payroll.model");
const { getTeamIds, OID } = require("../engine/people");
const { TREND_FILTERS, monthSpan, rangeText } = require("./_trends");
const { FINAL_STATUSES } = require("./_payroll");
const { round2 } = require("./_shared");

const money = (key, header, extra = {}) => ({ key, header, type: "currency", width: 17, total: true, ...extra });

module.exports = {
  key: "payroll-cost-trends",
  name: "Monthly Payroll Cost Trends",
  category: "payroll",
  sensitive: true,
  description: "Month-wise finalised payroll cost: earnings, deductions, net pay and employer contributions.",
  filters: TREND_FILTERS,
  columns: [
    { key: "month", header: "Month", type: "text", width: 14 },
    { key: "employees", header: "Employees Paid", type: "integer", width: 15 },
    money("grossEarned", "Gross Earned"),
    money("totalEarnings", "Total Earnings"),
    money("totalDeductions", "Employee Deductions"),
    money("netPay", "Net Pay"),
    money("employerContribution", "Employer Contributions (PF/ESI/LWF)"),
    money("totalCost", "Total Employer Cost"),
    { key: "avgNet", header: "Average Net / Employee", type: "currency", width: 20 },
  ],
  chart: { type: "bar", x: "month", bars: [{ key: "netPay", label: "Net pay" }, { key: "totalDeductions", label: "Deductions" }, { key: "employerContribution", label: "Employer contribution" }], stacked: true, yType: "currency" },
  notes: [
    "Finalised payroll only (Approved + Paid), read from stored results. Only aggregates are shown, never individual salaries.",
    "Total Employer Cost = total earnings + employer PF/ESI/LWF. Gratuity and statutory bonus are estimates and are NOT included.",
  ],
  period: rangeText,
  validate(f) { monthSpan(f); },
  async *rows(ctx, f) {
    const months = monthSpan(f);
    const match = { organisation_id: ctx.orgId, status: { $in: FINAL_STATUSES }, $or: months.map(({ year, month }) => ({ year, month })) };
    if (f.department) match["employeeSnapshot.department"] = f.department;
    if (ctx.scope === "team") match.employee = { $in: [...(await getTeamIds(ctx))].map(OID) };
    const agg = await Payroll.aggregate([
      { $match: match },
      { $group: {
        _id: { y: "$year", m: "$month" }, employees: { $sum: 1 },
        grossEarned: { $sum: "$earnings.gross" }, totalEarnings: { $sum: "$earnings.totalEarnings" },
        totalDeductions: { $sum: "$deductions.totalDeductions" }, netPay: { $sum: "$netSalary" },
        employer: { $sum: { $add: [{ $ifNull: ["$employerContribution.pf", 0] }, { $ifNull: ["$employerContribution.esi", 0] }, { $ifNull: ["$employerContribution.lwf", 0] }] } },
      } },
    ]);
    const by = new Map(agg.map((a) => [`${a._id.y}-${String(a._id.m).padStart(2, "0")}`, a]));
    yield months.map((m) => {
      const a = by.get(m.key);
      if (!a) return { month: m.label, employees: 0, grossEarned: 0, totalEarnings: 0, totalDeductions: 0, netPay: 0, employerContribution: 0, totalCost: 0, avgNet: null };
      return {
        month: m.label, employees: a.employees, grossEarned: round2(a.grossEarned), totalEarnings: round2(a.totalEarnings),
        totalDeductions: round2(a.totalDeductions), netPay: round2(a.netPay), employerContribution: round2(a.employer),
        totalCost: round2(a.totalEarnings + a.employer), avgNet: a.employees ? round2(a.netPay / a.employees) : null,
      };
    });
  },
};
