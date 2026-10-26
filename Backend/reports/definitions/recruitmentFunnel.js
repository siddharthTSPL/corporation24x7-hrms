const mongoose = require("mongoose");
const Candidate = require("../../Models/candidate.model");
const Requisition = require("../../Models/Hiringrequisition.model");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { httpError } = require("../engine/errors");
const { OID } = require("../engine/people");
const { batches, round2, periodText } = require("./_shared");

const SOURCES = ["Portal", "Referral", "LinkedIn", "Walk-in", "Agency", "Other"].map((v) => ({ value: v, label: v }));
const STAGES = [
  ["APPLIED", "Applied"], ["SCREENING", "Screening"], ["SHORTLISTED", "Shortlisted"], ["INTERVIEW", "Interview"],
  ["HR_ROUND", "HR Round"], ["SELECTED", "Selected"], ["OFFER_RELEASED", "Offer Released"], ["OFFER_ACCEPTED", "Offer Accepted"],
  ["OFFER_REJECTED", "Offer Rejected"], ["OFFER_EXPIRED", "Offer Expired"], ["REJECTED", "Rejected"], ["JOINED", "Joined"],
];
const stageCols = STAGES.map(([k, label]) => ({ key: `s_${k}`, header: label, type: "integer", width: 12, total: true }));

/** PURE (unit-tested): fold [{requisition, stage, source, count}] into one row per requisition. */
function foldFunnel(groups, reqById) {
  const per = new Map();
  for (const g of groups) {
    const r = per.get(String(g.requisition)) || { total: 0, stages: {} };
    r.total += g.count;
    r.stages[g.stage] = (r.stages[g.stage] || 0) + g.count;
    per.set(String(g.requisition), r);
  }
  return [...per.entries()].map(([id, r]) => {
    const rq = reqById.get(id) || {};
    return {
      jobTitle: rq.job_title || "(deleted requisition)", department: rq.department || "", openings: rq.openings ?? null, filled: rq.filled_count ?? null,
      candidates: r.total, ...Object.fromEntries(STAGES.map(([k]) => [`s_${k}`, r.stages[k] || 0])),
      joinRate: r.total ? round2(((r.stages.JOINED || 0) / r.total) * 100) : null,
    };
  }).sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
}

module.exports = {
  key: "recruitment-funnel",
  name: "Recruitment Funnel Report",
  category: "recruitment",
  planFeature: "recruitment",
  sensitive: false,
  description: "Candidates per hiring requisition by current stage, with join rate.",
  filters: [
    { key: "from", label: "Applied From", type: "date", required: true },
    { key: "to", label: "Applied To", type: "date", required: true },
    { key: "requisition", label: "Requisition", type: "select", lookup: "requisitions" },
    { key: "sources", label: "Source", type: "multiselect", options: SOURCES },
  ],
  columns: [
    { key: "jobTitle", header: "Requisition", type: "text", width: 28 },
    { key: "department", header: "Department", type: "text", width: 14 },
    { key: "openings", header: "Openings", type: "integer", width: 11 },
    { key: "filled", header: "Filled", type: "integer", width: 9 },
    { key: "candidates", header: "Total Candidates", type: "integer", width: 16, total: true },
    ...stageCols,
    { key: "joinRate", header: "Joined % of Candidates", type: "percent", width: 20 },
  ],
  notes: [
    "Counts are by each candidate's CURRENT stage. Stage history is not stored, so 'reached interview, then rejected' cannot be separated from 'rejected at screening'.",
    "Candidates are included by the date they were added (applied). Personal details are not part of this report.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  foldFunnel,
  extraSummary() {
    return { add() {}, items: () => [] };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const match = { organisation_id: ctx.orgId, createdAt: { $gte: from, $lte: to } };
    if (f.requisition) {
      const ok = mongoose.Types.ObjectId.isValid(f.requisition) && (await Requisition.exists({ _id: f.requisition, organisation_id: ctx.orgId }));
      if (!ok) throw httpError(403, "The selected requisition is outside your organisation.");
      match.requisition_id = OID(f.requisition);
    }
    if (f.sources?.length) match.source = { $in: f.sources };
    const agg = await Candidate.aggregate([
      { $match: match },
      { $group: { _id: { r: "$requisition_id", s: "$current_stage" }, count: { $sum: 1 } } },
    ]);
    const groups = agg.map((a) => ({ requisition: a._id.r, stage: a._id.s, count: a.count }));
    const ids = [...new Set(groups.map((g) => String(g.requisition)))].filter(Boolean);
    const reqs = ids.length ? await Requisition.find({ organisation_id: ctx.orgId, _id: { $in: ids.map(OID) } }).select("job_title department openings filled_count").lean() : [];
    const rows = foldFunnel(groups, new Map(reqs.map((r) => [String(r._id), r])));
    for (const g of batches(rows)) yield g;
  },
};
