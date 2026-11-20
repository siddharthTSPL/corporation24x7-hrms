const Timesheet = require("../../Models/Timesheet.model");
const { loadPeople, resolveNames, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { resolveAnyNames, daysBetween } = require("./_phase2");
const { F, batches, round2, periodText } = require("./_shared");

const BUCKETS = ["Draft", "Pending", "Approved", "Rejected"].map((v) => ({ value: v, label: v }));
const bucketOf = (s) => (!s || s === "draft" ? "Draft" : s === "approved" ? "Approved" : s === "rejected" ? "Rejected" : "Pending");
const readable = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

module.exports = {
  key: "timesheet-approval-status",
  name: "Timesheet Approval Status",
  category: "timesheet",
  planFeature: "timesheet",
  sensitive: false,
  description: "Each weekly timesheet with its approval stage, current approver and how long it has been waiting.",
  filters: [
    { key: "from", label: "Week Start From", type: "date", required: true },
    { key: "to", label: "Week Start To", type: "date", required: true },
    F.department,
    F.employees,
    { key: "statuses", label: "Status", type: "multiselect", options: BUCKETS },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "weekStart", header: "Period Start", type: "date", width: 14 },
    { key: "weekEnd", header: "Period End", type: "date", width: 14 },
    { key: "hours", header: "Total Hours", type: "hours", width: 12, total: true },
    { key: "status", header: "Status", type: "text", width: 26 },
    { key: "submittedOn", header: "Submitted On", type: "date", width: 14 },
    { key: "waitingDays", header: "Days Waiting", type: "integer", width: 13 },
    { key: "currentApprover", header: "Currently With", type: "text", width: 24 },
    { key: "decidedBy", header: "Decided By", type: "text", width: 24 },
    { key: "escalation", header: "Escalation Level", type: "integer", width: 15 },
  ],
  notes: [
    "Timesheets are included by their period start date. 'Days Waiting' counts days since submission for timesheets still pending.",
    "Approval and rejection dates are not stored as separate fields, so only who decided is shown.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  bucketOf,
  extraSummary() {
    const c = {};
    return { add: (r) => { const b = bucketOf(r.rawStatus); c[b] = (c[b] || 0) + 1; }, items: () => Object.entries(c).map(([k, v]) => ({ label: `${k} timesheets`, value: v, type: "integer" })) };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    const byId = new Map(people.map((p) => [p.id, p]));
    const wanted = f.statuses?.length ? new Set(f.statuses) : null;
    const docs = [];
    for (const chunk of batches(people, 2000)) {
      docs.push(...(await Timesheet.find({ organisation_id: ctx.orgId, owner: { $in: chunk.map((p) => OID(p.id)) }, week_start: { $gte: from, $lte: to } })
        .select("owner week_start week_end total_minutes status submitted_at approved_by rejected_by currentHandler currentHandlerModel escalation_level").lean()));
    }
    const handlers = await resolveNames(ctx, docs.map((d) => ({ id: d.currentHandler, model: d.currentHandlerModel })));
    const deciders = await resolveAnyNames(ctx, docs.map((d) => (d.status === "rejected" ? d.rejected_by : d.approved_by)));
    docs.sort((a, b) => new Date(b.week_start) - new Date(a.week_start));
    const now = new Date();
    const rows = [];
    for (const d of docs) {
      if (wanted && !wanted.has(bucketOf(d.status))) continue;
      const p = byId.get(String(d.owner)) || {};
      const pending = bucketOf(d.status) === "Pending";
      const decider = d.status === "rejected" ? d.rejected_by : d.approved_by;
      rows.push({
        uid: p.uid || "", name: p.name || "", department: p.department || "",
        weekStart: d.week_start, weekEnd: d.week_end, hours: round2((d.total_minutes || 0) / 60),
        status: readable(d.status), rawStatus: d.status, submittedOn: d.submitted_at || null,
        waitingDays: pending && d.submitted_at ? daysBetween(d.submitted_at, now) : null,
        currentApprover: pending ? handlers.get(`${d.currentHandlerModel}:${d.currentHandler}`) || "" : "",
        decidedBy: (decider && deciders.get(String(decider))) || "",
        escalation: d.escalation_level || 0,
      });
    }
    for (const g of batches(rows)) yield g;
  },
};
