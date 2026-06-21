const ActiveTimer = require("../Models/activetimer.model");
const TSJob = require("../Models/tsjob.model");
const TimeLog = require("../Models/timelog.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/hierarchy.utils");
const { recomputeJobHours } = require("./timelog.controller");

const IDLE_THRESHOLD_SECONDS = 300;

const startTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { job, note } = req.body;

  if (!job) return next(httpError("job is required", 400));

  const existing = await ActiveTimer.findOne({ organisation_id, user: actor.id, user_model: actor.model });
  if (existing) return next(httpError("A timer is already running. Stop it before starting a new one.", 409));

  const jobDoc = await TSJob.findOne({ _id: job, organisation_id });
  if (!jobDoc) return next(httpError("Job not found", 404));

  const isAssignee = jobDoc.assigned_to.toString() === actor.id.toString() && jobDoc.assigned_to_model === actor.model;
  if (!isAssignee) return next(httpError("You can only track time on jobs assigned to you", 403));

  const now = new Date();
  const timer = await ActiveTimer.create({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
    job,
    started_at: now,
    last_heartbeat_at: now,
    accumulated_seconds: 0,
    status: "running",
    note: note || "",
  });

  res.status(201).json({ success: true, message: "Timer started", timer });
};

const heartbeatTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({ organisation_id, user: actor.id, user_model: actor.model });
  if (!timer) return next(httpError("No active timer found", 404));

  if (timer.status !== "running") {
    return res.status(200).json({ success: true, message: "Timer is paused, heartbeat ignored", timer });
  }

  const now = new Date();
  const secondsSinceLastBeat = (now - timer.last_heartbeat_at) / 1000;

  if (secondsSinceLastBeat >= IDLE_THRESHOLD_SECONDS) {
    timer.is_idle = true;
    timer.idle_since = timer.idle_since || timer.last_heartbeat_at;
  } else {
    timer.is_idle = false;
    timer.idle_since = null;
  }

  timer.last_heartbeat_at = now;
  await timer.save();

  res.status(200).json({ success: true, timer });
};

const pauseTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({ organisation_id, user: actor.id, user_model: actor.model });
  if (!timer) return next(httpError("No active timer found", 404));
  if (timer.status === "paused") return next(httpError("Timer is already paused", 400));

  const now = new Date();
  const elapsedSeconds = Math.floor((now - timer.last_heartbeat_at) / 1000) + timer.accumulated_seconds;

  timer.accumulated_seconds = elapsedSeconds;
  timer.status = "paused";
  timer.paused_at = now;
  timer.is_idle = false;
  timer.idle_since = null;

  await timer.save();

  res.status(200).json({ success: true, message: "Timer paused", timer });
};

const resumeTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({ organisation_id, user: actor.id, user_model: actor.model });
  if (!timer) return next(httpError("No active timer found", 404));
  if (timer.status === "running") return next(httpError("Timer is already running", 400));

  const now = new Date();
  timer.status = "running";
  timer.last_heartbeat_at = now;
  timer.paused_at = null;

  await timer.save();

  res.status(200).json({ success: true, message: "Timer resumed", timer });
};

const stopTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { note } = req.body;

  const timer = await ActiveTimer.findOne({ organisation_id, user: actor.id, user_model: actor.model });
  if (!timer) return next(httpError("No active timer found", 404));

  const jobDoc = await TSJob.findOne({ _id: timer.job, organisation_id });
  if (!jobDoc) return next(httpError("Job not found", 404));

  let finalSeconds = timer.accumulated_seconds;
  if (timer.status === "running") {
    const now = new Date();
    finalSeconds += Math.floor((now - timer.last_heartbeat_at) / 1000);
  }

  const durationMinutes = Math.max(1, Math.round(finalSeconds / 60));

  const timeLog = await TimeLog.create({
    organisation_id,
    job: timer.job,
    project: jobDoc.project,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: timer.started_at,
    entry_mode: "timer",
    start_time: timer.started_at,
    end_time: new Date(),
    duration_minutes: durationMinutes,
    note: note || timer.note || "",
    billable: jobDoc.billable,
    hourly_rate: jobDoc.hourly_rate,
    currency: jobDoc.currency,
    is_idle_corrected: timer.is_idle,
  });

  await ActiveTimer.deleteOne({ _id: timer._id });
  await recomputeJobHours(jobDoc._id);

  res.status(200).json({ success: true, message: "Timer stopped and logged", timeLog });
};

const getActiveTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({ organisation_id, user: actor.id, user_model: actor.model })
    .populate("job", "title project")
    .lean();

  res.status(200).json({ success: true, timer: timer || null });
};

const discardTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOneAndDelete({ organisation_id, user: actor.id, user_model: actor.model });
  if (!timer) return next(httpError("No active timer found", 404));

  res.status(200).json({ success: true, message: "Timer discarded" });
};

module.exports = {
  startTimer,
  heartbeatTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  getActiveTimer,
  discardTimer,
};