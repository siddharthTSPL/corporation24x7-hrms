const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const User = require("../Models/user.model");
const { resolveActor, resolveOrgId, getDirectReportIds, httpError } = require("../utils/heirarchy.utils");
const { getISTDateParts, istDateFromYMD, parseISTDateOnly, endOfISTDay, toISTKey } = require("../utils/Istdate.utils");
const { getWeekOffMapForRange } = require("../automatic/weekoffcalendar");

// ─── helpers ─────────────────────────────────────────────────────────────────

// Computes Monday 00:00 IST .. next Monday 00:00 IST for the IST calendar
// week that `anyDateInWeek` falls in. Built on the IST date utils instead of
// Date.getDay()/setDate()/setHours(), which read/write the SERVER PROCESS's
// local timezone - correct on a box set to Asia/Kolkata, wrong (usually UTC)
// on a virtual server, which shifts week boundaries and drops time logs.
const getWeekBounds = (anyDateInWeek) => {
  const anchor =
    typeof anyDateInWeek === "string" && /^\d{4}-\d{2}-\d{2}/.test(anyDateInWeek)
      ? parseISTDateOnly(anyDateInWeek)
      : new Date(anyDateInWeek);

  const { year, month, day, weekday } = getISTDateParts(anchor);
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;

  const mondayUTCInstant = istDateFromYMD(year, month, day).getTime() + diffToMonday * 24 * 60 * 60 * 1000;
  const start = new Date(mondayUTCInstant);
  const end = new Date(mondayUTCInstant + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
};

// Resolve the first handler in the approval chain for the given actor.
// Rules:
//   Employee  → their Under_manager (Manager)
//   Manager   → their reporting_manager (Manager or Admin)
//   Admin     → their reporting_manager (SuperAdmin always)
const resolveFirstHandler = async ({ actor, organisation_id }) => {
  if (actor.model === "User") {
    const user = await User.findOne({ _id: actor.id, organisation_id })
      .select("Under_manager")
      .lean();
    if (!user?.Under_manager) return null; // no manager — auto-approve
    return {
      handler: user.Under_manager,
      handlerModel: "Manager",
      status: "pending_manager",
    };
  }

  if (actor.model === "Manager") {
    const manager = await Manager.findOne({ _id: actor.id, organisation_id })
      .select("reporting_manager reporting_manager_model")
      .lean();
    if (!manager?.reporting_manager) return null; // no reporting manager — auto-approve
    const handlerModel = manager.reporting_manager_model; // "Admin" or "Manager"
    return {
      handler: manager.reporting_manager,
      handlerModel,
      status: handlerModel === "Admin" ? "pending_admin" : "pending_reporting_manager",
    };
  }

  if (actor.model === "Admin") {
    const admin = await Admin.findOne({ _id: actor.id, organisation_id })
      .select("reporting_manager")
      .lean();
    if (!admin?.reporting_manager) return null; // no SA link — auto-approve
    return {
      handler: admin.reporting_manager,
      handlerModel: "SuperAdmin",
      status: "pending_superadmin",
    };
  }

  return null;
};

// ─── submitTimesheet ──────────────────────────────────────────────────────────
// Collects all draft logs for the week and submits them as a timesheet.
// Routes to the correct first handler automatically.

const submitTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { week_start } = req.body;

  if (!week_start) return next(httpError("week_start is required", 400));

  const { start, end } = getWeekBounds(week_start);

  const logs = await TimeLog.find({
    organisation_id,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: { $gte: start, $lt: end },
    status: "draft",
  });

  if (!logs.length) {
    return next(httpError("No draft time logs found for this week", 400));
  }

  const totalMinutes = logs.reduce((s, l) => s + l.duration_minutes, 0);
  const workingMinutes = logs.reduce((s, l) => s + (l.regular_minutes ?? l.duration_minutes), 0);
  const overtimeMinutes = logs.reduce((s, l) => s + (l.overtime_minutes || 0), 0);
  const billableMinutes = logs.filter((l) => l.billable).reduce((s, l) => s + l.duration_minutes, 0);
  const totalBilledAmount = logs.reduce((s, l) => s + (l.billed_amount || 0), 0);

  const routing = await resolveFirstHandler({ actor, organisation_id });

  let timesheet = await Timesheet.findOne({
    organisation_id,
    owner: actor.id,
    week_start: start,
  });

  if (timesheet) {
    if (!["draft", "rejected"].includes(timesheet.status)) {
      return next(httpError(`Timesheet is already ${timesheet.status} and cannot be re-submitted`, 409));
    }
    // Reset routing chain on re-submission
    timesheet.handlerChain = [];
  } else {
    timesheet = new Timesheet({
      organisation_id,
      owner: actor.id,
      owner_model: actor.model,
      week_start: start,
      week_end: end,
    });
  }

  timesheet.time_logs = logs.map((l) => l._id);
  timesheet.total_minutes = totalMinutes;
  timesheet.working_minutes = workingMinutes;
  timesheet.overtime_minutes = overtimeMinutes;
  timesheet.billable_minutes = billableMinutes;
  timesheet.total_billed_amount = Math.round(totalBilledAmount * 100) / 100;
  timesheet.currentHandler = routing?.handler || null;
  timesheet.currentHandlerModel = routing?.handlerModel || null;
  timesheet.status = routing ? routing.status : "approved";
  timesheet.submitted_at = new Date();
  timesheet.escalation_level = 0;
  timesheet.last_escalated_at = null;

  await timesheet.save();

  await TimeLog.updateMany(
    { _id: { $in: logs.map((l) => l._id) } },
    { $set: { status: "submitted", timesheet: timesheet._id } }
  );

  res.status(200).json({ success: true, message: "Timesheet submitted", timesheet });
};

