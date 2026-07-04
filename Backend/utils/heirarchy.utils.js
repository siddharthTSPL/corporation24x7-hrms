const Admin = require("../Models/Admin.model");
const Manager = require("../Models/manager.model");
const User = require("../Models/user.model");

const MODEL_MAP = { Admin, Manager, User };

const httpError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ─── resolveActor / resolveOrgId ─────────────────────────────────────────────

const resolveActor = (req) => {
  if (req.superAdmin) return { id: req.superAdmin._id, model: "SuperAdmin" };
  if (req.admin)      return { id: req.admin._id,      model: "Admin" };
  if (req.manager)    return { id: req.manager._id,    model: "Manager" };
  if (req.employee)   return { id: req.employee._id,   model: "User" };
  throw httpError("Unable to resolve authenticated actor", 401);
};

const resolveOrgId = (req) => {
  if (req.superAdmin) return req.superAdmin._id;
  if (req.admin)      return req.admin.organisation_id;
  if (req.manager)    return req.manager.organisation_id;
  if (req.employee)   return req.employee.organisation_id;
  throw httpError("Unable to resolve organisation context", 401);
};

// ─── isDirectReport ──────────────────────────────────────────────────────────
// Checks whether `targetId/targetModel` is a valid direct report of `actorId/actorModel`.
// Used by assertCanAssign to gate job creation.

const isDirectReport = async ({ actorId, actorModel, targetId, targetModel, organisationId }) => {

  // SuperAdmin → Admin: any active admin in the org is a valid target
  if (actorModel === "SuperAdmin" && targetModel === "Admin") {
    const admin = await Admin.findOne({
      _id: targetId,
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    }).select("_id").lean();
    return !!admin;
  }

  // SuperAdmin → Manager: any active manager in the org
  if (actorModel === "SuperAdmin" && targetModel === "Manager") {
    const mgr = await Manager.findOne({
      _id: targetId,
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "terminated"] },
    }).select("_id").lean();
    return !!mgr;
  }

  // SuperAdmin → User: any active employee in the org
  if (actorModel === "SuperAdmin" && targetModel === "User") {
    const user = await User.findOne({
      _id: targetId,
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    }).select("_id").lean();
    return !!user;
  }

  // Admin → Manager: manager must report to this admin
  if (actorModel === "Admin" && targetModel === "Manager") {
    const mgr = await Manager.findOne({
      _id: targetId,
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "Admin",
      working_status: { $nin: ["resigned", "terminated"] },
    }).select("_id").lean();
    return !!mgr;
  }

  // Admin → User: employee's manager must report to this admin
  if (actorModel === "Admin" && targetModel === "User") {
    const user = await User.findOne({
      _id: targetId,
      organisation_id: organisationId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    }).select("Under_manager").lean();
    if (!user?.Under_manager) return false;

    const mgr = await Manager.findOne({
      _id: user.Under_manager,
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "Admin",
    }).select("_id").lean();
    return !!mgr;
  }

  // Manager → User: employee must be directly under this manager
  if (actorModel === "Manager" && targetModel === "User") {
    const user = await User.findOne({
      _id: targetId,
      organisation_id: organisationId,
      Under_manager: actorId,
      working_status: { $nin: ["resigned", "fired", "terminated"] },
    }).select("_id").lean();
    return !!user;
  }

  // Manager → Manager: target manager must report to this manager
  if (actorModel === "Manager" && targetModel === "Manager") {
    const mgr = await Manager.findOne({
      _id: targetId,
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "Manager",
      working_status: { $nin: ["resigned", "terminated"] },
    }).select("_id").lean();
    return !!mgr;
  }

  return false;
};

// ─── assertCanAssign ─────────────────────────────────────────────────────────
// Assignment rules:
//   SuperAdmin → Admin, Manager, User
//   Admin      → Manager, User
//   Manager    → User, Manager (managers who report to this manager)
// Self-assignment is allowed for Admin/Manager/User (not SuperAdmin).

