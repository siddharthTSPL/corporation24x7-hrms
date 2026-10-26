const Reimbursement = require("../../Models/reimbursement.model");
const { loadPeople, resolveNames, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { daysBetween } = require("./_phase2");
const { F, batches, round2, periodText } = require("./_shared");

const STATUS_MAP = { submitted: "Pending Approval", approved: "Approved - awaiting payment", rejected: "Rejected", paid: "Paid" };
const STATUS_OPTIONS = Object.values(STATUS_MAP).map((v) => ({ value: v, label: v }));
const RAW = Object.fromEntries(Object.entries(STATUS_MAP).map(([k, v]) => [v, k]));

module.exports = {
  key: "expense-approval-reimbursement-status",
  name: "Expense Approval & Reimbursement Status",
  category: "expense",
  sensitive: false,
  description: "Claims by approval and payment stage, with turnaround days and pending ageing.",
  filters: [
    { key: "from", label: "Submitted From", type: "date", required: true },
    { key: "to", label: "Submitted To", type: "date", required: true },
    F.department,
    F.employees,
    { key: "statuses", label: "Stage", type: "multiselect", options: STATUS_OPTIONS },
  ],
  columns: [
    { key: "claimNumber", header: "Claim ID", type: "text", width: 16 },
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "currency", header: "Currency", type: "text", width: 10 },
    { key: "amount", header: "Claimed Amount", type: "currency", width: 16 },
    { key: "status", header: "Stage", type: "text", width: 28 },
    { key: "submittedOn", header: "Submitted On", type: "date", width: 14 },
    { key: "decidedOn", header: "Decision On", type: "date", width: 14 },
    { key: "paidOn", header: "Paid On", type: "date", width: 14 },
    { key: "daysToDecision", header: "Days to Decision", type: "integer", width: 16 },
    { key: "daysToPay", header: "Days Approval to Payment", type: "integer", width: 22 },
    { key: "pendingAge", header: "Days Pending", type: "integer", width: 13 },
  ],
  notes: [
    "Pending Approval claims show 'Days Pending' (days since submission). Draft and deleted claims are excluded.",
    "Totals are per currency; different currencies are never added together. Payment reference and bank details are not shown.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  extraSummary() {
    const cur = {};
    return {
      add: (r) => { const c = (cur[r.currency] ||= {}); const k = r.status; c[k] = round2((c[k] || 0) + r.amount); },
      items: () => Object.entries(cur).flatMap(([code, c]) => Object.entries(c).map(([st, v]) => ({ label: `${st} (${code})`, value: v, type: "currency" }))),
    };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    const byId = new Map(people.map((p) => [p.id, p]));
    const raw = f.statuses?.length ? f.statuses.map((l) => RAW[l]) : Object.keys(STATUS_MAP);
    const docs = [];
    for (const chunk of batches(people, 2000)) {
      docs.push(...(await Reimbursement.find({
        organisation_id: ctx.orgId, isDeleted: false, submittedBy: { $in: chunk.map((p) => OID(p.id)) },
        submissionDate: { $gte: from, $lte: to }, status: { $in: raw },
      }).select("claimNumber submittedBy currency amountClaimed status submissionDate approvedAt rejectedAt paidAt").lean()));
    }
    docs.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
    const now = new Date();
    const rows = docs.map((d) => {
      const p = byId.get(String(d.submittedBy)) || {};
      const decided = d.status === "rejected" ? d.rejectedAt : d.approvedAt;
      return {
        claimNumber: d.claimNumber, uid: p.uid || "", name: p.name || "", currency: d.currency || "INR", amount: round2(d.amountClaimed),
        status: STATUS_MAP[d.status] || d.status, submittedOn: d.submissionDate, decidedOn: decided || null, paidOn: d.paidAt || null,
        daysToDecision: decided && d.submissionDate ? daysBetween(d.submissionDate, decided) : null,
        daysToPay: d.paidAt && d.approvedAt ? daysBetween(d.approvedAt, d.paidAt) : null,
        pendingAge: d.status === "submitted" && d.submissionDate ? daysBetween(d.submissionDate, now) : null,
      };
    });
    for (const g of batches(rows)) yield g;
  },
};
