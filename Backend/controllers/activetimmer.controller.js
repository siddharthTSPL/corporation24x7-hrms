const ActiveTimer = require("../Models/Activetimer.model");
const TSJob = require("../Models/Tsjob.model");
const TimeLog = require("../Models/Timelog.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");
const { recomputeJobHours } = require("./timelog.controller");

// Heartbeat must arrive every 60 s from the frontend.
// Backend caps each heartbeat contribution at 60 s to prevent drift or cheating.
const HEARTBEAT_CAP_SECONDS = 60;
const IDLE_THRESHOLD_SECONDS = 300; // 5 min without a heartbeat → mark idle

// ─── startTimer ──────────────────────────────────────────────────────────────

const startTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { job, note } = req.body;

  if (!job) return next(httpError("job is required", 400));

  // Block if any timer (running OR paused) already exists
  const existing = await ActiveTimer.findOne({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
  });
  if (existing) {
    return next(httpError(
      existing.status === "paused"
        ? "You have a paused timer. Resume or stop it before starting a new one."
        : "A timer is already running. Stop it first.",
      409
    ));
  }

  // Verify the job is assigned to this user
  const jobDoc = await TSJob.findOne({ _id: job, organisation_id });
  if (!jobDoc) return next(httpError("Job not found", 404));

  const isAssignee =
    jobDoc.assigned_to.toString() === actor.id.toString() &&
    jobDoc.assigned_to_model === actor.model;
  if (!isAssignee) {
    return next(httpError("You can only track time on jobs assigned to you", 403));
  }

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

// ─── heartbeatTimer ───────────────────────────────────────────────────────────
// Frontend calls this every exactly 60 000 ms.
// Backend clamps elapsed time to HEARTBEAT_CAP_SECONDS so a late/double beat
// never inflates the total. Idle is flagged if gap > IDLE_THRESHOLD_SECONDS.

const heartbeatTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
  });
  if (!timer) return next(httpError("No active timer found", 404));

  if (timer.status !== "running") {
    return res.status(200).json({ success: true, message: "Timer is paused, heartbeat ignored", timer });
  }

  const now = new Date();
  const rawElapsed = Math.floor((now - timer.last_heartbeat_at) / 1000);

  // Cap: never credit more than 60 s per heartbeat cycle
  const creditSeconds = Math.min(rawElapsed, HEARTBEAT_CAP_SECONDS);
  timer.accumulated_seconds += creditSeconds;

  // Idle detection: if real gap > threshold, user is probably away
  if (rawElapsed >= IDLE_THRESHOLD_SECONDS) {
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

// ─── pauseTimer ───────────────────────────────────────────────────────────────

const pauseTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
  });
  if (!timer) return next(httpError("No active timer found", 404));
  if (timer.status === "paused") return next(httpError("Timer is already paused", 400));

  const now = new Date();
  // Cap partial interval since last heartbeat
  const secondsSinceHeartbeat = Math.min(
    Math.max(0, Math.floor((now - timer.last_heartbeat_at) / 1000)),
    HEARTBEAT_CAP_SECONDS
  );
  timer.accumulated_seconds += secondsSinceHeartbeat;
  timer.status = "paused";
  timer.paused_at = now;
  timer.is_idle = false;
  timer.idle_since = null;

  await timer.save();

  res.status(200).json({ success: true, message: "Timer paused", timer });
};

// ─── resumeTimer ──────────────────────────────────────────────────────────────

const resumeTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
  });
  if (!timer) return next(httpError("No active timer found", 404));
  if (timer.status === "running") return next(httpError("Timer is already running", 400));

  const now = new Date();
  timer.status = "running";
  // Reset heartbeat anchor to NOW so the next cycle measures correctly from resume point
  timer.last_heartbeat_at = now;
  timer.paused_at = null;

  await timer.save();

  res.status(200).json({ success: true, message: "Timer resumed", timer });
};

// ─── stopTimer ────────────────────────────────────────────────────────────────

const stopTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { note } = req.body;

  const timer = await ActiveTimer.findOne({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
  });
  if (!timer) return next(httpError("No active timer found", 404));

  const jobDoc = await TSJob.findOne({ _id: timer.job, organisation_id });
  if (!jobDoc) return next(httpError("Job not found", 404));

  let finalSeconds = timer.accumulated_seconds;

  // If still running, add the remaining partial interval (capped)
  if (timer.status === "running") {
    const remaining = Math.min(
      Math.max(0, Math.floor((new Date() - timer.last_heartbeat_at) / 1000)),
      HEARTBEAT_CAP_SECONDS
    );
    finalSeconds += remaining;
  }

  // Minimum 1 minute — don't create 0-minute logs
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

// ─── getActiveTimer ───────────────────────────────────────────────────────────

const getActiveTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOne({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
  })
    .populate("job", "title project status")
    .lean();

  res.status(200).json({ success: true, timer: timer || null });
};

// ─── discardTimer ─────────────────────────────────────────────────────────────

const discardTimer = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const timer = await ActiveTimer.findOneAndDelete({
    organisation_id,
    user: actor.id,
    user_model: actor.model,
  });
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