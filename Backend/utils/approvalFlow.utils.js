const ApprovalFlow = require("../Models/approvalFlow.model");
const Admin = require("../Models/Admin.model");

// requesterRole: "Employee" | "Manager"
// Returns null when the org has no active custom flow for this module/role,
// which tells the caller to run its existing default routing untouched.
const resolveCustomRouting = async ({ organisation_id, module, requesterRole }) => {
  const flow = await ApprovalFlow.findOne({ organisation_id, module, enabled: true }).lean();
  if (!flow || flow.firstApprover !== "admin") return null;
  if (requesterRole === "Employee" && !flow.applyToEmployees) return null;
  if (requesterRole === "Manager" && !flow.applyToManagers) return null;

  // Keep only admins who still exist in this org and can log in.
  const admins = await Admin.find({
    _id: { $in: flow.admins || [] },
    organisation_id,
    working_status: "working",
  })
    .select("_id")
    .lean();
  const pool = admins.map((a) => a._id);
  if (!pool.length) return null; // misconfigured: fall back to default rather than strand requests

  return {
    pool,
    primary: pool[0],
    handlerModel: "Admin",
    status: "pending_admin",
  };
};

const isInPool = (doc, adminId) =>
  !!doc?.approverPool?.some((id) => id.toString() === adminId.toString());

// Mongo filter for "requests in this admin's queue" for models that use
// directed_to / directed_to_model (Leave, ManagerLeave).
const directedOrPooled = (adminId) => ({
  $or: [
    { directed_to: adminId, directed_to_model: "Admin" },
    { approverPool: adminId },
  ],
});

// Leave / ManagerLeave: directed_to is this admin, or admin is in the pool.
const isAdminHandler = (doc, adminId) =>
  (doc?.directed_to?.toString() === adminId.toString() && doc?.directed_to_model === "Admin") ||
  isInPool(doc, adminId);

// WFH: currentHandler is this admin, or admin is in the pool.
const isAdminHandlerCurrent = (doc, adminId) =>
  (doc?.currentHandler?.toString() === adminId.toString() && doc?.currentHandlerModel === "Admin") ||
  isInPool(doc, adminId);

module.exports = {
  resolveCustomRouting,
  isInPool,
  directedOrPooled,
  isAdminHandler,
  isAdminHandlerCurrent,
};