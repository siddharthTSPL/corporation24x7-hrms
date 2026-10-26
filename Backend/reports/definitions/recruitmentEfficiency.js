const Candidate = require("../../Models/candidate.model");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { round2, periodText } = require("./_shared");

const SOURCES = ["Portal", "Referral", "LinkedIn", "Walk-in", "Agency", "Other"];
const OFFERED = ["OFFER_RELEASED", "OFFER_ACCEPTED", "OFFER_REJECTED", "OFFER_EXPIRED", "JOINED"];
const ACCEPTED = ["OFFER_ACCEPTED", "JOINED"];
const pct = (a, b) => (b ? round2((a / b) * 100) : null);

/** PURE (unit-tested): one source's stage counts -> efficiency row. */
function efficiencyRow(source, stages, avgDays) {
  const total = Object.values(stages).reduce((a, b) => a + b, 0);
  const sum = (keys) => keys.reduce((s, k) => s + (stages[k] || 0), 0);
  const offered = sum(OFFERED);
  const accepted = sum(ACCEPTED);
  const joined = stages.JOINED || 0;
  return {
    source, candidates: total, offered, accepted, joined, rejected: sum(["REJECTED"]),
    offerRate: pct(offered, total), acceptRate: pct(accepted, offered), joinRate: pct(joined, total),
    avgDaysToJoin: avgDays == null ? null : round2(avgDays),
  };
}

module.exports = {
  key: "recruitment-source-efficiency",
  name: "Recruitment Source & Hiring Efficiency",
  category: "recruitment",
  planFeature: "recruitment",
  sensitive: false,
  description: "Which sources produce offers and joiners, and how long hiring takes.",
  filters: [
    { key: "from", label: "Applied From", type: "date", required: true },
    { key: "to", label: "Applied To", type: "date", required: true },
  ],
  columns: [
    { key: "source", header: "Source", type: "text", width: 16 },
    { key: "candidates", header: "Candidates", type: "integer", width: 13, total: true },
    { key: "offered", header: "Reached Offer", type: "integer", width: 15, total: true },
    { key: "accepted", header: "Offer Accepted / Joined", type: "integer", width: 22, total: true },
    { key: "joined", header: "Joined", type: "integer", width: 10, total: true },
    { key: "rejected", header: "Rejected", type: "integer", width: 11, total: true },
    { key: "offerRate", header: "Offer Rate %", type: "percent", width: 14 },
    { key: "acceptRate", header: "Acceptance Rate %", type: "percent", width: 18 },
    { key: "joinRate", header: "Join Rate %", type: "percent", width: 13 },
    { key: "avgDaysToJoin", header: "Avg Days Applied to Joined", type: "number", width: 24 },
  ],
  chart: { type: "bar", x: "source", bars: [{ key: "candidates", label: "Candidates" }, { key: "offered", label: "Reached offer" }, { key: "joined", label: "Joined" }] },
  notes: [
    "Based on each candidate's CURRENT stage (no stage history is stored). Rejected candidates cannot be traced back to the stage they were rejected at.",
    "Avg days = joining date minus the date the candidate was added, for candidates who joined.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  efficiencyRow,
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const agg = await Candidate.aggregate([
      { $match: { organisation_id: ctx.orgId, createdAt: { $gte: from, $lte: to } } },
      { $group: {
        _id: { s: "$source", st: "$current_stage" }, n: { $sum: 1 },
        days: { $avg: { $cond: [{ $and: [{ $eq: ["$current_stage", "JOINED"] }, { $ne: ["$joining_date", null] }] }, { $divide: [{ $subtract: ["$joining_date", "$createdAt"] }, 86400000] }, null] } },
      } },
    ]);
    const per = new Map();
    for (const a of agg) {
      const s = a._id.s || "Other";
      const e = per.get(s) || { stages: {}, days: null };
      e.stages[a._id.st] = (e.stages[a._id.st] || 0) + a.n;
      if (a._id.st === "JOINED" && a.days != null) e.days = a.days;
      per.set(s, e);
    }
    yield [...per.entries()].sort((a, b) => SOURCES.indexOf(a[0]) - SOURCES.indexOf(b[0])).map(([s, e]) => efficiencyRow(s, e.stages, e.days));
  },
};
