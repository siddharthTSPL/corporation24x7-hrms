const Reimbursement = require("../../Models/reimbursement.model");
const { loadPeople, OID } = require("../engine/people");
const { TREND_FILTERS, monthSpan, rangeText } = require("./_trends");
const { batches, round2, F } = require("./_shared");

const CATS = ["Travel", "Food", "Medical", "Internet", "Office Supplies", "Training", "Other"];
const key = (c) => `c_${c.replace(/\s/g, "")}`;
const STATUS = [{ value: "submitted", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "paid", label: "Paid" }, { value: "rejected", label: "Rejected" }];

module.exports = {
  key: "expense-category-trends",
  name: "Expense Category Trends",
  category: "expense",
  sensitive: false,
  description: "Month-wise claimed expense by category (single currency).",
  filters: [
    ...TREND_FILTERS.filter((f) => f.key !== "department"),
    { key: "currency", label: "Currency", type: "text", default: "INR" },
    F.department,
    { key: "statuses", label: "Claim Status", type: "multiselect", options: STATUS },
  ],
  columns: [
    { key: "month", header: "Month", type: "text", width: 14 },
    ...CATS.map((c) => ({ key: key(c), header: c, type: "currency", width: 14, total: true })),
    { key: "total", header: "Total", type: "currency", width: 16, total: true },
    { key: "claims", header: "Claims", type: "integer", width: 10, total: true },
  ],
  chart: { type: "bar", x: "month", stacked: true, yType: "currency", bars: CATS.map((c) => ({ key: key(c), label: c })) },
  notes: ["Default statuses: Pending, Approved and Paid (rejected claims excluded unless selected). One currency at a time so amounts are never mixed. Months are by expense date (IST)."],
  period: rangeText,
  validate(f) { monthSpan(f); },
  async *rows(ctx, f) {
    const months = monthSpan(f);
    const people = await loadPeople(ctx, { department: f.department, includeSuperAdmin: false });
    const statuses = f.statuses?.length ? f.statuses : ["submitted", "approved", "paid"];
    const per = new Map(months.map((m) => [m.key, { claims: 0, cats: {} }]));
    for (const chunk of batches(people, 2000)) {
      const agg = await Reimbursement.aggregate([
        { $match: { organisation_id: ctx.orgId, isDeleted: false, currency: f.currency || "INR", status: { $in: statuses },
          submittedBy: { $in: chunk.map((p) => OID(p.id)) }, expenseDate: { $gte: months[0].start, $lte: months[months.length - 1].end } } },
        { $group: { _id: { m: { $dateToString: { format: "%Y-%m", date: "$expenseDate", timezone: "Asia/Kolkata" } }, c: "$reimbursementType" }, amount: { $sum: "$amountClaimed" }, n: { $sum: 1 } } },
      ]);
      for (const a of agg) {
        const e = per.get(a._id.m);
        if (!e) continue;
        e.cats[a._id.c] = (e.cats[a._id.c] || 0) + a.amount; e.claims += a.n;
      }
    }
    yield months.map((m) => {
      const e = per.get(m.key);
      const row = { month: m.label, claims: e.claims, total: round2(Object.values(e.cats).reduce((a, b) => a + b, 0)) };
      for (const c of CATS) row[key(c)] = round2(e.cats[c] || 0);
      return row;
    });
  },
};
