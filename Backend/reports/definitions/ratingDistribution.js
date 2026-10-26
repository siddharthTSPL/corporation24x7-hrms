const Review = require("../../Models/review.model");
const { loadPeople, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { F, batches, round2, periodText } = require("./_shared");

const RATINGS = ["Excellent", "Very Good", "Good", "Average", "Poor"];
const PERIODS = ["monthly", "quarterly", "yearly"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

module.exports = {
  key: "performance-rating-distribution",
  name: "Performance Rating Distribution",
  category: "performance",
  planFeature: "review",
  sensitive: true,
  description: "How overall ratings are spread across departments.",
  filters: [
    { key: "from", label: "Review Submitted From", type: "date", required: true },
    { key: "to", label: "Review Submitted To", type: "date", required: true },
    F.department,
    { key: "reviewPeriod", label: "Review Period", type: "select", options: PERIODS },
    { key: "approvedOnly", label: "Only HR-approved reviews", type: "boolean", default: false },
  ],
  columns: [
    { key: "department", header: "Department", type: "text", width: 22 },
    ...RATINGS.map((r) => ({ key: `r_${r.replace(" ", "")}`, header: r, type: "integer", width: 12, total: true })),
    { key: "total", header: "Total Reviews", type: "integer", width: 15, total: true },
    { key: "avgScore", header: "Average Score (1-5)", type: "number", width: 18 },
  ],
  chart: { type: "bar", x: "department", stacked: true, bars: RATINGS.map((r) => ({ key: `r_${r.replace(" ", "")}`, label: r })) },
  notes: ["Aggregated only: no individual ratings are shown. Department is the reviewee's department recorded on the review."],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, includeSuperAdmin: false });
    const per = new Map();
    for (const chunk of batches(people, 2000)) {
      const match = { organisation_id: ctx.orgId, reviewee: { $in: chunk.map((p) => OID(p.id)) }, reviewerSubmittedAt: { $gte: from, $lte: to } };
      if (f.reviewPeriod) match.reviewPeriod = f.reviewPeriod;
      if (f.approvedOnly) match.status = "hr_approved";
      const agg = await Review.aggregate([
        { $match: match },
        { $group: { _id: { d: "$revieweeDepartment", r: "$overallRating" }, n: { $sum: 1 }, score: { $sum: "$overallScore" } } },
      ]);
      for (const a of agg) {
        const d = a._id.d || "(Unassigned)";
        const e = per.get(d) || { counts: {}, score: 0, n: 0 };
        e.counts[a._id.r] = (e.counts[a._id.r] || 0) + a.n; e.score += a.score; e.n += a.n;
        per.set(d, e);
      }
    }
    yield [...per.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, e]) => ({
      department: d, ...Object.fromEntries(RATINGS.map((r) => [`r_${r.replace(" ", "")}`, e.counts[r] || 0])),
      total: e.n, avgScore: e.n ? round2(e.score / e.n) : null,
    }));
  },
};
