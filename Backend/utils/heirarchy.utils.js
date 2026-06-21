const Admin = require("../Models/Admin.model");
const Manager = require("../Models/manager.model");
const User = require("../Models/user.model");

const MODEL_MAP = {
  Admin,
  Manager,
  User,
};

const httpError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const isDirectReport = async ({ actorId, actorModel, targetId, targetModel, organisationId }) => {
  if (targetModel === "Admin") {
    const admin = await Admin.findOne({ _id: targetId, organisation_id: organisationId })
      .select("reporting_manager reporting_manager_model")
      .lean();
    if (!admin) return false;
    return (
      actorModel === "SuperAdmin" &&
      admin.reporting_manager_model === "SuperAdmin" &&
      admin.reporting_manager?.toString() === actorId.toString()
    );
  }

  if (targetModel === "Manager") {
    const manager = await Manager.findOne({ _id: targetId, organisation_id: organisationId })
      .select("reporting_manager reporting_manager_model")
      .lean();
    if (!manager) return false;
    if (!manager.reporting_manager || !manager.reporting_manager_model) return false;
    return (
      manager.reporting_manager_model === actorModel &&
      manager.reporting_manager.toString() === actorId.toString()
    );
  }

  if (targetModel === "User") {
    const user = await User.findOne({ _id: targetId, organisation_id: organisationId })
      .select("Under_manager")
      .lean();
    if (!user) return false;
    return (
      actorModel === "Manager" &&
      user.Under_manager?.toString() === actorId.toString()
    );
  }

  return false;
};

const assertCanAssign = async ({ actorId, actorModel, targetId, targetModel, organisationId }) => {
  const validPairs = {
    SuperAdmin: ["Admin"],
    Admin: ["Manager"],
    Manager: ["Manager", "User"],
  };

  if (!validPairs[actorModel]?.includes(targetModel)) {
    throw httpError(
      `${actorModel} cannot assign jobs to ${targetModel}`,
      403
    );
  }

  const sameActor = actorModel === targetModel && actorId.toString() === targetId.toString();
  if (sameActor) return true;

  const directReport = await isDirectReport({
    actorId,
    actorModel,
    targetId,
    targetModel,
    organisationId,
  });

  if (!directReport) {
    throw httpError(
      "You can only assign jobs to your direct reports or yourself",
      403
    );
  }

  return true;
};

const resolveActor = (req) => {
  if (req.superAdmin) return { id: req.superAdmin._id, model: "SuperAdmin" };
  if (req.admin) return { id: req.admin._id, model: "Admin" };
  if (req.manager) return { id: req.manager._id, model: "Manager" };
  if (req.employee) return { id: req.employee._id, model: "User" };
  throw httpError("Unable to resolve authenticated actor", 401);
};

const getDirectReportIds = async ({ actorId, actorModel, organisationId }) => {
  if (actorModel === "SuperAdmin") {
    const admins = await Admin.find({
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "SuperAdmin",
    })
      .select("_id")
      .lean();
    return admins.map((a) => ({ id: a._id, model: "Admin" }));
  }

  if (actorModel === "Admin") {
    const managers = await Manager.find({
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "Admin",
    })
      .select("_id")
      .lean();
    return managers.map((m) => ({ id: m._id, model: "Manager" }));
  }

  if (actorModel === "Manager") {
    const [managers, users] = await Promise.all([
      Manager.find({
        organisation_id: organisationId,
        reporting_manager: actorId,
        reporting_manager_model: "Manager",
      })
        .select("_id")
        .lean(),
      User.find({
        organisation_id: organisationId,
        Under_manager: actorId,
      })
        .select("_id")
        .lean(),
    ]);
    return [
      ...managers.map((m) => ({ id: m._id, model: "Manager" })),
      ...users.map((u) => ({ id: u._id, model: "User" })),
    ];
  }

  return [];
};

const resolveOrgId = (req) => {
  if (req.superAdmin) return req.superAdmin._id;
  if (req.admin) return req.admin.organisation_id;
  if (req.manager) return req.manager.organisation_id;
  if (req.employee) return req.employee.organisation_id;
  throw httpError("Unable to resolve organisation context", 401);
};

module.exports = {
  MODEL_MAP,
  httpError,
  isDirectReport,
  assertCanAssign,
  resolveActor,
  resolveOrgId,
  getDirectReportIds,
};