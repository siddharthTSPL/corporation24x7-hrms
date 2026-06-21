const TSProject = require("../Models/tsproject.model");
const TSClient = require("../Models/tsclient.model");
const { assertCanAssign, resolveActor, resolveOrgId, getDirectReportIds, httpError } = require("../utils/hierarchy.utils");

const createProject = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const {
    name,
    code,
    description,
    client,
    billing_type,
    fixed_cost_amount,
    default_hourly_rate,
    currency,
    estimated_hours,
    start_date,
    end_date,
    color_tag,
    visibility,
    member_ids,
  } = req.body;

  if (!name) return next(httpError("Project name is required", 400));

  if (client) {
    const clientExists = await TSClient.findOne({ _id: client, organisation_id });
    if (!clientExists) return next(httpError("Client not found", 404));
  }

  let members = [];
  if (Array.isArray(member_ids) && member_ids.length) {
    const reportIds = await getDirectReportIds({
      actorId: actor.id,
      actorModel: actor.model,
      organisationId: organisation_id,
    });
    const reportMap = new Map(reportIds.map((r) => [r.id.toString(), r.model]));

    for (const entry of member_ids) {
      const targetId = typeof entry === "string" ? entry : entry.id;
      const memberModel = reportMap.get(targetId?.toString());
      if (!memberModel) {
        return next(httpError(`Member ${targetId} is not your direct report`, 403));
      }
      members.push({ member: targetId, member_model: memberModel });
    }
  }

  const project = await TSProject.create({
    organisation_id,
    name,
    code,
    description,
    client: client || null,
    created_by: actor.id,
    created_by_model: actor.model,
    owner: actor.id,
    owner_model: actor.model,
    members,
    billing_type: billing_type || "non_billable",
    fixed_cost_amount: fixed_cost_amount || 0,
    default_hourly_rate: default_hourly_rate || 0,
    currency: currency || "INR",
    estimated_hours: estimated_hours || 0,
    start_date: start_date || null,
    end_date: end_date || null,
    color_tag: color_tag || "#730042",
    visibility: visibility || "restricted",
  });

  res.status(201).json({ success: true, message: "Project created", project });
};

const getMyProjects = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const projects = await TSProject.find({
    organisation_id,
    $or: [
      { owner: actor.id, owner_model: actor.model },
      { "members.member": actor.id, "members.member_model": actor.model },
    ],
  })
    .populate("client", "name company_name")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, count: projects.length, projects });
};

const getProjectById = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = resolveOrgId(req);

  const project = await TSProject.findOne({ _id: id, organisation_id })
    .populate("client", "name company_name")
    .lean();

  if (!project) return next(httpError("Project not found", 404));

  res.status(200).json({ success: true, project });
};

const updateProject = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const project = await TSProject.findOne({ _id: id, organisation_id });
  if (!project) return next(httpError("Project not found", 404));

  const isOwner = project.owner.toString() === actor.id.toString() && project.owner_model === actor.model;
  if (!isOwner) return next(httpError("Only the project owner can update this project", 403));

  const allowedFields = [
    "name", "code", "description", "client", "billing_type",
    "fixed_cost_amount", "default_hourly_rate", "currency",
    "estimated_hours", "start_date", "end_date", "color_tag",
    "status", "visibility",
  ];

  for (const field of allowedFields) {
    if (field in req.body) project[field] = req.body[field];
  }

  await project.save();
  res.status(200).json({ success: true, message: "Project updated", project });
};

const addProjectMembers = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;
  const { member_ids } = req.body;

  if (!Array.isArray(member_ids) || !member_ids.length) {
    return next(httpError("member_ids array is required", 400));
  }

  const project = await TSProject.findOne({ _id: id, organisation_id });
  if (!project) return next(httpError("Project not found", 404));

  const isOwner = project.owner.toString() === actor.id.toString() && project.owner_model === actor.model;
  if (!isOwner) return next(httpError("Only the project owner can add members", 403));

  const reportIds = await getDirectReportIds({
    actorId: actor.id,
    actorModel: actor.model,
    organisationId: organisation_id,
  });
  const reportMap = new Map(reportIds.map((r) => [r.id.toString(), r.model]));

  for (const entry of member_ids) {
    const targetId = typeof entry === "string" ? entry : entry.id;
    const memberModel = reportMap.get(targetId?.toString());
    if (!memberModel) {
      return next(httpError(`Member ${targetId} is not your direct report`, 403));
    }
    if (!project.hasMember(targetId)) {
      project.members.push({ member: targetId, member_model: memberModel });
    }
  }

  await project.save();
  res.status(200).json({ success: true, message: "Members added", project });
};

const removeProjectMember = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id, memberId } = req.params;

  const project = await TSProject.findOne({ _id: id, organisation_id });
  if (!project) return next(httpError("Project not found", 404));

  const isOwner = project.owner.toString() === actor.id.toString() && project.owner_model === actor.model;
  if (!isOwner) return next(httpError("Only the project owner can remove members", 403));

  project.members = project.members.filter((m) => m.member.toString() !== memberId);
  await project.save();

  res.status(200).json({ success: true, message: "Member removed", project });
};

const archiveProject = async (req, res, next) => {
  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);
  const { id } = req.params;

  const project = await TSProject.findOne({ _id: id, organisation_id });
  if (!project) return next(httpError("Project not found", 404));

  const isOwner = project.owner.toString() === actor.id.toString() && project.owner_model === actor.model;
  if (!isOwner) return next(httpError("Only the project owner can archive this project", 403));

  project.status = "archived";
  await project.save();

  res.status(200).json({ success: true, message: "Project archived", project });
};

module.exports = {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  archiveProject,
};