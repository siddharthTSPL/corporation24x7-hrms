const PermissionModel = require("../../Models/permission.model");

const checkPermission = (permissionPath) => {
  return async (req, res, next) => {
    try {
      const { _id, role, organisation_id } = req.user;

      if (role === "super_admin") return next();

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
        return res.status(403).json({ success: false, message: "Unknown role. Access denied." });
      }

      const permDoc = await PermissionModel.findOne({
        user_id: _id,
        user_model: userModel,
        organisation_id,
      });

      if (!permDoc) {
        return res.status(403).json({ success: false, message: "No permissions found for this user." });
      }

      const keys = permissionPath.split(".");
      let value = permDoc;
      for (const key of keys) {
        value = value?.[key];
      }

      if (!value) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You do not have permission: ${permissionPath}`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = checkPermission;