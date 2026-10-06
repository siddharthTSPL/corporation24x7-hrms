const anyRoleAuth = require("./Planfeatureanyrole.middleware");
const checkPermission = require("./Checkpermission.middleware");

const payrollManagement = checkPermission("payroll.can_manage_payroll");

// Admins and SuperAdmins retain their existing payroll access. An employee
// can use the organisation-wide payroll APIs only after an Admin explicitly
// grants payroll.can_manage_payroll. Managers remain excluded.
const payrollManagementAuth = (req, res, next) => {
  anyRoleAuth(req, res, (err) => {
    if (err) return next(err);

    const role = req.user?.role || req.admin?.role || req.employee?.role;
    if (role === "super_admin") {
      // Payroll controllers use req.admin.organisation_id for tenant scope.
      // A SuperAdmin's organisation_id is the ORG-* display code, so use the
      // SuperAdmin document's ObjectId for payroll records instead.
      req.admin = {
        ...req.user.toObject(),
        organisation_id: req.user._id,
      };
      req.actorModel = "SuperAdmin";
      return next();
    }

    if (["admin", "senior_admin"].includes(role) || (role === "official" && req.admin)) {
      return next();
    }

    if (role !== "employee") {
      return res.status(403).json({ success: false, message: "Payroll management access required." });
    }

    payrollManagement(req, res, (permissionError) => {
      if (permissionError) return next(permissionError);
      if (res.headersSent) return;

      // Existing payroll controllers scope every query through req.admin's
      // organisation_id. Reuse that shape for the explicitly authorised user.
      req.admin = req.employee || req.user;
      req.admin.organisation_id = req.employee?.organisation_id || req.user?.organisation_id;
      req.actorModel = "User";
      return next();
    });
  });
};

module.exports = payrollManagementAuth;
