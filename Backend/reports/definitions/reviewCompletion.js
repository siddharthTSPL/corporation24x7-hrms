const Review = require("../../Models/review.model");
const { loadPeople, resolveNames, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { F, batches, round2, periodText } = require("./_shared");

const STATUS = {
  submitted: "Submitted - awaiting employee", reviewee_accepted: "Accepted by employee - awaiting HR",
  reviewee_disputed: "Disputed by employee", hr_approved: "Completed (HR approved)", hr_rejected: "Rejected by HR",
};
const STATUS_OPTIONS = Object.entries(STATUS).map(([value, label]) => ({ value, label }));
const PERIODS = ["monthly", "quarterly", "yearly"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

module.exports = {
  key: "performance-review-completion",
  name: "Performance Review Completion Report",
  category: "performance",
  planFeature: "review",
  sensitive: true, // ratings are confidential: run, export and denied attempts are audited
  description: "Every submitted performance review with its approval stage and overall rating.",
  filters: [
    { key: "from", label: "Review Submitted From", type: "date", required: true },
    { key: "to", label: "Review Submitted To", type: "date", required: true },
    F.department,
    F.employees,
    { key: "reviewPeriod", label: "Review Period", type: "select", options: PERIODS },
    { key: "statuses", label: "Review Status", type: "multiselect", options: STATUS_OPTIONS },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Reviewee", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "reviewer", header: "Reviewer", type: "text", width: 24 },
    { key: "reviewPeriod", header: "Review Period", type: "text", width: 14 },
    { key: "monthYear", header: "Review Month", type: "text", width: 14 },
    { key: "submittedOn", header: "Submitted On", type: "date", width: 14 },
    { key: "status", header: "Review Status", type: "text", width: 34 },
    { key: "overallScore", header: "Overall Score (1-5)", type: "number", width: 18 },
    { key: "overallRating", header: "Overall Rating", type: "text", width: 15 },
    { key: "hrDecisionOn", header: "HR Decision On", type: "date", width: 15 },
  ],
  notes: [
    "Only reviews that exist are listed. The system has no review calendar or assignment list, so reviews that were never started cannot be reported as 'pending'.",
    "Comments, goals and development plans are intentionally excluded; only status, score and rating are shown.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  extraSummary() {
    const c = {}; let n = 0; let sum = 0;
    return {
      add: (r) => { c[r.status] = (c[r.status] || 0) + 1; if (r.overallScore) { n += 1; sum += r.overallScore; } },
      items: () => {
        const total = Object.values(c).reduce((a, b) => a + b, 0);
        return [
          ...Object.entries(c).map(([k, v]) => ({ label: k, value: v, type: "integer" })),
          ...(total ? [{ label: "Completion rate (HR approved)", value: round2(((c[STATUS.hr_approved] || 0) / total) * 100), type: "percent" }] : []),
          ...(n ? [{ label: "Average overall score", value: round2(sum / n), type: "number" }] : []),
        ];
      },
    };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    const byId = new Map(people.map((p) => [p.id, p]));
    const docs = [];
    for (const chunk of batches(people, 2000)) {
      const q = { organisation_id: ctx.orgId, reviewee: { $in: chunk.map((p) => OID(p.id)) }, reviewerSubmittedAt: { $gte: from, $lte: to } };
      if (f.reviewPeriod) q.reviewPeriod = f.reviewPeriod;
      if (f.statuses?.length) q.status = { $in: f.statuses };
      docs.push(...(await Review.find(q)
        .select("reviewee reviewer reviewerRoleModel reviewPeriod monthYear reviewerSubmittedAt status overallScore overallRating hrAcknowledgement.respondedAt").lean()));
    }
    const names = await resolveNames(ctx, docs.map((d) => ({ id: d.reviewer, model: d.reviewerRoleModel })));
    docs.sort((a, b) => new Date(b.reviewerSubmittedAt) - new Date(a.reviewerSubmittedAt));
    const rows = docs.map((d) => {
      const p = byId.get(String(d.reviewee)) || {};
      return {
        uid: p.uid || "", name: p.name || "", department: p.department || "",
        reviewer: names.get(`${d.reviewerRoleModel}:${d.reviewer}`) || "",
        reviewPeriod: d.reviewPeriod, monthYear: d.monthYear, submittedOn: d.reviewerSubmittedAt,
        status: STATUS[d.status] || d.status, overallScore: d.overallScore, overallRating: d.overallRating,
        hrDecisionOn: d.hrAcknowledgement?.respondedAt || null,
      };
    });
    for (const g of batches(rows)) yield g;
  },
};
