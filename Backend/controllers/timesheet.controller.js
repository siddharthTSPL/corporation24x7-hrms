const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const User = require("../Models/user.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");
const { getISTDateParts, istDateFromYMD, parseISTDateOnly } = require("../utils/Istdate.utils");

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

module.exports = {
  submitTimesheet,
  getMyTimesheets,
  getPendingApprovals,
  approveTimesheet,
  rejectTimesheet,
  forwardTimesheet,
  recallTimesheet,
  getAllTimesheets,
  getWeekBounds,
};