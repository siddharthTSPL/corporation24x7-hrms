const jwt = require("jsonwebtoken");
const Usermodel = require("../../Models/user.model");
const Managermodel = require("../../Models/manager.model");
const AdminModel = require("../../Models/Admin.model");
const SuperAdminModel = require("../../Models/superadmin.model");

// Notifications (and other shared, role-agnostic endpoints) don't need four
// near-identical middlewares — every existing per-role middleware ends up
// setting req.user to the same shape, so this consolidates that lookup
// instead of duplicating admin/manager/employee/superadmin route blocks.
const ROLE_CONFIG = {
  employee: { Model: Usermodel, recipientModel: "User" },
  manager: { Model: Managermodel, recipientModel: "Manager" },
  senior_manager: { Model: Managermodel, recipientModel: "Manager" },
  official: { Model: Managermodel, recipientModel: "Manager" },
  admin: { Model: AdminModel, recipientModel: "Admin" },
  senior_admin: { Model: AdminModel, recipientModel: "Admin" },
  super_admin: { Model: SuperAdminModel, recipientModel: "SuperAdmin" },
};

const anyRoleAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) return res.status(401).json({ success: false, message: "Unauthorized: no token" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const config = ROLE_CONFIG[decoded.role];
    if (!config) return res.status(403).json({ success: false, message: "Unknown role. Access denied." });

    const rawId =
      decoded._id ||
      decoded.id ||
      decoded.userId ||
      decoded.adminid ||
      decoded.managerid ||
      decoded.superadminid ||
      null;

    if (!rawId) return res.status(401).json({ success: false, message: "Invalid token payload" });

    const account = await config.Model.findById(rawId).select("-password");
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (account.working_status && account.working_status !== "working") {
      return res.status(403).json({ success: false, message: "Your account is not active." });
    }

    const organisation_id = config.recipientModel === "SuperAdmin" ? account._id : account.organisation_id;

    req.user = account;
    req.actor = {
      id: account._id,
      role: decoded.role,
      recipientModel: config.recipientModel,
      organisation_id,
    };
    // Full decoded JWT claims, kept around so downstream handlers (e.g. the
    // companion cross-browser sign-in link) can re-sign a fresh token with
    // the exact same role-specific id field (adminid/managerid/superadminid/
    // _id) without having to know which one applies for this role.
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = anyRoleAuth;