// ─── getMyTimesheets ──────────────────────────────────────────────────────────

const getMyTimesheets = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timesheets = await Timesheet.find({
    organisation_id,
    owner: actor.id,
    owner_model: actor.model,
  })
    .sort({ week_start: -1 })
    .lean();

  res.status(200).json({ success: true, count: timesheets.length, timesheets });
};

// ─── getPendingApprovals ──────────────────────────────────────────────────────
// Returns all timesheets currently in this actor's approval queue.

const getPendingApprovals = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timesheets = await Timesheet.find({
    organisation_id,
    currentHandler: actor.id,
    currentHandlerModel: actor.model,
    status: {
      $in: ["pending_manager", "pending_reporting_manager", "pending_admin", "pending_superadmin"],
    },
  })
    .populate("owner", "f_name l_name work_email")
    .sort({ submitted_at: 1 })
    .lean();

  res.status(200).json({ success: true, count: timesheets.length, timesheets });
};

// ─── approveTimesheet ─────────────────────────────────────────────────────────
// Current handler approves — marks all logs approved and closes the timesheet.

const approveTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { timesheetId, remarks } = req.body;

  if (!timesheetId) return next(httpError("timesheetId is required", 400));

  const timesheet = await Timesheet.findOne({ _id: timesheetId, organisation_id });
  if (!timesheet) return next(httpError("Timesheet not found", 404));

  const isHandler =
    timesheet.currentHandler?.toString() === actor.id.toString() &&
    timesheet.currentHandlerModel === actor.model;
  if (!isHandler) return next(httpError("This timesheet is not in your queue", 403));

  timesheet.status = "approved";
  timesheet.approved_by = actor.id;
  timesheet.remarks = remarks || "";
  timesheet.currentHandler = null;
  timesheet.currentHandlerModel = null;

  await timesheet.save();
  await TimeLog.updateMany({ timesheet: timesheet._id }, { $set: { status: "approved" } });

  res.status(200).json({ success: true, message: "Timesheet approved", timesheet });
};

// ─── rejectTimesheet ──────────────────────────────────────────────────────────
// Current handler rejects — logs reset to draft so the owner can revise and re-submit.

const rejectTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { timesheetId, remarks } = req.body;

  if (!timesheetId) return next(httpError("timesheetId is required", 400));
  if (!remarks) return next(httpError("remarks are required when rejecting", 400));

  const timesheet = await Timesheet.findOne({ _id: timesheetId, organisation_id });
  if (!timesheet) return next(httpError("Timesheet not found", 404));

  const isHandler =
    timesheet.currentHandler?.toString() === actor.id.toString() &&
    timesheet.currentHandlerModel === actor.model;
  if (!isHandler) return next(httpError("This timesheet is not in your queue", 403));

  timesheet.status = "rejected";
  timesheet.rejected_by = actor.id;
  timesheet.remarks = remarks;
  timesheet.currentHandler = null;
  timesheet.currentHandlerModel = null;

  await timesheet.save();
  // Reset logs to draft so owner can edit and re-submit
  await TimeLog.updateMany(
    { timesheet: timesheet._id },
    { $set: { status: "draft", timesheet: null } }
  );

  res.status(200).json({ success: true, message: "Timesheet rejected", timesheet });
};

