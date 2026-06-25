const TSJob = require("../Models/Tsjob.model");
const TSProject = require("../Models/tsproject.model");
const { assertCanAssign, resolveActor, resolveOrgId, getDirectReportIds, httpError } = require("../utils/heirarchy.utils");

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
  } = req.body;

  if (!title) return next(httpError("Job title is required", 400));
  if (!assigned_to || !assigned_to_model) {
    return next(httpError("assigned_to and assigned_to_model are required", 400));
  }

  if (project) {
    const projectExists = await TSProject.findOne({ _id: project, organisation_id });
    if (!projectExists) return next(httpError("Project not found", 404));
  }

  const isSelfAssigned = actor.model === assigned_to_model && actor.id.toString() === assigned_to.toString();

  if (!isSelfAssigned) {
    await assertCanAssign({
      actorId: actor.id,
      actorModel: actor.model,
      targetId: assigned_to,
      targetModel: assigned_to_model,
      organisationId: organisation_id,
    });
  } else if (actor.model === "SuperAdmin") {
    return next(httpError("SuperAdmin cannot self-assign a job", 403));
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
    due_date: due_date || null,
    work_items: Array.isArray(work_items) ? work_items.map((w) => ({ name: w })) : [],
    tags: Array.isArray(tags) ? tags : [],
  });

  res.status(201).json({ success: true, message: "Job created", job });
};

const getAssignableTargets = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const targets = await getDirectReportIds({
    actorId: actor.id,
    actorModel: actor.model,
    organisationId: organisation_id,
  });

  const Admin = require("../Models/Admin.model");
  const Manager = require("../Models/manager.model");
  const User = require("../Models/user.model");

  const modelMap = { Admin, Manager, User };

  const populated = await Promise.all(
    targets.map(async (t) => {
      const Model = modelMap[t.model];
      if (!Model) return { ...t, name: t.model };
      const doc = await Model.findById(t.id).select("f_name l_name work_email").lean();
      return {
        ...t,
        name: doc ? `${doc.f_name} ${doc.l_name}` : String(t.id),
        email: doc?.work_email || "",
      };
    })
  );

  res.status(200).json({ success: true, count: populated.length, targets: populated });
};

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

  res.status(200).json({ success: true, count: jobs.length, jobs });
};

const getJobById = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = resolveOrgId(req);

  const job = await TSJob.findOne({ _id: id, organisation_id })
    .populate("project", "name color_tag client")
    .lean();

  if (!job) return next(httpError("Job not found", 404));

  res.status(200).json({ success: true, job });
};

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

  if (!isAssignee && !isAssigner) {
    return next(httpError("You do not have access to this job", 403));
  }

  job.status = status;
  await job.save();

  res.status(200).json({ success: true, message: "Job status updated", job });
};

const updateJob = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const job = await TSJob.findOne({ _id: id, organisation_id });
  if (!job) return next(httpError("Job not found", 404));

  const isAssigner = job.assigned_by.toString() === actor.id.toString() && job.assigned_by_model === actor.model;
  if (!isAssigner) return next(httpError("Only the assigner can edit this job", 403));

  const allowedFields = [
    "title", "description", "priority", "billable", "hourly_rate",
    "currency", "estimated_hours", "due_date", "tags",
  ];

  for (const field of allowedFields) {
    if (field in req.body) job[field] = req.body[field];
  }

  await job.save();
  res.status(200).json({ success: true, message: "Job updated", job });
};

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

const archiveJob = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const job = await TSJob.findOne({ _id: id, organisation_id });
  if (!job) return next(httpError("Job not found", 404));

  const isAssigner = job.assigned_by.toString() === actor.id.toString() && job.assigned_by_model === actor.model;
  if (!isAssigner) return next(httpError("Only the assigner can archive this job", 403));

  job.archived_at = new Date();
  await job.save();

  res.status(200).json({ success: true, message: "Job archived", job });
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
};