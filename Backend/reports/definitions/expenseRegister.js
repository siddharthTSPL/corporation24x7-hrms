const Reimbursement = require("../../Models/reimbursement.model");
const { loadPeople, resolveNames, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { F, batches, round2, periodText } = require("./_shared");

const CATEGORIES = ["Travel", "Food", "Medical", "Internet", "Office Supplies", "Training", "Other"].map((c) => ({ value: c, label: c }));
// Stored "submitted" means awaiting approval; surface it as Pending.
const STATUS_MAP = { draft: "Draft", submitted: "Pending", approved: "Approved", rejected: "Rejected", paid: "Paid" };
const STATUS_OPTIONS = Object.values(STATUS_MAP).map((s) => ({ value: s, label: s }));
const RAW_FROM_LABEL = Object.fromEntries(Object.entries(STATUS_MAP).map(([raw, label]) => [label, raw]));

module.exports = {
  key: "expense-claim-register",
  name: "Expense Claim Register",
  category: "expense",
  sensitive: false,
  description: "Every expense claim with category, amount, approval status and approver.",
  filters: [
    { key: "from", label: "Expense From Date", type: "date", required: true },
    { key: "to", label: "Expense To Date", type: "date", required: true },
    F.department,
    F.employees,
    { key: "categories", label: "Category", type: "multiselect", options: CATEGORIES },
    { key: "statuses", label: "Approval Status", type: "multiselect", options: STATUS_OPTIONS },
  ],
  columns: [
    { key: "claimNumber", header: "Claim ID", type: "text", width: 16 },
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "expenseDate", header: "Expense Date", type: "date", width: 14 },
    { key: "category", header: "Category", type: "text", width: 16 },
    { key: "currency", header: "Currency", type: "text", width: 10 },
    { key: "amount", header: "Claimed Amount", type: "currency", width: 16 },
    { key: "approvedAmount", header: "Approved Amount", type: "currency", width: 16 },
    { key: "reimbursedAmount", header: "Reimbursed Amount", type: "currency", width: 18 },
    { key: "awaitingAmount", header: "Approved, Not Yet Reimbursed", type: "currency", width: 24 },
    { key: "status", header: "Approval Status", type: "text", width: 16 },
    { key: "approver", header: "Approver", type: "text", width: 24 },
    { key: "decisionDate", header: "Decision Date", type: "date", width: 14 },
    { key: "paidOn", header: "Paid On", type: "date", width: 14 },
  ],
  notes: [
    "Draft claims are excluded unless 'Draft' is selected. Deleted claims are never shown.",
    "Only the claimed amount is stored - there is no separate approved amount, so Approved Amount equals the claimed amount for Approved and Paid claims.",
    "Reimbursed Amount counts only claims marked Paid. An Approved claim is not treated as paid; it shows under 'Approved, Not Yet Reimbursed' until payment is recorded.",
    "Totals are shown per currency; amounts in different currencies are never added together.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  extraSummary() {
    const cur = {};
    return {
      add: (r) => {
        const c = (cur[r.currency] ||= { claimed: 0, approved: 0, reimbursed: 0, awaiting: 0, pending: 0, rejected: 0 });
        c.claimed += r.amount;
        c.approved += r.approvedAmount;
        c.reimbursed += r.reimbursedAmount;
        c.awaiting += r.awaitingAmount;
        if (r.status === "Pending") c.pending += r.amount;
        else if (r.status === "Rejected") c.rejected += r.amount;
      },
      items: () =>
        Object.entries(cur).flatMap(([code, c]) => [
          { label: `Total claimed (${code})`, value: round2(c.claimed), type: "currency" },
          { label: `Approved (${code})`, value: round2(c.approved), type: "currency" },
          { label: `Reimbursed (${code})`, value: round2(c.reimbursed), type: "currency" },
          { label: `Approved, not yet reimbursed (${code})`, value: round2(c.awaiting), type: "currency" },
          { label: `Pending (${code})`, value: round2(c.pending), type: "currency" },
          { label: `Rejected (${code})`, value: round2(c.rejected), type: "currency" },
        ]),
    };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    const byId = new Map(people.map((p) => [p.id, p]));
    const rawStatuses = f.statuses?.length ? f.statuses.map((l) => RAW_FROM_LABEL[l]) : ["submitted", "approved", "rejected", "paid"];

    const docs = [];
    for (const chunk of batches(people, 2000)) {
      const q = {
        organisation_id: ctx.orgId,
        isDeleted: false,
        submittedBy: { $in: chunk.map((p) => OID(p.id)) },
        expenseDate: { $gte: from, $lte: to },
        status: { $in: rawStatuses },
      };
      if (f.categories?.length) q.reimbursementType = { $in: f.categories };
      docs.push(
        ...(await Reimbursement.find(q)
          .select("claimNumber submittedBy expenseDate reimbursementType currency amountClaimed status approvedBy approvedByModel approvedAt rejectedBy rejectedByModel rejectedAt paidAt")
          .lean())
      );
    }
    const names = await resolveNames(ctx, docs.flatMap((d) => [
      { id: d.approvedBy, model: d.approvedByModel },
      { id: d.rejectedBy, model: d.rejectedByModel },
    ]));
    docs.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate) || String(a.claimNumber).localeCompare(String(b.claimNumber)));

    const rows = docs.map((d) => {
      const p = byId.get(String(d.submittedBy)) || {};
      const rejected = d.status === "rejected";
      const amount = round2(d.amountClaimed);
      const isPaid = d.status === "paid";
      const isApprovedOnly = d.status === "approved";
      const by = rejected ? d.rejectedBy : d.approvedBy;
      const byModel = rejected ? d.rejectedByModel : d.approvedByModel;
      return {
        claimNumber: d.claimNumber,
        uid: p.uid || "", name: p.name || "", department: p.department || "",
        expenseDate: d.expenseDate,
        category: d.reimbursementType,
        currency: d.currency || "INR",
        amount,
        approvedAmount: isPaid || isApprovedOnly ? amount : 0,
        reimbursedAmount: isPaid ? amount : 0,
        awaitingAmount: isApprovedOnly ? amount : 0,
        status: STATUS_MAP[d.status] || d.status,
        approver: (by && names.get(`${byModel}:${by}`)) || "",
        decisionDate: (rejected ? d.rejectedAt : d.approvedAt) || null,
        paidOn: d.paidAt || null,
      };
    });
    for (const g of batches(rows)) yield g;
  },
};