// ─── forwardTimesheet ─────────────────────────────────────────────────────────
// A Manager forwards the timesheet up to their reporting manager (another Manager or Admin).
// An Admin can also forward to SuperAdmin using this same endpoint.

const forwardTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { timesheetId, remarks } = req.body;

  if (!timesheetId) return next(httpError("timesheetId is required", 400));

  if (!["Manager", "Admin"].includes(actor.model)) {
    return next(httpError("Only Manager or Admin can forward timesheets", 403));
  }

  const timesheet = await Timesheet.findOne({ _id: timesheetId, organisation_id });
  if (!timesheet) return next(httpError("Timesheet not found", 404));

  const isHandler =
    timesheet.currentHandler?.toString() === actor.id.toString() &&
    timesheet.currentHandlerModel === actor.model;
  if (!isHandler) return next(httpError("This timesheet is not in your queue", 403));

  let nextHandler = null;
  let nextHandlerModel = null;
  let nextStatus = null;

  if (actor.model === "Manager") {
    const manager = await Manager.findOne({ _id: actor.id, organisation_id })
      .select("reporting_manager reporting_manager_model")
      .lean();
    if (!manager?.reporting_manager) {
      return next(httpError("No reporting manager assigned. Cannot forward.", 400));
    }
    nextHandler = manager.reporting_manager;
    nextHandlerModel = manager.reporting_manager_model; // "Admin" or "Manager"
    nextStatus = nextHandlerModel === "Admin" ? "pending_admin" : "pending_reporting_manager";
  }

  if (actor.model === "Admin") {
    const admin = await Admin.findOne({ _id: actor.id, organisation_id })
      .select("reporting_manager")
      .lean();
    if (!admin?.reporting_manager) {
      return next(httpError("No Super Admin linked to this Admin. Cannot forward.", 400));
    }
    nextHandler = admin.reporting_manager;
    nextHandlerModel = "SuperAdmin";
    nextStatus = "pending_superadmin";
  }

  timesheet.handlerChain.push(actor.id);
  timesheet.currentHandler = nextHandler;
  timesheet.currentHandlerModel = nextHandlerModel;
  timesheet.status = nextStatus;
  timesheet.remarks = remarks || "";

  await timesheet.save();

  res.status(200).json({ success: true, message: "Timesheet forwarded", timesheet });
};

// ─── recallTimesheet ──────────────────────────────────────────────────────────
// Owner recalls a submitted timesheet back to draft (only while still pending).

const recallTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { timesheetId } = req.body;

  if (!timesheetId) return next(httpError("timesheetId is required", 400));

  const timesheet = await Timesheet.findOne({
    _id: timesheetId,
    organisation_id,
    owner: actor.id,
    owner_model: actor.model,
  });
  if (!timesheet) return next(httpError("Timesheet not found", 404));

  const pendingStatuses = ["pending_manager", "pending_reporting_manager", "pending_admin", "pending_superadmin"];
  if (!pendingStatuses.includes(timesheet.status)) {
    return next(httpError(`Cannot recall a timesheet with status "${timesheet.status}"`, 400));
  }

  timesheet.status = "draft";
  timesheet.currentHandler = null;
  timesheet.currentHandlerModel = null;
  timesheet.handlerChain = [];
  await timesheet.save();

  await TimeLog.updateMany(
    { timesheet: timesheet._id },
    { $set: { status: "draft", timesheet: null } }
  );

  res.status(200).json({ success: true, message: "Timesheet recalled", timesheet });
};

// ─── ADMIN / SUPERADMIN: org-wide timesheet visibility ───────────────────────

const getAllTimesheets = async (req, res, next) => {
  const organisation_id = resolveOrgId(req);
  const { status, owner_model, week_start } = req.query;

  const filter = { organisation_id };
  if (status) filter.status = status;
  if (owner_model) filter.owner_model = owner_model;
  if (week_start) {
    const { start, end } = getWeekBounds(week_start);
    filter.week_start = { $gte: start, $lt: end };
  }

  const timesheets = await Timesheet.find(filter)
    .populate("owner", "f_name l_name work_email")
    .sort({ submitted_at: -1, week_start: -1 })
    .lean();

  res.status(200).json({ success: true, count: timesheets.length, timesheets });
};

