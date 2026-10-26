const Leave = require("../../Models/leave.model");
const ManagerLeave = require("../../Models/maleave.model");
const AdminLeave = require("../../Models/adleave.model");
const { loadPeople, resolveNames, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { F, batches, periodText } = require("./_shared");

const LEAVE_TYPES = [
  { value: "el", label: "Earned Leave" }, { value: "sl", label: "Sick Leave" },
  { value: "ml", label: "Maternity Leave" }, { value: "pl", label: "Paternity Leave" },
  { value: "half_day_el", label: "Half Day EL" }, { value: "half_day_sl", label: "Half Day SL" },
  { value: "lwp", label: "Leave Without Pay" }, { value: "comp_off", label: "Comp Off" },
];
const TYPE_LABEL = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t.label]));
const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Forwarded"].map((s) => ({ value: s, label: s }));

// Leave lives in three collections (employees / managers / admins) with
// different owner fields. One adapter list; everything else is shared.
const SOURCES = [
  { Model: Leave, field: "employee", ownerModel: "User" },
  { Model: ManagerLeave, field: "manager", ownerModel: "Manager" },
  { Model: AdminLeave, field: "admin", ownerModel: "Admin" },
];

/** PURE (unit-tested): 11+ raw workflow statuses -> Pending / Approved / Rejected / Forwarded. */
function normalizeStatus(raw) {
  const s = String(raw || "");
  if (s.startsWith("approved")) return "Approved";
  if (s.startsWith("rejected")) return "Rejected";
  if (s.startsWith("forwarded")) return "Forwarded";
  if (s.startsWith("pending")) return "Pending";
  return s || "Unknown";
}

module.exports = {
  key: "leave-transactions",
  name: "Leave Transactions Report",
  category: "leave",
  sensitive: false,
  description: "Every leave request with dates, days, approval status and approver.",
  filters: [
    { key: "from", label: "From Date", type: "date", required: true },
    { key: "to", label: "To Date", type: "date", required: true },
    { key: "leaveTypes", label: "Leave Type", type: "multiselect", options: LEAVE_TYPES },
    F.department,
    F.employees,
    { key: "statuses", label: "Status", type: "multiselect", options: STATUS_OPTIONS },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "leaveType", header: "Leave Type", type: "text", width: 20 },
    { key: "startDate", header: "From", type: "date", width: 14 },
    { key: "endDate", header: "To", type: "date", width: 14 },
    { key: "days", header: "Requested Days", type: "number", width: 15, total: true },
    { key: "lwpDays", header: "Of which Unpaid (LWP)", type: "number", width: 20, total: true },
    { key: "status", header: "Approval Status", type: "text", width: 16 },
    { key: "approver", header: "Approver", type: "text", width: 24 },
    { key: "appliedOn", header: "Applied On", type: "date", width: 14 },
  ],
  notes: [
    "Leaves overlapping the selected dates are included (a leave that starts before 'From' but ends inside the range is shown).",
    "Rejected requests are automatically deleted from the database 24 hours after rejection, so rejected history older than a day is not available. Cancellation is not tracked as a separate status.",
    "Approver = the person who approved or rejected; blank while the request is still pending.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  normalizeStatus,
  _sources: SOURCES,
  _types: LEAVE_TYPES,
  extraSummary() {
    const c = {};
    return {
      add: (r) => { c[r.status] = (c[r.status] || 0) + 1; },
      items: () => Object.entries(c).map(([k, v]) => ({ label: `${k} requests`, value: v, type: "integer" })),
    };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    const byId = new Map(people.map((p) => [p.id, p]));
    const wantedStatus = f.statuses?.length ? new Set(f.statuses) : null;

    const collected = [];
    for (const src of SOURCES) {
      const ids = people.filter((p) => p.model === src.ownerModel).map((p) => OID(p.id));
      if (!ids.length) continue;
      const q = {
        organisation_id: ctx.orgId,
        [src.field]: { $in: ids },
        startDate: { $lte: to },
        endDate: { $gte: from },
      };
      if (f.leaveTypes?.length) q.leaveType = { $in: f.leaveTypes };
      const docs = await src.Model.find(q)
        .select(`${src.field} leaveType startDate endDate days lwpDays status approvedBy approvedByModel rejectedBy rejectedByModel createdAt`)
        .lean();
      for (const d of docs) collected.push({ d, owner: String(d[src.field]) });
    }

    const names = await resolveNames(ctx, collected.flatMap(({ d }) => [
      { id: d.approvedBy, model: d.approvedByModel },
      { id: d.rejectedBy, model: d.rejectedByModel },
    ]));

    const rows = [];
    for (const { d, owner } of collected) {
      const p = byId.get(owner);
      if (!p) continue;
      const status = normalizeStatus(d.status);
      if (wantedStatus && !wantedStatus.has(status)) continue;
      const decider = status === "Rejected" ? [d.rejectedBy, d.rejectedByModel] : [d.approvedBy, d.approvedByModel];
      rows.push({
        uid: p.uid, name: p.name, department: p.department,
        leaveType: TYPE_LABEL[d.leaveType] || d.leaveType,
        startDate: d.startDate, endDate: d.endDate,
        days: d.days, lwpDays: d.lwpDays || 0,
        status,
        approver: (decider[0] && names.get(`${decider[1]}:${decider[0]}`)) || "",
        appliedOn: d.createdAt || null,
      });
    }
    // Deterministic order so the screen and the Excel export always agree.
    rows.sort((a, b) => new Date(b.startDate) - new Date(a.startDate) || a.name.localeCompare(b.name));
    for (const g of batches(rows)) yield g;
  },
};