const assertCanAssign = async ({ actorId, actorModel, targetId, targetModel, organisationId }) => {
  const validTargets = {
    SuperAdmin: ["Admin", "Manager", "User"],
    Admin:      ["Manager", "User"],
    Manager:    ["User", "Manager"],
  };

  if (!validTargets[actorModel]?.includes(targetModel)) {
    throw httpError(`${actorModel} cannot assign jobs to ${targetModel}`, 403);
  }

  // Self-assignment is always allowed (except SuperAdmin)
  if (actorModel !== "SuperAdmin" && actorId.toString() === targetId.toString() && actorModel === targetModel) {
    return true;
  }

  const ok = await isDirectReport({ actorId, actorModel, targetId, targetModel, organisationId });
  if (!ok) {
    throw httpError("You can only assign jobs to your direct reports", 403);
  }

  return true;
};

// ─── getDirectReportIds ───────────────────────────────────────────────────────
// Returns the list of people this actor can assign jobs to, with name/email.
// Used by the "assignable targets" dropdown endpoint.

const getDirectReportIds = async ({ actorId, actorModel, organisationId }) => {
  const results = [];

  const ACTIVE_FILTER = { $nin: ["resigned", "fired", "terminated"] };

  if (actorModel === "SuperAdmin") {
    const [admins, managers, users] = await Promise.all([
      Admin.find({ organisation_id: organisationId, working_status: ACTIVE_FILTER })
        .select("f_name l_name work_email role").lean(),
      Manager.find({ organisation_id: organisationId, working_status: ACTIVE_FILTER })
        .select("f_name l_name work_email role").lean(),
      User.find({ organisation_id: organisationId, working_status: ACTIVE_FILTER })
        .select("f_name l_name work_email role").lean(),
    ]);

    admins.forEach((a)  => results.push({ id: a._id, model: "Admin",   name: `${a.f_name} ${a.l_name}`, email: a.work_email, role: a.role || "admin" }));
    managers.forEach((m) => results.push({ id: m._id, model: "Manager", name: `${m.f_name} ${m.l_name}`, email: m.work_email, role: m.role || "manager" }));
    users.forEach((u)   => results.push({ id: u._id, model: "User",    name: `${u.f_name} ${u.l_name}`, email: u.work_email, role: u.role || "employee" }));
  }

  if (actorModel === "Admin") {
    // Managers whose reporting_manager is this admin
    const managers = await Manager.find({
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "Admin",
      working_status: ACTIVE_FILTER,
    }).select("f_name l_name work_email role _id").lean();

    managers.forEach((m) => results.push({ id: m._id, model: "Manager", name: `${m.f_name} ${m.l_name}`, email: m.work_email, role: m.role || "manager" }));

    // Employees under those managers
    if (managers.length) {
      const managerIds = managers.map((m) => m._id);
      const users = await User.find({
        organisation_id: organisationId,
        Under_manager: { $in: managerIds },
        working_status: ACTIVE_FILTER,
      }).select("f_name l_name work_email role _id").lean();

      users.forEach((u) => results.push({ id: u._id, model: "User", name: `${u.f_name} ${u.l_name}`, email: u.work_email, role: u.role || "employee" }));
    }
  }

  if (actorModel === "Manager") {
    // Employees directly under this manager
    const users = await User.find({
      organisation_id: organisationId,
      Under_manager: actorId,
      working_status: ACTIVE_FILTER,
    }).select("f_name l_name work_email role _id").lean();

    users.forEach((u) => results.push({ id: u._id, model: "User", name: `${u.f_name} ${u.l_name}`, email: u.work_email, role: u.role || "employee" }));

    // Managers who report to this manager
    const subManagers = await Manager.find({
      organisation_id: organisationId,
      reporting_manager: actorId,
      reporting_manager_model: "Manager",
      working_status: ACTIVE_FILTER,
    }).select("f_name l_name work_email role _id").lean();

    subManagers.forEach((m) => results.push({ id: m._id, model: "Manager", name: `${m.f_name} ${m.l_name}`, email: m.work_email, role: m.role || "manager" }));
  }

  return results;
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