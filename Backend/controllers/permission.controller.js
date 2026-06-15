const PermissionModel = require("../Models/permission.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");

const resolveModel = (role) => {
  if (["admin", "senior_admin", "official"].includes(role)) return "Admin";
  if (["manager", "senior_manager"].includes(role)) return "Manager";
  if (role === "employee") return "User";
  return null;
};

const flattenPermissions = (permissions, prefix = "") => {
  const result = {};
  for (const [key, value] of Object.entries(permissions)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenPermissions(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
};

const createOrUpdatePermission = async (req, res, next) => {
  try {
    const { _id: granted_by, role: granterRole, organisation_id } = req.user;
    const { user_id, user_model, permissions } = req.body;

    if (!user_id || !user_model || !permissions) {
      return res.status(400).json({
        success: false,
        message: "user_id, user_model and permissions are required.",
      });
    }

    const isSuperAdmin = granterRole === "super_admin";
    const isAdmin = ["admin", "senior_admin", "official"].includes(granterRole);

    if (isSuperAdmin && user_model !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "SuperAdmin can only assign permissions to Admins.",
      });
    }

    if (isAdmin && !["Manager", "User"].includes(user_model)) {
      return res.status(403).json({
        success: false,
        message: "Admin can only assign permissions to Managers or Employees.",
      });
    }

    const modelMap = { Admin: AdminModel, Manager: Managermodel, User: Usermodel };
    const TargetModel = modelMap[user_model];
    if (!TargetModel) {
      return res.status(400).json({ success: false, message: "Invalid user_model." });
    }

    const targetUser = await TargetModel.findOne({ _id: user_id, organisation_id });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    const granted_by_model = isSuperAdmin ? "SuperAdmin" : "Admin";

    const updated = await PermissionModel.findOneAndUpdate(
      { user_id, user_model, organisation_id },
      {
        $set: {
          granted_by,
          granted_by_model,
          ...flattenPermissions(permissions),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Permissions saved successfully.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const getPermissions = async (req, res, next) => {
  try {
    const { user_id, user_model } = req.params;
    const { organisation_id } = req.user;

    const permDoc = await PermissionModel.findOne({ user_id, user_model, organisation_id });

    if (!permDoc) {
      return res.status(404).json({
        success: false,
        message: "No permissions found for this user.",
      });
    }

    return res.status(200).json({ success: true, data: permDoc });
  } catch (err) {
    next(err);
  }
};

const getMyPermissions = async (req, res, next) => {
  try {
    const { _id, role, organisation_id } = req.user;
    const user_model = resolveModel(role);

    if (!user_model) {
      return res.status(400).json({ success: false, message: "Cannot resolve model for this role." });
    }

    const permDoc = await PermissionModel.findOne({ user_id: _id, user_model, organisation_id });

    return res.status(200).json({ success: true, data: permDoc || null });
  } catch (err) {
    next(err);
  }
};

const deletePermission = async (req, res, next) => {
  try {
    const { user_id, user_model } = req.params;
    const { organisation_id } = req.user;

    await PermissionModel.findOneAndDelete({ user_id, user_model, organisation_id });

    return res.status(200).json({ success: true, message: "Permissions removed." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrUpdatePermission,
  getPermissions,
  getMyPermissions,
  deletePermission,
};