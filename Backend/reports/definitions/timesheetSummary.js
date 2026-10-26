const mongoose = require("mongoose");
const TimeLog = require("../../Models/Timelog.model");
const Timesheet = require("../../Models/Timesheet.model");
const TSProject = require("../../Models/tsproject.model");
const { loadPeople, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { httpError } = require("../engine/errors");
const { F, batches, round2, periodText } = require("./_shared");

const STATUS_OPTIONS = ["Draft", "Pending", "Approved", "Rejected"].map((s) => ({ value: s, label: s }));

/** PURE: raw timesheet workflow status -> report bucket. A log not on any timesheet is a draft. */
function bucketOf(status) {
  if (!status || status === "draft") return "Draft";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending"; // pending_manager / pending_reporting_manager / pending_coadmin / pending_admin / pending_superadmin
}

/**
 * PURE (unit-tested). Fold grouped log minutes into one row per person.
 *   groups: [{ emp, ts (timesheet id or null), minutes }]   - already summed per (person, timesheet)
 *   statusById: Map(timesheetId -> raw status)
 *   wanted: Set of buckets to keep, or null for all
 * Why nothing is double counted: a timesheet is ONE document per person per week
 * (unique index), logs belong to exactly one timesheet, and an edited log's
 * duration is overwritten in place. A re-submitted timesheet therefore moves
 * bucket (Rejected -> Pending -> Approved) instead of being added twice.
 * Submitted = Pending + Approved + Rejected.
 */
function foldHours(groups, statusById, wanted) {
  const per = new Map();
  for (const g of groups) {
    const bucket = bucketOf(g.ts ? statusById.get(String(g.ts)) : null);
    if (wanted && !wanted.has(bucket)) continue;
    const key = String(g.emp);
    const row = per.get(key) || { Draft: 0, Pending: 0, Approved: 0, Rejected: 0, sheets: new Set() };
    row[bucket] += g.minutes || 0;
    if (g.ts && bucket !== "Draft") row.sheets.add(String(g.ts));
    per.set(key, row);
  }
  return per;
}
const hrs = (m) => round2((m || 0) / 60);

module.exports = {
  key: "timesheet-summary",
  name: "Timesheet Summary",
  category: "timesheet",
  planFeature: "timesheet", // Basic-plan organisations cannot read timesheet data through reports either
  sensitive: false,
  description: "Employee-wise submitted, approved and rejected hours for a period.",
  filters: [
    { key: "from", label: "From Date", type: "date", required: true },
    { key: "to", label: "To Date", type: "date", required: true },
    F.department,
    F.employees,
    { key: "project", label: "Project", type: "select", lookup: "projects" },
    { key: "statuses", label: "Timesheet Status", type: "multiselect", options: STATUS_OPTIONS },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "period", header: "Reporting Period", type: "text", width: 26 },
    { key: "submittedHours", header: "Submitted Hours", type: "hours", width: 16, total: true },
    { key: "approvedHours", header: "Approved Hours", type: "hours", width: 15, total: true },
    { key: "pendingHours", header: "Pending Approval Hours", type: "hours", width: 21, total: true },
    { key: "rejectedHours", header: "Rejected Hours", type: "hours", width: 15, total: true },
    { key: "draftHours", header: "Not Submitted (Draft) Hours", type: "hours", width: 24, total: true },
    { key: "timesheets", header: "Timesheets Submitted", type: "integer", width: 19, total: true },
  ],
  notes: [
    "Hours are summed from time logs dated inside the period. Submitted = Pending + Approved + Rejected; draft (unsubmitted) hours are shown separately and never count as submitted.",
    "Each employee has one timesheet per week, so a re-submitted or edited timesheet is counted once, under its CURRENT status.",
    "Rejected hours are those on timesheets that are rejected right now - rejection history is not stored, so a timesheet rejected and later re-submitted shows as Pending/Approved.",
    "Employees with no logged hours in the period are not listed.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  bucketOf,
  foldHours,
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    if (f.project) {
      const okId = mongoose.Types.ObjectId.isValid(f.project) && String(new mongoose.Types.ObjectId(f.project)) === f.project;
      const exists = okId && (await TSProject.exists({ _id: f.project, organisation_id: ctx.orgId }));
      if (!exists) throw httpError(403, "The selected project is outside your organisation.");
    }
    // Super Admin cannot own timesheets (owner_model is Admin | Manager | User).
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    const byId = new Map(people.map((p) => [p.id, p]));
    const wanted = f.statuses?.length ? new Set(f.statuses) : null;
    const periodLabel = `${fmtDate(from)} to ${fmtDate(to)}`;

    const groups = [];
    for (const chunk of batches(people, 2000)) {
      const match = {
        organisation_id: ctx.orgId,
        log_date: { $gte: from, $lte: to },
        logged_by: { $in: chunk.map((p) => OID(p.id)) },
      };
      if (f.project) match.project = OID(f.project);
      const agg = await TimeLog.aggregate([
        { $match: match },
        { $group: { _id: { emp: "$logged_by", ts: "$timesheet" }, minutes: { $sum: "$duration_minutes" } } },
      ]);
      for (const a of agg) groups.push({ emp: a._id.emp, ts: a._id.ts, minutes: a.minutes });
    }

    const tsIds = [...new Set(groups.filter((g) => g.ts).map((g) => String(g.ts)))];
    const statusById = new Map();
    for (const chunk of batches(tsIds, 2000)) {
      const docs = await Timesheet.find({ organisation_id: ctx.orgId, _id: { $in: chunk.map(OID) } }).select("_id status").lean();
      for (const d of docs) statusById.set(String(d._id), d.status);
    }

    const per = foldHours(groups, statusById, wanted);
    const rows = [];
    for (const [empId, h] of per) {
      const p = byId.get(empId);
      if (!p) continue;
      const submitted = h.Pending + h.Approved + h.Rejected;
      if (!submitted && !h.Draft) continue;
      rows.push({
        uid: p.uid, name: p.name, department: p.department, period: periodLabel,
        submittedHours: hrs(submitted), approvedHours: hrs(h.Approved), pendingHours: hrs(h.Pending),
        rejectedHours: hrs(h.Rejected), draftHours: hrs(h.Draft), timesheets: h.sheets.size,
      });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    for (const g of batches(rows)) yield g;
  },
};
