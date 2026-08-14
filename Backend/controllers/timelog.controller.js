const mongoose = require("mongoose");
const TimeLog = require("../Models/Timelog.model");
const TSJob = require("../Models/Tsjob.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");
const { parseISTDateOnly, endOfISTDay, toISTKey } = require("../utils/Istdate.utils");
const { resolveEmployeeShift, getShiftDurationMinutes } = require("../utils/shift.utils");

// ─── overtime helpers ────────────────────────────────────────────────────────
// A job can set its own per-day working-hour cap (max_hours_per_day). If it
// doesn't, we fall back to the assignee's shift length (end - start) as the
// day's regular-working-hour baseline. Anything logged past that cap on a
// given IST day is overtime instead of regular working time.

const getActorDoc = (req) => req.employee || req.manager || req.admin || null;

const resolveDailyLimitMinutes = async (jobDoc, req, organisation_id) => {
  if (jobDoc.max_hours_per_day) {
    return Math.round(jobDoc.max_hours_per_day * 60);
  }
  const actorDoc = getActorDoc(req);
  if (!actorDoc) return null;
  const shift = await resolveEmployeeShift(actorDoc, organisation_id);
  if (!shift) return null;
  return getShiftDurationMinutes(shift);
};

// Given minutes already logged today (existingMinutes) and a new/updated
// entry of entryMinutes, splits the entry itself across the regular/overtime
// boundary defined by limitMinutes.
const splitRegularOvertime = (existingMinutes, entryMinutes, limitMinutes) => {
  if (!limitMinutes || limitMinutes <= 0) {
    return { regular: entryMinutes, overtime: 0 };
  }
  if (existingMinutes >= limitMinutes) {
    return { regular: 0, overtime: entryMinutes };
  }
  const remainingRegular = limitMinutes - existingMinutes;
  if (entryMinutes <= remainingRegular) {
    return { regular: entryMinutes, overtime: 0 };
  }
  return { regular: remainingRegular, overtime: entryMinutes - remainingRegular };
};

const getExistingDayMinutes = async ({ organisation_id, actor, dayStart, dayEnd, excludeLogId }) => {
  const match = {
    organisation_id,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: "rejected" },
  };
  if (excludeLogId) match._id = { $ne: excludeLogId };

  const agg = await TimeLog.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$duration_minutes" } } },
  ]);
  return agg[0]?.total || 0;
};

const buildOvertimeWarning = ({ overtime, entryMinutes, dailyLimitMinutes, usedJobCap }) => {
  if (overtime <= 0) return null;
  const limitHoursLabel = dailyLimitMinutes ? (dailyLimitMinutes / 60).toFixed(1) : "?";
  const source = usedJobCap ? "for this job" : "based on your shift timing";
  const scope = overtime === entryMinutes ? "This entire entry is" : `${overtime} minute(s) of this entry are`;
  return `Today's logged time has crossed the ${limitHoursLabel}h working-hour limit ${source}. ${scope} recorded as overtime. Whether overtime is paid out is at the company's discretion.`;
};

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

  // Auto-move job out of "not_started" the moment work is actually logged against it
  if (jobDoc.status === "not_started") {
    jobDoc.status = "in_progress";
    await jobDoc.save();
  }

  // log_date arrives as "YYYY-MM-DD" from the date picker. Letting Mongoose
  // cast that string directly parses it as UTC midnight, which is 5:30am IST
  // - fine while the server happens to run in IST, but on a UTC virtual
  // server every downstream IST day/week bucket sees the entry a day early.
  const resolvedLogDate = parseISTDateOnly(log_date);

  // Regular vs overtime split, against everything else already logged today.
  const dayStart = resolvedLogDate;
  const dayEnd = endOfISTDay(dayStart);
  const dailyLimitMinutes = await resolveDailyLimitMinutes(jobDoc, req, organisation_id);
  const existingMinutes = await getExistingDayMinutes({
    organisation_id,
    actor,
    dayStart,
    dayEnd,
  });
  const { regular, overtime } = splitRegularOvertime(
    existingMinutes,
    duration_minutes,
    dailyLimitMinutes
  );

  const timeLog = await TimeLog.create({
    organisation_id,
    job,
    project: jobDoc.project,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: resolvedLogDate,
    entry_mode: "manual",
    duration_minutes,
    regular_minutes: regular,
    overtime_minutes: overtime,
    is_overtime: overtime > 0,
    daily_limit_minutes_at_log: dailyLimitMinutes,
    note: note || "",
    billable: isBillable,
    hourly_rate: jobDoc.hourly_rate,
    currency: jobDoc.currency,
  });

  await recomputeJobHours(jobDoc._id);

  const warning = buildOvertimeWarning({
    overtime,
    entryMinutes: duration_minutes,
    dailyLimitMinutes,
    usedJobCap: !!jobDoc.max_hours_per_day,
  });

  res.status(201).json({ success: true, message: "Time logged", timeLog, warning });
};

