const { AppError } = require("./report.errors");

/**
 * Converts what admin.middleware.js puts on req into the shape the
 * reporting service expects: { id, companyId, roles, permissions }.
 */
function getReportUser(req) {
  const u = req.admin || req.user;
  if (!u) throw new AppError(401, "Not authenticated");

  const companyId = u.organisation_id;
  if (!companyId)
    throw new AppError(403, "No organisation linked to this account");

  const role = String(u.role || "").toLowerCase();

  // admin.middleware.js already allows only admin / senior_admin / official,
  // so these roles can run every registered report for their own organisation.
  const permissions = ["admin", "senior_admin", "official"].includes(role)
    ? ["reports.*"]
    : [];

  return {
    id: String(u._id),
    companyId: String(companyId), // companyId in the service = organisation_id here
    roles: [role],
    permissions,
  };
}

module.exports = { getReportUser };
