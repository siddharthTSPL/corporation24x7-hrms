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
    const admin = await Admin.findOne({
      _id: targetId,
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    })
      .select("_id")
      .lean();

    if (actorModel === "SuperAdmin") return !!admin;
    return false;
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

    if (actorModel === "Manager") {
      return user.Under_manager?.toString() === actorId.toString();
    }

    if (actorModel === "Admin") {
      if (!user.Under_manager) return false;
      const manager = await Manager.findOne({
        _id: user.Under_manager,
        organisation_id: organisationId,
        reporting_manager: actorId,
        reporting_manager_model: "Admin",
      }).lean();
      return !!manager;
    }

    if (actorModel === "SuperAdmin") {
      return true;
    }

    return false;
  }

  return false;
};

const assertCanAssign = async ({ actorId, actorModel, targetId, targetModel, organisationId }) => {
  const validPairs = {
    SuperAdmin: ["Admin", "Manager", "User"],
    Admin: ["Manager", "User"],
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
  const results = [];

  if (actorModel === "SuperAdmin") {
    const admins = await Admin.find({
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    })
      .select("f_name l_name work_email")
      .lean();

    admins.forEach((a) =>
      results.push({
        id: a._id,
        model: "Admin",
        name: `${a.f_name} ${a.l_name}`,
        email: a.work_email,
      })
    );

    const managers = await Manager.find({
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "terminated"] },
    })
      .select("f_name l_name work_email")
      .lean();

    managers.forEach((m) =>
      results.push({
        id: m._id,
        model: "Manager",
        name: `${m.f_name} ${m.l_name}`,
        email: m.work_email,
      })
    );

    const users = await User.find({
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    })
      .select("f_name l_name work_email")
      .lean();

    users.forEach((u) =>
      results.push({
        id: u._id,
        model: "User",
        name: `${u.f_name} ${u.l_name}`,
        email: u.work_email,
      })
    );
  }

  if (actorModel === "Admin") {
    const managers = await Manager.find({
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "Admin",
      working_status: { $nin: ["resigned", "terminated"] },
    })
      .select("f_name l_name work_email")
      .lean();

    managers.forEach((m) =>
      results.push({
        id: m._id,
        model: "Manager",
        name: `${m.f_name} ${m.l_name}`,
        email: m.work_email,
      })
    );

    const managerIds = managers.map((m) => m._id);

    if (managerIds.length) {
      const users = await User.find({
        organisation_id: organisationId,
        Under_manager: { $in: managerIds },
        working_status: { $nin: ["resigned", "fired", "terminated"] },
      })
        .select("f_name l_name work_email")
        .lean();

      users.forEach((u) =>
        results.push({
          id: u._id,
          model: "User",
          name: `${u.f_name} ${u.l_name}`,
          email: u.work_email,
        })
      );
    }
  }

  if (actorModel === "Manager") {
    const users = await User.find({
      organisation_id: organisationId,
      Under_manager: actorId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    })
      .select("f_name l_name work_email")
      .lean();

    users.forEach((u) =>
      results.push({
        id: u._id,
        model: "User",
        name: `${u.f_name} ${u.l_name}`,
        email: u.work_email,
      })
    );
  }

  return results;
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