const getMyDayLog = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { date } = req.query;

  if (!date) return next(httpError("date query param is required", 400));

  const dayStart = parseISTDateOnly(date);
  const dayEnd = endOfISTDay(dayStart);

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
  const workingMinutes = logs.reduce((sum, l) => sum + (l.regular_minutes ?? l.duration_minutes), 0);
  const overtimeMinutes = logs.reduce((sum, l) => sum + (l.overtime_minutes || 0), 0);

  res.status(200).json({ success: true, date, totalMinutes, workingMinutes, overtimeMinutes, logs });
};

const getMyWeekLog = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { week_start } = req.query;

  if (!week_start)
    return next(httpError("week_start query param is required", 400));

  const start = parseISTDateOnly(week_start);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const logs = await TimeLog.find({
    organisation_id,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: { $gte: start, $lt: end },
  })
    .populate("job", "title project billable")
    .sort({ log_date: 1 })
    .lean();

  // Bucket by IST calendar day. toISOString().slice(0,10) gives the UTC
  // date, which is a different calendar day from ~00:00 to ~05:30 IST -
  // that previously bucketed early-morning IST entries into the wrong day
  // (and onto the wrong side of week/month boundaries). toISTKey/day math
  // here stays in IST throughout, independent of server timezone.
  const dayBuckets = {};
  const dayKeys = [];
  for (let i = 0; i < 7; i++) {
    const from = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    const key = toISTKey(from);
    dayKeys.push({ key, from, to });
    dayBuckets[key] = { totalMinutes: 0, workingMinutes: 0, overtimeMinutes: 0, logs: [] };
  }

  for (const log of logs) {
    const logTime = new Date(log.log_date).getTime();
    const bucket = dayKeys.find(
      (d) => logTime >= d.from.getTime() && logTime < d.to.getTime()
    );
    if (!bucket) continue;
    dayBuckets[bucket.key].totalMinutes += log.duration_minutes;
    dayBuckets[bucket.key].workingMinutes += log.regular_minutes ?? log.duration_minutes;
    dayBuckets[bucket.key].overtimeMinutes += log.overtime_minutes || 0;
    dayBuckets[bucket.key].logs.push(log);
  }

  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);
  const totalWorkingMinutes = logs.reduce((sum, l) => sum + (l.regular_minutes ?? l.duration_minutes), 0);
  const totalOvertimeMinutes = logs.reduce((sum, l) => sum + (l.overtime_minutes || 0), 0);

  res.status(200).json({
    success: true,
    week_start: start,
    totalMinutes,
    totalWorkingMinutes,
    totalOvertimeMinutes,
    days: dayBuckets,
  });
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

  let warning = null;

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

    // Recompute the regular/overtime split for this entry against the rest
    // of that same IST day (excluding itself).
    const jobDoc = await TSJob.findById(timeLog.job);
    const dayStart = timeLog.log_date;
    const dayEnd = endOfISTDay(dayStart);
    const dailyLimitMinutes = jobDoc
      ? await resolveDailyLimitMinutes(jobDoc, req, organisation_id)
      : timeLog.daily_limit_minutes_at_log;
    const existingMinutes = await getExistingDayMinutes({
      organisation_id,
      actor,
      dayStart,
      dayEnd,
      excludeLogId: timeLog._id,
    });
    const { regular, overtime } = splitRegularOvertime(
      existingMinutes,
      duration_minutes,
      dailyLimitMinutes
    );

    timeLog.regular_minutes = regular;
    timeLog.overtime_minutes = overtime;
    timeLog.is_overtime = overtime > 0;
    timeLog.daily_limit_minutes_at_log = dailyLimitMinutes;

    warning = buildOvertimeWarning({
      overtime,
      entryMinutes: duration_minutes,
      dailyLimitMinutes,
      usedJobCap: !!jobDoc?.max_hours_per_day,
    });
  }

  if (note !== undefined) timeLog.note = note;

  await timeLog.save();
  await recomputeJobHours(timeLog.job);

  res
    .status(200)
    .json({ success: true, message: "Time log updated", timeLog, warning });
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

// ─── ADMIN / SUPERADMIN: org-wide log visibility ─────────────────────────────

const getAllTimeLogs = async (req, res, next) => {
  const organisation_id = resolveOrgId(req);
  const { date, week_start, user_id, job_id, status } = req.query;

  const filter = { organisation_id };
  if (user_id) filter.logged_by = user_id;
  if (job_id) filter.job = job_id;
  if (status) filter.status = status;

  if (date) {
    const dayStart = parseISTDateOnly(date);
    const dayEnd = endOfISTDay(dayStart);
    filter.log_date = { $gte: dayStart, $lte: dayEnd };
  } else if (week_start) {
    const start = parseISTDateOnly(week_start);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    filter.log_date = { $gte: start, $lt: end };
  }

  const logs = await TimeLog.find(filter)
    .populate("job", "title project")
    .populate("logged_by", "f_name l_name work_email")
    .sort({ log_date: -1, createdAt: -1 })
    .lean();

  const totalMinutes = logs.reduce((s, l) => s + l.duration_minutes, 0);

  res.status(200).json({ success: true, count: logs.length, totalMinutes, logs });
};

module.exports = {
  logTime,
  getMyDayLog,
  getMyWeekLog,
  updateTimeLog,
  deleteTimeLog,
  getJobTimeLogs,
  getAllTimeLogs,
  recomputeJobHours,
};