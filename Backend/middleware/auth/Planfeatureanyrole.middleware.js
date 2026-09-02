const jwt = require("jsonwebtoken");
const superAdminAuth = require("./superadmin.middleware");
const adminAuth = require("./admin.middleware");
const managerAuth = require("./manager.middleware");
const employeeAuth = require("./employee.middleware");

// Accepts any authenticated role (SuperAdmin / Admin / Manager / Employee)
// and delegates to that role's own auth middleware so req.superAdmin /
// req.admin / req.manager / req.employee (and req.user) get populated the
// same way they would on a role-specific route.
//
// NOTE: this is intentionally a separate file from the existing
// Anyrole.middleware.js (capital A) — that one sets req.user/req.actor
// only, for the notifications-style "role-agnostic" endpoints. This one
// mirrors timesheet.route.js's original inline role-detector and sets the
// same req.superAdmin/req.admin/req.manager/req.employee shape that
// planFeatureGate.middleware.js and the rest of the app expect. Keep both;
// don't merge them — on case-insensitive filesystems watch out for the
// filename similarity.
const planFeatureAnyRole = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (decoded.role === "super_admin") return superAdminAuth(req, res, next);
  if (decoded.role === "official") {
    if (decoded.managerid) return managerAuth(req, res, next);
    if (decoded.adminid) return adminAuth(req, res, next);
  }
  if (["admin", "senior_admin"].includes(decoded.role))
    return adminAuth(req, res, next);
  if (["manager", "senior_manager"].includes(decoded.role))
    return managerAuth(req, res, next);
  if (decoded.role === "employee") return employeeAuth(req, res, next);

  return res.status(403).json({ message: "Access denied" });
};

module.exports = planFeatureAnyRole;