// ─── getTimesheetDetailedReport ───────────────────────────────────────────────
// Detailed, filterable Time Sheet Report for Admin/SuperAdmin:
// Name, Designation, Department, Project, Job, Date, Required hours,
// Serving hours, Overtime, and who Approved/Rejected the covering timesheet.
//
// Filters (all optional, via query params):
//   from, to            — "YYYY-MM-DD" date range (inclusive)
//   week_start          — "YYYY-MM-DD" alternative to from/to, picks that IST week
//   employee_id         — a specific User/Manager/Admin _id
//   employee_name       — partial employee name (case-insensitive)
//   employee_model      — "User" | "Manager" | "Admin"
//   department          — free-text department name (case-insensitive)
//   designation          — free-text designation (case-insensitive)
//   project_id           — TSProject _id
//   job_id                — TSJob _id
//   status                — timesheet status ("draft"|"pending_manager"|...|"approved"|"rejected")
//   billable              — "true" | "false"
//
// Also injects "Off" placeholder rows for week-off days (Saturday/Sunday,
// or whatever the employee's weekly-off policy resolves to) that have no
// logged entry, so the weekend always shows as Off in the report instead
// of silently disappearing. Placeholder rows are skipped when a status or
// billable filter is active, since they don't carry a real approval status.
const EMPLOYEE_MODELS = { User, Manager, Admin };

// Timesheet.approved_by / rejected_by don't record which collection they
// belong to, so resolving a display name means a best-effort lookup across
// all three actor collections (cached per report run to avoid repeat queries).
const resolveActorName = async (id, cache) => {
  if (!id) return null;
  const key = id.toString();
  if (cache.has(key)) return cache.get(key);
  for (const Model of Object.values(EMPLOYEE_MODELS)) {
    const doc = await Model.findById(id).select("f_name l_name").lean();
    if (doc) {
      const name = `${doc.f_name || ""} ${doc.l_name || ""}`.trim() || null;
      cache.set(key, name);
      return name;
    }
  }
  cache.set(key, null);
  return null;
};

