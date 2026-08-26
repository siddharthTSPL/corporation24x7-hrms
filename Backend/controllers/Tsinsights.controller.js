const TimeLog = require("../Models/Timelog.model");
const TSJob = require("../Models/Tsjob.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const { resolveActor, resolveOrgId, getDirectReportIds, httpError } = require("../utils/heirarchy.utils");
const { parseISTDateOnly } = require("../utils/Istdate.utils");

// getDirectReportIds only returns { id, model, name, email, role } — no
// empid/department/designation. Reports can be spread across the User,
// Manager, and Admin collections, so fetch each collection once (in
// parallel) and build an id -> profile lookup map.
const buildProfileMap = async (reportIds, organisation_id) => {
  const idsByModel = { User: [], Manager: [], Admin: [] };
  for (const r of reportIds) {
    if (idsByModel[r.model]) idsByModel[r.model].push(r.id);
  }

  const MODEL_MAP = { User, Manager, Admin };
  const profileMap = new Map();

  await Promise.all(
    Object.entries(idsByModel)
      .filter(([, ids]) => ids.length)
      .map(async ([modelName, ids]) => {
        const docs = await MODEL_MAP[modelName]
          .find({ _id: { $in: ids }, organisation_id })
          .select("empid f_name l_name department designation")
          .lean();

        for (const doc of docs) {
          profileMap.set(doc._id.toString(), {
            name: `${doc.f_name} ${doc.l_name}`,
            empid: doc.empid,
            department: doc.department,
            designation: doc.designation,
          });
        }
      })
  );

  return profileMap;
};

const DAILY_CAPACITY_MINUTES = 480;

const getTeamWorkloadHeatmap = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { week_start } = req.query;

  if (!week_start) return next(httpError("week_start query param is required", 400));

  const reportIds = await getDirectReportIds({
    actorId: actor.id,
    actorModel: actor.model,
    organisationId: organisation_id,
  });

  if (!reportIds.length) {
    return res.status(200).json({ success: true, heatmap: [] });
  }

  const start = parseISTDateOnly(week_start);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const logs = await TimeLog.aggregate([
    {
      $match: {
        organisation_id,
        logged_by: { $in: reportIds.map((r) => r.id) },
        log_date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: {
          logged_by: "$logged_by",
          // Without an explicit timezone, $dateToString buckets in UTC,
          // shifting entries logged before ~5:30am IST into the previous day.
          day: { $dateToString: { format: "%Y-%m-%d", date: "$log_date", timezone: "Asia/Kolkata" } },
        },
        totalMinutes: { $sum: "$duration_minutes" },
      },
    },
  ]);

  const profileMap = await buildProfileMap(reportIds, organisation_id);

  const heatmapMap = new Map();
  for (const report of reportIds) {
    const key = report.id.toString();
    const profile = profileMap.get(key) || {};
    heatmapMap.set(key, {
      person: report.id,
      model: report.model,
      name: profile.name || report.name,
      empid: profile.empid || null,
      department: profile.department || null,
      designation: profile.designation || null,
      days: {},
    });
  }

  for (const entry of logs) {
    const key = entry._id.logged_by.toString();
    if (!heatmapMap.has(key)) continue;
    heatmapMap.get(key).days[entry._id.day] = {
      minutes: entry.totalMinutes,
      loadPercent: Math.round((entry.totalMinutes / DAILY_CAPACITY_MINUTES) * 100),
    };
  }

  res.status(200).json({ success: true, heatmap: Array.from(heatmapMap.values()) });
};

const getOverrunRiskJobs = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const jobs = await TSJob.find({
    organisation_id,
    assigned_by: actor.id,
    assigned_by_model: actor.model,
    estimated_hours: { $gt: 0 },
    status: { $nin: ["completed", "cancelled"] },
    archived_at: null,
  })
    .select("title estimated_hours logged_hours_cache overrun_flagged assigned_to assigned_to_model due_date")
    .lean();

  const atRisk = jobs
    .map((job) => ({
      ...job,
      riskPercent: job.estimated_hours
        ? Math.round((job.logged_hours_cache / job.estimated_hours) * 100)
        : 0,
    }))
    .filter((job) => job.riskPercent >= 75)
    .sort((a, b) => b.riskPercent - a.riskPercent);

  res.status(200).json({ success: true, count: atRisk.length, jobs: atRisk });
};

const getIdleJobs = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { days } = req.query;
  const thresholdDays = Number(days) || 5;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  const jobs = await TSJob.find({
    organisation_id,
    assigned_by: actor.id,
    assigned_by_model: actor.model,
    status: { $in: ["not_started", "in_progress"] },
    archived_at: null,
  })
    .select("title status assigned_to assigned_to_model createdAt updatedAt logged_hours_cache")
    .lean();

  const idleJobs = jobs.filter((job) => {
    if (job.logged_hours_cache > 0 && new Date(job.updatedAt) > cutoff) return false;
    return new Date(job.updatedAt) <= cutoff;
  });

  res.status(200).json({ success: true, count: idleJobs.length, jobs: idleJobs });
};

const getMyProductivitySummary = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { week_start } = req.query;

  if (!week_start) return next(httpError("week_start query param is required", 400));

  const start = parseISTDateOnly(week_start);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const logs = await TimeLog.find({
    organisation_id,
    logged_by: actor.id,
    logged_by_model: actor.model,
    log_date: { $gte: start, $lt: end },
  })
    .populate("job", "title")
    .lean();

  const totalMinutes = logs.reduce((sum, l) => sum + l.duration_minutes, 0);
  const billableMinutes = logs.filter((l) => l.billable).reduce((sum, l) => sum + l.duration_minutes, 0);

  const byJob = {};
  for (const log of logs) {
    const jobId = log.job?._id?.toString();
    if (!jobId) continue;
    if (!byJob[jobId]) byJob[jobId] = { title: log.job.title, minutes: 0 };
    byJob[jobId].minutes += log.duration_minutes;
  }

  res.status(200).json({
    success: true,
    week_start: start,
    totalMinutes,
    billableMinutes,
    nonBillableMinutes: totalMinutes - billableMinutes,
    capacityPercent: Math.round((totalMinutes / (DAILY_CAPACITY_MINUTES * 5)) * 100),
    byJob: Object.values(byJob),
  });
};

module.exports = {
  getTeamWorkloadHeatmap,
  getOverrunRiskJobs,
  getIdleJobs,
  getMyProductivitySummary,
};