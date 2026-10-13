const PermissionModel = require("../../Models/permission.model");

const checkPermission = (permissionPath) => {
  return async (req, res, next) => {
    try {
      const user =
        req.user ||
        req.admin ||
        req.manager ||
        req.employee ||
        req.superAdmin;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Super Admin bypass
      if (req.superAdmin || user.role === "super_admin") {
        return next();
      }

      const { _id, role, organisation_id } = user;

      const modelMap = {
        admin: "Admin",
        senior_admin: "Admin",
        official: "Admin",
        manager: "Manager",
        senior_manager: "Manager",
        employee: "User",
      };

      const userModel = modelMap[role];

      if (!userModel) {
        return res.status(403).json({
          success: false,
          message: "Unknown role. Access denied.",
        });
      }

      const permDoc = await PermissionModel.findOne({
        user_id: _id,
        user_model: userModel,
        organisation_id,
      });

      if (!permDoc) {
        if ([
          "leave.can_apply_leave",
          "reimbursement.can_submit_claim",
          "timesheet.can_access",
          "review.can_access",
          "navigation.can_view_dashboard",
          "navigation.can_view_self_service",
          "navigation.can_view_organisation",
          "navigation.can_view_settings",
          "navigation.can_view_policies",
          "navigation.can_view_training",
          "navigation.can_view_field_operations",
          "payroll.can_view_own_payslips",
        ].includes(permissionPath)) {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: "No permissions found.",
        });
      }

      const keys = permissionPath.split(".");
      let value = permDoc;

      for (const key of keys) {
        value = value?.[key];
      }

      // These permissions were added after existing records had been created.
      // Keep legacy accounts enabled unless an administrator explicitly turns
      // the new permission off.
      if (value === undefined && [
        "leave.can_apply_leave",
        "reimbursement.can_submit_claim",
        "timesheet.can_access",
        "review.can_access",
        "navigation.can_view_dashboard",
        "navigation.can_view_self_service",
        "navigation.can_view_organisation",
        "navigation.can_view_settings",
        "navigation.can_view_policies",
        "navigation.can_view_training",
        "navigation.can_view_field_operations",
        "payroll.can_view_own_payslips",
      ].includes(permissionPath)) {
        return next();
      }

      if (!value) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Missing permission: ${permissionPath}`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = checkPermission;
