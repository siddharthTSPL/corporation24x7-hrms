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