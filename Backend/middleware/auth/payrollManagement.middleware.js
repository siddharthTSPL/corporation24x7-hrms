const anyRoleAuth = require("./Planfeatureanyrole.middleware");
const checkPermission = require("./Checkpermission.middleware");

const payrollManagement = checkPermission("payroll.can_manage_payroll");

// Admins and SuperAdmins retain their existing payroll access. Employees and
// managers need payroll.can_manage_payroll granted by their organisation Admin.
const payrollManagementAuth = (req, res, next) => {
  anyRoleAuth(req, res, (err) => {
    if (err) return next(err);

    const role = req.user?.role || req.admin?.role || req.employee?.role || req.manager?.role;
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

    if (role !== "employee" && role !== "manager") {
      return res.status(403).json({ success: false, message: "Payroll management access required." });
    }

    payrollManagement(req, res, (permissionError) => {
      if (permissionError) return next(permissionError);
      if (res.headersSent) return;

      // Existing payroll controllers scope every query through req.admin's
      // organisation_id. Reuse that shape for the explicitly authorised user.
      req.admin = role === "manager" ? (req.manager || req.user) : (req.employee || req.user);
      req.actorModel = role === "manager" ? "Manager" : "User";
      return next();
    });
  });
};

module.exports = payrollManagementAuth;