const getTimesheetDetailedReport = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const {
    from,
    to,
    week_start,
    employee_id,
    employee_name,
    employee_model,
    department,
    designation,
    project_id,
    job_id,
    status,
    billable,
  } = req.query;

  // Manager only sees their own team (direct + indirect reports), never the
  // whole org - Admin/SuperAdmin stay org-wide as before.
  let teamIds = null;
  if (actor.model === "Manager") {
    const reports = await getDirectReportIds({
      actorId: actor.id,
      actorModel: "Manager",
      organisationId: organisation_id,
    });
    teamIds = reports.map((r) => r.id.toString());
    if (!teamIds.length) {
      return res.status(200).json({ success: true, range: { start: null, end: null }, count: 0, rows: [] });
    }
  }

  // ─ resolve the date range ─
  let start, end;
  if (week_start) {
    ({ start, end } = getWeekBounds(week_start));
  } else if (from || to) {
    start = parseISTDateOnly(from || to);
    end = to
      ? new Date(endOfISTDay(parseISTDateOnly(to)).getTime() + 1)
      : new Date(start.getTime() + 24 * 60 * 60 * 1000);
  } else {
    ({ start, end } = getWeekBounds(new Date()));
  }

  const logFilter = { organisation_id, log_date: { $gte: start, $lt: end } };
  if (teamIds) logFilter.logged_by = { $in: teamIds };
  if (employee_id) {
    if (teamIds && !teamIds.includes(employee_id.toString())) {
      return next(httpError("You can only view timesheet reports for your own team", 403));
    }
    logFilter.logged_by = employee_id;
  }
  if (employee_model) logFilter.logged_by_model = employee_model;
  if (job_id) logFilter.job = job_id;
  if (project_id) logFilter.project = project_id;
  if (billable !== undefined) logFilter.billable = billable === "true";

  let logs = await TimeLog.find(logFilter)
    .populate({ path: "logged_by", select: "f_name l_name work_email designation department" })
    .populate({ path: "job", select: "title project max_hours_per_day" })
    .populate({ path: "project", select: "name code" })
    .populate({ path: "timesheet", select: "status approved_by rejected_by remarks week_start week_end" })
    .sort({ log_date: 1 })
    .lean();

  // Employee metadata lives on the polymorphic logged_by doc, so filter it
  // after population rather than duplicating it on every time log.
  if (employee_name) {
    const nameSearch = employee_name.trim().toLowerCase();
    logs = logs.filter((l) =>
      `${l.logged_by?.f_name || ""} ${l.logged_by?.l_name || ""}`.trim().toLowerCase().includes(nameSearch)
    );
  }

  // department/designation/status live on the polymorphic logged_by doc or
  // the linked timesheet, not on TimeLog itself — filter post-populate.
  if (department) {
    logs = logs.filter(
      (l) => (l.logged_by?.department || "").toLowerCase() === department.toLowerCase()
    );
  }
  if (designation) {
    logs = logs.filter(
      (l) => (l.logged_by?.designation || "").toLowerCase() === designation.toLowerCase()
    );
  }
  if (status) {
    logs = logs.filter((l) => (l.timesheet?.status || "draft") === status);
  }

  const nameCache = new Map();
  const rows = [];
  for (const log of logs) {
    const ts = log.timesheet;
    let approvedByName = null;
    let rejectedByName = null;
    if (ts?.status === "approved" && ts.approved_by) {
      approvedByName = await resolveActorName(ts.approved_by, nameCache);
    }
    if (ts?.status === "rejected" && ts.rejected_by) {
      rejectedByName = await resolveActorName(ts.rejected_by, nameCache);
    }

    const isOffDay = log.day_type === "week_off" || log.day_type === "holiday";

    rows.push({
      time_log_id: log._id,
      employee_id: log.logged_by?._id || null,
      employee_model: log.logged_by_model,
      name: log.logged_by ? `${log.logged_by.f_name || ""} ${log.logged_by.l_name || ""}`.trim() : "—",
      work_email: log.logged_by?.work_email || null,
      designation: log.logged_by?.designation || "—",
      department: log.logged_by?.department || "—",
      project: log.project ? { id: log.project._id, name: log.project.name, code: log.project.code } : null,
      job: log.job ? { id: log.job._id, title: log.job.title } : null,
      date: toISTKey(log.log_date),
      day_type: log.day_type || "working",
      day_label: log.day_type === "week_off" ? "Weekend / Off" : log.day_type === "holiday" ? "Holiday" : "Working Day",
      required_hours: isOffDay ? 0 : Math.round(((log.daily_limit_minutes_at_log ?? 540) / 60) * 100) / 100,
      serving_hours: Math.round(((log.regular_minutes ?? 0) / 60) * 100) / 100,
      overtime_hours: Math.round(((log.overtime_minutes ?? 0) / 60) * 100) / 100,
      billable: !!log.billable,
      entry_status: log.status,
      timesheet_status: ts?.status || "draft",
      approved_by: approvedByName,
      rejected_by: rejectedByName,
      remarks: ts?.remarks || "",
    });
  }

  // ─ "Off" placeholder rows for week-off days with no entry ─
  if (!status && billable === undefined) {
    const employeesSeen = new Map();
    rows.forEach((r) => {
      if (!r.employee_id) return;
      const key = `${r.employee_model}:${r.employee_id}`;
      if (!employeesSeen.has(key)) {
        employeesSeen.set(key, {
          id: r.employee_id,
          model: r.employee_model,
          name: r.name,
          designation: r.designation,
          department: r.department,
        });
      }
    });

    const loggedDates = new Set(rows.map((r) => `${r.employee_model}:${r.employee_id}:${r.date}`));
    const rangeEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    for (const emp of employeesSeen.values()) {
      const dayTypeMap = await getWeekOffMapForRange(start, rangeEnd, organisation_id, emp.id, emp.model);
      for (const [dateKey, info] of dayTypeMap.entries()) {
        if (!info.isOff) continue;
        const seenKey = `${emp.model}:${emp.id}:${dateKey}`;
        if (loggedDates.has(seenKey)) continue;
        rows.push({
          time_log_id: null,
          employee_id: emp.id,
          employee_model: emp.model,
          name: emp.name,
          work_email: null,
          designation: emp.designation,
          department: emp.department,
          project: null,
          job: null,
          date: dateKey,
          day_type: "week_off",
          day_label: "Weekend / Off",
          required_hours: 0,
          serving_hours: 0,
          overtime_hours: 0,
          billable: false,
          entry_status: "off",
          timesheet_status: "off",
          approved_by: null,
          rejected_by: null,
          remarks: "",
        });
      }
    }
  }

  rows.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date)));

  res.status(200).json({ success: true, range: { start, end }, count: rows.length, rows });
};

module.exports = {
  submitTimesheet,
  getMyTimesheets,
  getPendingApprovals,
  approveTimesheet,
  rejectTimesheet,
  forwardTimesheet,
  recallTimesheet,
  getAllTimesheets,
  getTimesheetDetailedReport,
  getWeekBounds,
};
