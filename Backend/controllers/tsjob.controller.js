const TSJob = require("../Models/Tsjob.model");
const TSProject = require("../Models/tsproject.model");
const TimeLog = require("../Models/Timelog.model");
const Admin = require("../Models/Admin.model");
const Manager = require("../Models/manager.model");
const User = require("../Models/user.model");
const SuperAdmin = require("../Models/superadmin.model"); // ⚠️ verify this matches your actual filename/casing in the Models folder
const {
  assertCanAssign,
  resolveActor,
  resolveOrgId,
  getDirectReportIds,
  httpError,
} = require("../utils/heirarchy.utils");

// ─── helpers ─────────────────────────────────────────────────────────────────

const MODEL_MAP = { Admin, Manager, User, SuperAdmin };

const enrichPerson = async (id, model) => {
  const M = MODEL_MAP[model];
  if (!M) return null;
  const doc = await M.findById(id).select("f_name l_name work_email role name email").lean();
  if (!doc) return null;

  const name =
    (doc.f_name || doc.l_name)
      ? `${doc.f_name || ""} ${doc.l_name || ""}`.trim()
      : (doc.name || "—");

  return {
    _id: id,
    name,
    email: doc.work_email || doc.email || "",
    role: doc.role || model.toLowerCase(),
    model,
  };
};

// ─── create job ──────────────────────────────────────────────────────────────

const createJob = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const {
    project,
    title,
    description,
    assigned_to,
    assigned_to_model,
    priority,
    billable,
    hourly_rate,
    currency,
    estimated_hours,
    due_date,
    work_items,
    tags,
    max_hours_per_day,
  } = req.body;

  if (!title) return next(httpError("Job title is required", 400));
  if (!assigned_to || !assigned_to_model) {
    return next(httpError("assigned_to and assigned_to_model are required", 400));
  }

  let maxHoursPerDay = null;
  if (max_hours_per_day !== undefined && max_hours_per_day !== null && max_hours_per_day !== "") {
    maxHoursPerDay = Number(max_hours_per_day);
    if (Number.isNaN(maxHoursPerDay) || maxHoursPerDay < 0.5 || maxHoursPerDay > 24) {
      return next(httpError("max_hours_per_day must be between 0.5 and 24", 400));
    }
  }

  if (project) {
    const projectExists = await TSProject.findOne({ _id: project, organisation_id });
    if (!projectExists) return next(httpError("Project not found", 404));
  }

  const isSelfAssigned =
    actor.model === assigned_to_model &&
    actor.id.toString() === assigned_to.toString();

  // SuperAdmin cannot self-assign
  if (isSelfAssigned && actor.model === "SuperAdmin") {
    return next(httpError("SuperAdmin cannot self-assign a job", 403));
  }

  if (!isSelfAssigned) {
    await assertCanAssign({
      actorId: actor.id,
      actorModel: actor.model,
      targetId: assigned_to,
      targetModel: assigned_to_model,
      organisationId: organisation_id,
    });
  }

  const job = await TSJob.create({
    organisation_id,
    project: project || null,
    title,
    description,
    assigned_by: actor.id,
    assigned_by_model: actor.model,
    assigned_to,
    assigned_to_model,
    is_self_assigned: isSelfAssigned,
    priority: priority || "medium",
    billable: !!billable,
    hourly_rate: hourly_rate || 0,
    currency: currency || "INR",
    estimated_hours: estimated_hours || 0,
    max_hours_per_day: maxHoursPerDay,
    due_date: due_date || null,
    work_items: Array.isArray(work_items) ? work_items.map((w) => ({ name: w })) : [],
    tags: Array.isArray(tags) ? tags : [],
  });

  res.status(201).json({ success: true, message: "Job created", job });
};

// ─── getAssignableTargets ─────────────────────────────────────────────────────
// Returns people this actor can assign jobs to, with human-readable names + roles.
// Frontend uses this to populate the assign-job dropdown.

const getAssignableTargets = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const targets = await getDirectReportIds({
    actorId: actor.id,
    actorModel: actor.model,
    organisationId: organisation_id,
  });

  // targets already contain name/email/role from the rewritten heirarchy.utils
  res.status(200).json({ success: true, count: targets.length, targets });
};

// ─── getMyAssignedJobs ────────────────────────────────────────────────────────
// Jobs assigned TO the current user — shown in the timer dropdown and "My jobs" view.

const getMyAssignedJobs = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { status, project } = req.query;

  const filter = {
    organisation_id,
    assigned_to: actor.id,
    assigned_to_model: actor.model,
    archived_at: null,
  };
  if (status) filter.status = status;
  if (project) filter.project = project;

  const jobs = await TSJob.find(filter)
    .populate("project", "name color_tag")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, count: jobs.length, jobs });
};

