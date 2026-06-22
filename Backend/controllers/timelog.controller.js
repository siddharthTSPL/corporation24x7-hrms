const mongoose = require("mongoose");
const TimeLog = require("../Models/Timelog.model");
const TSJob = require("../Models/Tsjob.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");

// BUG FIX: aggregate $match on an ObjectId field requires an actual ObjectId,
// not a plain string. When jobId arrives as a string (e.g. from stopTimer
// passing jobDoc._id which is already ObjectId but after lean() it's a string),
// the $match finds 0 documents and the cache resets to 0.
// Always cast to ObjectId before running the aggregation.
const recomputeJobHours = async (jobId) => {
  const oid =
    jobId instanceof mongoose.Types.ObjectId
      ? jobId
      : new mongoose.Types.ObjectId(jobId);

  const result = await TimeLog.aggregate([
    { $match: { job: oid } },
    { $group: { _id: null, total: { $sum: "$duration_minutes" } } },
  ]);

  const totalMinutes = result[0]?.total || 0;
  const totalHours = totalMinutes / 60;

  const job = await TSJob.findById(oid);
  if (!job) return;

  job.logged_hours_cache = Math.round(totalHours * 100) / 100;

  if (
    job.estimated_hours &&
    job.logged_hours_cache > job.estimated_hours &&
    !job.overrun_flagged
  ) {
    job.overrun_flagged = true;
    job.overrun_flagged_at = new Date();
  }

  if (
    job.estimated_hours &&
    job.logged_hours_cache <= job.estimated_hours &&
    job.overrun_flagged
  ) {
    job.overrun_flagged = false;
    job.overrun_flagged_at = null;
  }

  await job.save();
};

const logTime = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { job, log_date, duration_minutes, note, billable } = req.body;

  if (!job || !log_date || !duration_minutes) {
    return next(
      httpError("job, log_date, and duration_minutes are required", 400)
    );
  }

  if (duration_minutes <= 0 || duration_minutes > 1440) {
    return next(
      httpError("duration_minutes must be between 1 and 1440", 400)
    );
  }

  const jobDoc = await TSJob.findOne({ _id: job, organisation_id });
  if (!jobDoc) return next(httpError("Job not found", 404));

  const isAssignee =
    jobDoc.assigned_to.toString() === actor.id.toString() &&
    jobDoc.assigned_to_model === actor.model;
  if (!isAssignee)
    return next(
      httpError("You can only log time against jobs assigned to you", 403)
    );

  const isBillable =
    billable !== undefined ? !!billable : jobDoc.billable;

  const timeLog = await TimeLog.create({
    organisation_id,
    job,
    project: jobDoc.project,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date,
    entry_mode: "manual",
    duration_minutes,
    note: note || "",
    billable: isBillable,
    hourly_rate: jobDoc.hourly_rate,
    currency: jobDoc.currency,
  });

  await recomputeJobHours(jobDoc._id);

  res.status(201).json({ success: true, message: "Time logged", timeLog });
};

const getMyDayLog = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { date } = req.query;

  if (!date) return next(httpError("date query param is required", 400));

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const logs = await TimeLog.find({
    organisation_id,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: { $gte: dayStart, $lte: dayEnd },
  })
    .populate("job", "title project")
    .sort({ createdAt: -1 })
    .lean();

  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);

  res.status(200).json({ success: true, date, totalMinutes, logs });
};

const getMyWeekLog = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { week_start } = req.query;

  if (!week_start)
    return next(httpError("week_start query param is required", 400));

  const start = new Date(week_start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const logs = await TimeLog.find({
    organisation_id,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: { $gte: start, $lt: end },
  })
    .populate("job", "title project billable")
    .sort({ log_date: 1 })
    .lean();

  // BUG FIX: original code used toISOString().slice(0,10) to bucket by day,
  // which gives UTC dates. If the server runs in a non-UTC timezone and
  // log_date was stored with a local midnight, the ISO string shifts to the
  // previous day. Use a locale-independent approach: compare the raw Date
  // objects against each day boundary to avoid off-by-one day buckets.
  const dayBuckets = {};
  const dayKeys = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    dayKeys.push({ key, from: day, to: new Date(day.getTime() + 86400000) });
    dayBuckets[key] = { totalMinutes: 0, logs: [] };
  }

  for (const log of logs) {
    const logTime = new Date(log.log_date).getTime();
    const bucket = dayKeys.find(
      (d) => logTime >= d.from.getTime() && logTime < d.to.getTime()
    );
    if (!bucket) continue;
    dayBuckets[bucket.key].totalMinutes += log.duration_minutes;
    dayBuckets[bucket.key].logs.push(log);
  }

  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);

  res
    .status(200)
    .json({ success: true, week_start: start, totalMinutes, days: dayBuckets });
};

const updateTimeLog = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;
  const { duration_minutes, note, reason } = req.body;

  const timeLog = await TimeLog.findOne({ _id: id, organisation_id });
  if (!timeLog) return next(httpError("Time log not found", 404));

  const isOwner =
    timeLog.logged_by.toString() === actor.id.toString() &&
    timeLog.logged_by_model === actor.model;
  if (!isOwner)
    return next(httpError("You can only edit your own time logs", 403));

  if (timeLog.status === "approved") {
    return next(
      httpError("Cannot edit a time log that has already been approved", 400)
    );
  }

  // BUG FIX: also block editing submitted logs — they belong to a pending
  // timesheet and editing them silently corrupts the timesheet totals.
  if (timeLog.status === "submitted") {
    return next(
      httpError(
        "Cannot edit a time log that has been submitted. Recall the timesheet first.",
        400
      )
    );
  }

  if (
    duration_minutes !== undefined &&
    duration_minutes !== timeLog.duration_minutes
  ) {
    if (duration_minutes <= 0 || duration_minutes > 1440) {
      return next(
        httpError("duration_minutes must be between 1 and 1440", 400)
      );
    }

    timeLog.edit_history.push({
      edited_by: actor.id,
      edited_by_model: actor.model,
      previous_duration_minutes: timeLog.duration_minutes,
      previous_note: timeLog.note,
      reason: reason || "",
    });

    timeLog.duration_minutes = duration_minutes;
  }

  if (note !== undefined) timeLog.note = note;

  await timeLog.save();
  await recomputeJobHours(timeLog.job);

  res
    .status(200)
    .json({ success: true, message: "Time log updated", timeLog });
};

const deleteTimeLog = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const timeLog = await TimeLog.findOne({ _id: id, organisation_id });
  if (!timeLog) return next(httpError("Time log not found", 404));

  const isOwner =
    timeLog.logged_by.toString() === actor.id.toString() &&
    timeLog.logged_by_model === actor.model;
  if (!isOwner)
    return next(httpError("You can only delete your own time logs", 403));

  if (timeLog.status !== "draft") {
    return next(
      httpError("Cannot delete a time log that has been submitted", 400)
    );
  }

  const jobId = timeLog.job;
  await timeLog.deleteOne();
  await recomputeJobHours(jobId);

  res.status(200).json({ success: true, message: "Time log deleted" });
};

const getJobTimeLogs = async (req, res, next) => {
  const organisation_id = resolveOrgId(req);
  const { jobId } = req.params;

  const logs = await TimeLog.find({ organisation_id, job: jobId })
    .populate("logged_by", "f_name l_name")
    .sort({ log_date: -1 })
    .lean();

  res.status(200).json({ success: true, count: logs.length, logs });
};

module.exports = {
  logTime,
  getMyDayLog,
  getMyWeekLog,
  updateTimeLog,
  deleteTimeLog,
  getJobTimeLogs,
  recomputeJobHours,
};