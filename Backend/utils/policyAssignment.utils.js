const Policy = require("../Models/policy.model");
const PolicyAcknowledgement = require("../Models/policyAcknowledgement.model");

// Maps a decoded-JWT role string to the coarse "role group" used on
// Policy.assignment.roles. Mirrors ROLE_CONFIG in Anyrole.middleware.js.
const roleGroupFromRole = (role) => {
  if (["employee"].includes(role)) return "employee";
  if (["manager", "senior_manager"].includes(role)) return "manager";
  if (["admin", "senior_admin", "official"].includes(role)) return "admin";
  if (role === "super_admin") return "super_admin";
  return null;
};

const modelFromRoleGroup = (roleGroup) => {
  if (roleGroup === "employee") return "User";
  if (roleGroup === "manager") return "Manager";
  if (roleGroup === "admin") return "Admin";
  if (roleGroup === "super_admin") return "SuperAdmin";
  return null;
};

/**
 * Builds a normalized actor shape from whichever role-specific auth
 * middleware ran earlier on the request (req.employee / req.manager /
 * req.admin / req.superAdmin), or from req.actor if Anyrole.middleware.js
 * was used instead. Returns null if no recognizable identity is present.
 */
const buildActorFromReq = (req) => {
  if (req.actor && req.actor.id) {
    return {
      id: req.actor.id,
      model: req.actor.recipientModel,
      roleGroup: roleGroupFromRole(req.actor.role) || null,
      organisation_id: req.actor.organisation_id,
      department: req.user?.department || null,
      office_location: req.user?.office_location || null,
      name: req.user ? `${req.user.f_name || ""} ${req.user.l_name || ""}`.trim() : "",
      empid: req.user?.empid || "",
    };
  }

  const account = req.employee || req.manager || req.admin || req.superAdmin;
  if (!account) return null;

  const model = req.employee
    ? "User"
    : req.manager
    ? "Manager"
    : req.admin && !req.superAdmin
    ? "Admin"
    : req.superAdmin
    ? "SuperAdmin"
    : null;

  const roleGroup = req.employee
    ? "employee"
    : req.manager
    ? "manager"
    : model === "SuperAdmin"
    ? "super_admin"
    : model === "Admin"
    ? "admin"
    : null;

  if (!model || !roleGroup) return null;

  return {
    id: account._id,
    model,
    roleGroup,
    organisation_id: account.organisation_id || account._id, // SuperAdmin is its own org
    department: account.department || null,
    office_location: account.office_location || null,
    name: `${account.f_name || ""} ${account.l_name || ""}`.trim() || account.organisation_name || "",
    empid: account.empid || "",
  };
};

const norm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : s);

/**
 * Does this policy's assignment rule apply to this actor?
 */
const resolveAssignmentMatch = (policy, actor) => {
  const assignment = policy.assignment || {};
  const roles = assignment.roles && assignment.roles.length ? assignment.roles : ["employee", "manager", "admin"];

  if (!roles.includes(actor.roleGroup)) return false;

  switch (assignment.type) {
    case "EMPLOYEE":
      return (assignment.employees || []).some(
        (e) => String(e.id) === String(actor.id) && e.model === actor.model
      );
    case "DEPARTMENT":
      if (!actor.department) return false;
      return (assignment.departments || []).some((d) => norm(d) === norm(actor.department));
    case "LOCATION":
      if (!actor.office_location) return false;
      return (assignment.locations || []).some((l) => norm(l) === norm(actor.office_location));
    case "ALL":
    default:
      return true;
  }
};

/**
 * All PUBLISHED policies (any priority) whose assignment rules currently
 * match this actor, within their organisation.
 */
const getApplicablePublishedPolicies = async (organisation_id, actor) => {
  const policies = await Policy.find({ organisation_id, status: "published" })
    .populate("currentVersion")
    .sort({ publishedAt: -1 })
    .lean();

  return policies.filter((p) => p.currentVersion && resolveAssignmentMatch(p, actor));
};

/**
 * Finds (or lazily creates) the PolicyAcknowledgement row for this actor +
 * policy version. This is what makes new joiners / department transfers /
 * newly published versions "just work" without a bulk-assignment job.
 */
const ensureAcknowledgementRecord = async (policy, actor) => {
  const versionId = policy.currentVersion?._id || policy.currentVersion;
  if (!versionId) return null;

  const existing = await PolicyAcknowledgement.findOne({
    policyVersionId: versionId,
    employee: actor.id,
    employeeModel: actor.model,
  });
  if (existing) return existing;

  try {
    return await PolicyAcknowledgement.create({
      organisation_id: policy.organisation_id,
      policyId: policy._id,
      policyVersionId: versionId,
      employee: actor.id,
      employeeModel: actor.model,
      status: "PENDING",
      employeeSnapshot: {
        name: actor.name || "",
        empid: actor.empid || "",
        department: actor.department || "",
      },
    });
  } catch (err) {
    // Unique-index race (two parallel requests creating the same row) —
    // just re-fetch instead of failing the caller.
    if (err.code === 11000) {
      return PolicyAcknowledgement.findOne({
        policyVersionId: versionId,
        employee: actor.id,
        employeeModel: actor.model,
      });
    }
    throw err;
  }
};

/**
 * Every policy applicable to this actor, each paired with (freshly
 * ensured) acknowledgement status. Used for both the "My Policies" list
 * and the access-gate check.
 */
const getPolicyStatusListForActor = async (actor) => {
  const policies = await getApplicablePublishedPolicies(actor.organisation_id, actor);

  const results = [];
  for (const policy of policies) {
    const ack = await ensureAcknowledgementRecord(policy, actor);
    results.push({ policy, acknowledgement: ack });
  }
  return results;
};

/**
 * Just the pending policies — the
 * set that should block access until cleared.
 */
const getPendingMandatoryPolicies = async (actor) => {
  const list = await getPolicyStatusListForActor(actor);
  return list.filter(
    (entry) =>
      entry.acknowledgement &&
      entry.acknowledgement.status !== "ACKNOWLEDGED"
  );
};

module.exports = {
  roleGroupFromRole,
  modelFromRoleGroup,
  buildActorFromReq,
  resolveAssignmentMatch,
  getApplicablePublishedPolicies,
  ensureAcknowledgementRecord,
  getPolicyStatusListForActor,
  getPendingMandatoryPolicies,
};