// ─── getJobsCreatedByMe ───────────────────────────────────────────────────────
// Jobs this user assigned to others — shown in "Jobs I created" view.

const getJobsCreatedByMe = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { status, project, assigned_to } = req.query;

  const filter = {
    organisation_id,
    assigned_by: actor.id,
    assigned_by_model: actor.model,
  };
  if (status) filter.status = status;
  if (project) filter.project = project;
  if (assigned_to) filter.assigned_to = assigned_to;

  const jobs = await TSJob.find(filter)
    .populate("project", "name color_tag")
    .sort({ createdAt: -1 })
    .lean();

  // Enrich assignee info so frontend gets names not IDs
  const enriched = await Promise.all(
    jobs.map(async (job) => {
      const assignedToInfo = await enrichPerson(job.assigned_to, job.assigned_to_model);
      return { ...job, assigned_to_info: assignedToInfo };
    })
  );

  res.status(200).json({ success: true, count: enriched.length, jobs: enriched });
};

// ─── getJobById ───────────────────────────────────────────────────────────────

const getJobById = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = resolveOrgId(req);

  const job = await TSJob.findOne({ _id: id, organisation_id })
    .populate("project", "name color_tag client")
    .lean();

  if (!job) return next(httpError("Job not found", 404));

  const [assignedToInfo, assignedByInfo] = await Promise.all([
    enrichPerson(job.assigned_to, job.assigned_to_model),
    enrichPerson(job.assigned_by, job.assigned_by_model),
  ]);

  res.status(200).json({ success: true, job: { ...job, assigned_to_info: assignedToInfo, assigned_by_info: assignedByInfo } });
};

// ─── updateJobStatus ──────────────────────────────────────────────────────────

const updateJobStatus = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["not_started", "in_progress", "on_hold", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return next(httpError("Invalid status value", 400));
  }

  const job = await TSJob.findOne({ _id: id, organisation_id });
  if (!job) return next(httpError("Job not found", 404));

  const isAssignee = job.assigned_to.toString() === actor.id.toString() && job.assigned_to_model === actor.model;
  const isAssigner = job.assigned_by.toString() === actor.id.toString() && job.assigned_by_model === actor.model;
  const isSAorAdmin = actor.model === "SuperAdmin" || actor.model === "Admin";

  if (!isAssignee && !isAssigner && !isSAorAdmin) {
    return next(httpError("You do not have access to this job", 403));
  }

  job.status = status;
  await job.save();

  res.status(200).json({ success: true, message: "Job status updated", job });
};

// ─── updateJob ────────────────────────────────────────────────────────────────

const updateJob = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const job = await TSJob.findOne({ _id: id, organisation_id });
  if (!job) return next(httpError("Job not found", 404));

  const isAssigner = job.assigned_by.toString() === actor.id.toString() && job.assigned_by_model === actor.model;
  const isSAorAdmin = actor.model === "SuperAdmin" || actor.model === "Admin";

  if (!isAssigner && !isSAorAdmin) {
    return next(httpError("Only the assigner (or Admin/SuperAdmin) can edit this job", 403));
  }

  if (job.status === "completed") {
    return next(httpError("Completed jobs cannot be edited", 400));
  }

  const allowedFields = [
    "title", "description", "priority", "billable", "hourly_rate",
    "currency", "estimated_hours", "due_date", "tags",
  ];

  for (const field of allowedFields) {
    if (field in req.body) job[field] = req.body[field];
  }

  if ("max_hours_per_day" in req.body) {
    const raw = req.body.max_hours_per_day;
    if (raw === null || raw === "" || raw === undefined) {
      job.max_hours_per_day = null;
    } else {
      const val = Number(raw);
      if (Number.isNaN(val) || val < 0.5 || val > 24) {
        return next(httpError("max_hours_per_day must be between 0.5 and 24", 400));
      }
      job.max_hours_per_day = val;
    }
  }

  await job.save();
  res.status(200).json({ success: true, message: "Job updated", job });
};

// ─── toggleWorkItem ───────────────────────────────────────────────────────────

const toggleWorkItem = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id, workItemId } = req.params;

  const job = await TSJob.findOne({ _id: id, organisation_id });
  if (!job) return next(httpError("Job not found", 404));

  const isAssignee = job.assigned_to.toString() === actor.id.toString() && job.assigned_to_model === actor.model;
  if (!isAssignee) return next(httpError("Only the assignee can update work items", 403));

  const workItem = job.work_items.id(workItemId);
  if (!workItem) return next(httpError("Work item not found", 404));

  workItem.is_completed = !workItem.is_completed;
  await job.save();

  res.status(200).json({ success: true, message: "Work item updated", job });
};

// ─── archiveJob ───────────────────────────────────────────────────────────────

