const anyRoleAuth = require("./Planfeatureanyrole.middleware");
const PermissionModel = require("../../Models/permission.model");

const getPermission = (doc, path) => path.split(".").reduce((value, key) => value?.[key], doc);

const ADMIN_ROLES = new Set(["super_admin", "admin", "senior_admin"]);

const adminDelegatedAccess = (permissionNames) => {
  const permissions = (Array.isArray(permissionNames) ? permissionNames : [permissionNames])
    .map((name) => name.startsWith("adminAccess.") ? name : `adminAccess.can_manage_${name}`);

  return (req, res, next) => {
    const authorize = () => {
      // SuperAdmin.organisation_id is the human-readable ORG-* code, while
      // tenant-owned records reference the SuperAdmin document ObjectId.
      // Holiday-policy handlers use req.admin for both values and audit data.
      if (req.superAdmin) {
        req.admin = {
          ...req.superAdmin.toObject(),
          organisation_id: req.superAdmin._id,
        };
        req.actorModel = "SuperAdmin";
        return next();
      }

      const role = req.user?.role || req.admin?.role || req.employee?.role;
      if (ADMIN_ROLES.has(role) || (role === "official" && req.admin) || req.superAdmin) return next();
      if (role !== "employee") {
        return res.status(403).json({ success: false, message: "Admin feature access required." });
      }

      const { _id, organisation_id } = req.user || req.employee;
      const checkPermissions = async () => {
        try {
          const permissionDoc = await PermissionModel.findOne({
            user_id: _id,
            user_model: "User",
            organisation_id,
          }).lean();
          const granted = permissions.some((path) => getPermission(permissionDoc, path) === true);
          if (!granted) {
            return res.status(403).json({
              success: false,
              message: `Access denied. Missing permission: ${permissions.join(" or ")}`,
            });
          }

          req.admin = req.employee || req.user;
          req.admin.organisation_id = req.employee?.organisation_id || req.user?.organisation_id;
          req.actorModel = "User";
          return next();
        } catch (err) {
          return next(err);
        }
      };

      // A route that serves multiple admin screens may accept any one of the
      // screen permissions; single-feature routes pass just one permission.
      checkPermissions();
    };

    if (req.user || req.admin || req.employee || req.manager || req.superAdmin) return authorize();
    return anyRoleAuth(req, res, (err) => err ? next(err) : authorize());
  };
};

module.exports = adminDelegatedAccess;
