const Candidate = require("../../Models/candidate.model");
const OfferLetter = require("../../Models/offerletter.model");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { OID } = require("../engine/people");
const { batches, periodText } = require("./_shared");

const STATUSES = ["DRAFT", "REVIEW_DONE", "PENDING_APPROVAL", "FINAL", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
const LABEL = { DRAFT: "Draft", REVIEW_DONE: "Review Done", PENDING_APPROVAL: "Pending Approval", FINAL: "Final", SENT: "Sent", ACCEPTED: "Accepted", REJECTED: "Rejected", EXPIRED: "Expired" };

module.exports = {
  key: "offer-joining-report",
  name: "Offer & Joining Report",
  category: "recruitment",
  planFeature: "recruitment",
  sensitive: true,
  description: "Offer letters with status, candidate response and whether the candidate joined.",
  filters: [
    { key: "from", label: "Offer Date From", type: "date", required: true },
    { key: "to", label: "Offer Date To", type: "date", required: true },
    { key: "statuses", label: "Offer Status", type: "multiselect", options: STATUSES.map((v) => ({ value: v, label: LABEL[v] })) },
  ],
  columns: [
    { key: "refNo", header: "Offer Ref", type: "text", width: 18 },
    { key: "candidate", header: "Candidate", type: "text", width: 26 },
    { key: "designation", header: "Designation", type: "text", width: 22 },
    { key: "department", header: "Department", type: "text", width: 14 },
    { key: "letterDate", header: "Offer Date", type: "date", width: 14 },
    { key: "sentOn", header: "Sent On", type: "date", width: 14 },
    { key: "status", header: "Offer Status", type: "text", width: 18 },
    { key: "respondedOn", header: "Responded On", type: "date", width: 14 },
    { key: "validTill", header: "Valid Till", type: "date", width: 14 },
    { key: "plannedJoining", header: "Planned Joining", type: "date", width: 15 },
    { key: "candidateStage", header: "Candidate Stage Now", type: "text", width: 20 },
    { key: "joined", header: "Joined", type: "text", width: 9 },
  ],
  notes: [
    "Salary / CTC details are intentionally excluded.",
    "'Joined' = the candidate's recruitment stage is JOINED. The acceptance rate in the summary is Accepted / (Accepted + Rejected + Expired).",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  extraSummary() {
    const c = {};
    return {
      add: (r) => { c[r.status] = (c[r.status] || 0) + 1; c.joined = (c.joined || 0) + (r.joined === "Yes" ? 1 : 0); },
      items: () => {
        const decided = (c.Accepted || 0) + (c.Rejected || 0) + (c.Expired || 0);
        return [
          ...Object.entries(c).filter(([k]) => k !== "joined").map(([k, v]) => ({ label: k, value: v, type: "integer" })),
          { label: "Joined", value: c.joined || 0, type: "integer" },
          ...(decided ? [{ label: "Acceptance rate", value: Math.round(((c.Accepted || 0) / decided) * 10000) / 100, type: "percent" }] : []),
        ];
      },
    };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const q = { organisation_id: ctx.orgId, letter_date: { $gte: from, $lte: to } };
    if (f.statuses?.length) q.status = { $in: f.statuses };
    // token and CTC are never selected
    const offers = await OfferLetter.find(q)
      .select("ref_no candidate_id designation department letter_date sent_at status response valid_till joining_date")
      .sort({ letter_date: -1 }).lean();
    const cands = new Map();
    for (const chunk of batches(offers, 1000)) {
      const docs = await Candidate.find({ organisation_id: ctx.orgId, _id: { $in: chunk.map((o) => OID(o.candidate_id)) } }).select("full_name current_stage").lean();
      for (const d of docs) cands.set(String(d._id), d);
    }
    const rows = offers.map((o) => {
      const c = cands.get(String(o.candidate_id)) || {};
      return {
        refNo: o.ref_no, candidate: c.full_name || "", designation: o.designation, department: o.department,
        letterDate: o.letter_date, sentOn: o.sent_at || null, status: LABEL[o.status] || o.status,
        respondedOn: o.response?.at || null, validTill: o.valid_till, plannedJoining: o.joining_date || null,
        candidateStage: c.current_stage || "", joined: c.current_stage === "JOINED" ? "Yes" : "No",
      };
    });
    for (const g of batches(rows)) yield g;
  },
};