const archiveJob = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const job = await TSJob.findOne({ _id: id, organisation_id });
  if (!job) return next(httpError("Job not found", 404));

  const isAssigner = job.assigned_by.toString() === actor.id.toString() && job.assigned_by_model === actor.model;
  const isSAorAdmin = actor.model === "SuperAdmin" || actor.model === "Admin";

  if (!isAssigner && !isSAorAdmin) {
    return next(httpError("Only the assigner (or Admin/SuperAdmin) can archive this job", 403));
  }

  job.archived_at = new Date();
  await job.save();

  res.status(200).json({ success: true, message: "Job archived", job });
};

// ─── ADMIN / SUPERADMIN / MANAGER: job visibility for reports ────────────────
// Admin/SuperAdmin see every job in the org. Managers only see jobs assigned
// to themselves or to their direct reports (mirrors getMyAssignedJobs' scope
// but across a whole team, for the report-tab Job filter dropdown).

const getAllJobsAdmin = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { status, assigned_to, assigned_to_model, project, priority } = req.query;

  const filter = { organisation_id, archived_at: null };
  if (status) filter.status = status;
  if (assigned_to_model) filter.assigned_to_model = assigned_to_model;
  if (project) filter.project = project;
  if (priority) filter.priority = priority;

  if (actor.model === "Manager") {
    // Managers are scoped to their own team: themselves + their direct
    // reports. If a specific assigned_to was requested, it must fall
    // inside that team or we return an empty result rather than leaking
    // another team's jobs.
    const reports = await getDirectReportIds({
      actorId: actor.id,
      actorModel: actor.model,
      organisationId: organisation_id,
    });
    const teamIds = [actor.id.toString(), ...reports.map((r) => r.id.toString())];

    if (assigned_to) {
      filter.assigned_to = teamIds.includes(assigned_to.toString()) ? assigned_to : null;
    } else {
      filter.assigned_to = { $in: teamIds };
    }
  } else if (assigned_to) {
    filter.assigned_to = assigned_to;
  }

  const jobs = await TSJob.find(filter)
    .populate("project", "name color_tag")
    .sort({ createdAt: -1 })
    .lean();

  // Batch enrich assigned_to + assigned_by with names/roles
  const enriched = await Promise.all(
    jobs.map(async (job) => {
      const [assignedToInfo, assignedByInfo] = await Promise.all([
        enrichPerson(job.assigned_to, job.assigned_to_model),
        enrichPerson(job.assigned_by, job.assigned_by_model),
      ]);
      return { ...job, assigned_to_info: assignedToInfo, assigned_by_info: assignedByInfo };
    })
  );

  res.status(200).json({ success: true, count: enriched.length, jobs: enriched });
};

// ─── getJobTimelineAdmin ──────────────────────────────────────────────────────
// Returns a job + all time logs on it + per-contributor summary.
// Used by Admin/SA to see who worked on a job and how long.

const getJobTimelineAdmin = async (req, res, next) => {
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const job = await TSJob.findOne({ _id: id, organisation_id })
    .populate("project", "name color_tag")
    .lean();
  if (!job) return next(httpError("Job not found", 404));

  const logs = await TimeLog.find({ organisation_id, job: id })
    .sort({ log_date: 1, createdAt: 1 })
    .lean();

  // Enrich each log with contributor info
  const enrichedLogs = await Promise.all(
    logs.map(async (log) => {
      const contributor = await enrichPerson(log.logged_by, log.logged_by_model);
      return { ...log, contributor };
    })
  );

  // Summarise per contributor
  const summaryMap = {};
  for (const log of enrichedLogs) {
    const key = log.logged_by.toString();
    if (!summaryMap[key]) {
      summaryMap[key] = {
        contributor: log.contributor,
        total_minutes: 0,
        log_count: 0,
        billable_minutes: 0,
      };
    }
    summaryMap[key].total_minutes += log.duration_minutes;
    summaryMap[key].log_count += 1;
    if (log.billable) summaryMap[key].billable_minutes += log.duration_minutes;
  }

  const totalMinutes = enrichedLogs.reduce((s, l) => s + l.duration_minutes, 0);

  const [assignedToInfo, assignedByInfo] = await Promise.all([
    enrichPerson(job.assigned_to, job.assigned_to_model),
    enrichPerson(job.assigned_by, job.assigned_by_model),
  ]);

  res.status(200).json({
    success: true,
    job: { ...job, assigned_to_info: assignedToInfo, assigned_by_info: assignedByInfo },
    total_minutes: totalMinutes,
    contributor_summary: Object.values(summaryMap),
    logs: enrichedLogs,
  });
};

module.exports = {
  createJob,
  getAssignableTargets,
  getMyAssignedJobs,
  getJobsCreatedByMe,
  getJobById,
  updateJobStatus,
  updateJob,
  toggleWorkItem,
  archiveJob,
  getAllJobsAdmin,
  getJobTimelineAdmin,
};