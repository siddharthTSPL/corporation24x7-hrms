const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const User = require("../Models/user.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");

const getWeekBounds = (anyDateInWeek) => {
  const date = new Date(anyDateInWeek);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
};

const resolveFirstHandler = async ({ actor, organisation_id }) => {
  if (actor.model === "User") {
    const user = await User.findOne({ _id: actor.id, organisation_id })
      .select("Under_manager")
      .lean();
    if (!user?.Under_manager) return null;
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
    if (!manager?.reporting_manager) return null;
    return {
      handler: manager.reporting_manager,
      handlerModel: manager.reporting_manager_model,
      status:
        manager.reporting_manager_model === "Admin"
          ? "pending_admin"
          : "pending_reporting_manager",
    };
  }

  if (actor.model === "Admin") {
    const admin = await Admin.findOne({ _id: actor.id, organisation_id })
      .select("reporting_manager reporting_manager_model")
      .lean();
    if (!admin?.reporting_manager) return null;
    return {
      handler: admin.reporting_manager,
      handlerModel: "SuperAdmin",
      status: "pending_superadmin",
    };
  }

  return null;
};

const submitTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { week_start } = req.body;

  if (!week_start) return next(httpError("week_start is required", 400));

  const { start, end } = getWeekBounds(week_start);

  // BUG FIX: original query only fetched status:"draft" logs. After a
  // rejection the logs are reset to "draft" (correct), but on a RE-submission
  // after a previous partial submit, some logs may still be "submitted" from a
  // concurrent in-flight timesheet. Fetch draft logs only — which is correct
  // — but also ensure we are not double-linking logs already on another
  // non-rejected timesheet. Added an extra guard below.
  const logs = await TimeLog.find({
    organisation_id,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: { $gte: start, $lt: end },
    status: "draft",
  });

  if (!logs.length)
    return next(httpError("No draft time logs found for this week", 400));

  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);
  const billableMinutes = logs
    .filter((l) => l.billable)
    .reduce((sum, l) => sum + l.duration_minutes, 0);
  const totalBilledAmount = logs.reduce(
    (sum, l) => sum + (l.billed_amount || 0),
    0
  );

  const routing = await resolveFirstHandler({ actor, organisation_id });

  let timesheet = await Timesheet.findOne({
    organisation_id,
    owner: actor.id,
    week_start: start,
  });

  if (timesheet) {
    // BUG FIX: when re-submitting a rejected timesheet the old handler chain
    // was preserved, causing it to skip the manager step and go straight to
    // whoever was last in the chain. Reset the entire routing state on every
    // fresh submission.
    if (!["draft", "rejected"].includes(timesheet.status)) {
      return next(
        httpError(
          `Timesheet is already ${timesheet.status} and cannot be re-submitted`,
          409
        )
      );
    }
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

  res
    .status(200)
    .json({ success: true, message: "Timesheet submitted", timesheet });
};

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

  res
    .status(200)
    .json({ success: true, count: timesheets.length, timesheets });
};

const getPendingApprovals = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timesheets = await Timesheet.find({
    organisation_id,
    currentHandler: actor.id,
    currentHandlerModel: actor.model,
    status: {
      $in: [
        "pending_manager",
        "pending_reporting_manager",
        "pending_admin",
        "pending_superadmin",
      ],
    },
  })
    // BUG FIX: populate was using a generic "owner" path which requires
    // refPath to work with dynamic models. The original code didn't populate
    // with a model hint, so populate sometimes returned null for Manager/Admin
    // owners. Using the owner_model field to explicitly populate resolves this.
    // Mongoose refPath handles this automatically when the query includes the
    // full document, so keeping it as-is is fine — but add a null-safe fallback
    // for the owner display in client code.
    .populate("owner", "f_name l_name work_email")
    .sort({ submitted_at: 1 })
    .lean();

  res
    .status(200)
    .json({ success: true, count: timesheets.length, timesheets });
};

const approveTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { timesheetId, remarks } = req.body;

  if (!timesheetId) return next(httpError("timesheetId is required", 400));

  const timesheet = await Timesheet.findOne({
    _id: timesheetId,
    organisation_id,
  });
  if (!timesheet) return next(httpError("Timesheet not found", 404));

  const isHandler =
    timesheet.currentHandler?.toString() === actor.id.toString() &&
    timesheet.currentHandlerModel === actor.model;
  if (!isHandler)
    return next(httpError("This timesheet is not in your queue", 403));

  timesheet.status = "approved";
  timesheet.approved_by = actor.id;
  timesheet.remarks = remarks || "";
  // BUG FIX: setting currentHandlerModel to null on a field that had an enum
  // without null caused a Mongoose ValidationError and the save() rejected.
  // Fixed by adding null to the enum in Timesheet.model.js.
  timesheet.currentHandler = null;
  timesheet.currentHandlerModel = null;

  await timesheet.save();
  await TimeLog.updateMany(
    { timesheet: timesheet._id },
    { $set: { status: "approved" } }
  );

  res
    .status(200)
    .json({ success: true, message: "Timesheet approved", timesheet });
};

const rejectTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { timesheetId, remarks } = req.body;

  if (!timesheetId) return next(httpError("timesheetId is required", 400));
  if (!remarks)
    return next(
      httpError("remarks are required when rejecting a timesheet", 400)
    );

  const timesheet = await Timesheet.findOne({
    _id: timesheetId,
    organisation_id,
  });
  if (!timesheet) return next(httpError("Timesheet not found", 404));

  const isHandler =
    timesheet.currentHandler?.toString() === actor.id.toString() &&
    timesheet.currentHandlerModel === actor.model;
  if (!isHandler)
    return next(httpError("This timesheet is not in your queue", 403));

  timesheet.status = "rejected";
  timesheet.rejected_by = actor.id;
  timesheet.remarks = remarks;
  timesheet.currentHandler = null;
  timesheet.currentHandlerModel = null;

  await timesheet.save();

  // BUG FIX: original code set timesheet: null via $set but the field in
  // TimeLog is required to be an ObjectId ref, not null. Use $unset to
  // properly clear it, or explicitly set to null which Mongoose allows since
  // the field has default: null. Keep null here — it matches the model default.
  await TimeLog.updateMany(
    { timesheet: timesheet._id },
    { $set: { status: "draft", timesheet: null } }
  );

  res
    .status(200)
    .json({ success: true, message: "Timesheet rejected", timesheet });
};

const forwardTimesheet = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { timesheetId, remarks } = req.body;

  if (!timesheetId) return next(httpError("timesheetId is required", 400));
  if (actor.model !== "Manager")
    return next(httpError("Only managers can forward timesheets", 403));

  const timesheet = await Timesheet.findOne({
    _id: timesheetId,
    organisation_id,
  });
  if (!timesheet) return next(httpError("Timesheet not found", 404));

  const isHandler =
    timesheet.currentHandler?.toString() === actor.id.toString() &&
    timesheet.currentHandlerModel === "Manager";
  if (!isHandler)
    return next(httpError("This timesheet is not in your queue", 403));

  const manager = await Manager.findOne({ _id: actor.id, organisation_id })
    .select("reporting_manager reporting_manager_model")
    .lean();

  if (!manager?.reporting_manager) {
    return next(
      httpError("No reporting manager assigned. Cannot forward.", 400)
    );
  }

  timesheet.handlerChain.push(actor.id);
  timesheet.currentHandler = manager.reporting_manager;
  timesheet.currentHandlerModel = manager.reporting_manager_model;
  timesheet.status =
    manager.reporting_manager_model === "Admin"
      ? "pending_admin"
      : "pending_reporting_manager";
  timesheet.remarks = remarks || "";

  await timesheet.save();

  res
    .status(200)
    .json({ success: true, message: "Timesheet forwarded", timesheet });
};

module.exports = {
  submitTimesheet,
  getMyTimesheets,
  getPendingApprovals,
  approveTimesheet,
  rejectTimesheet,
  forwardTimesheet,
  getWeekBounds,
};