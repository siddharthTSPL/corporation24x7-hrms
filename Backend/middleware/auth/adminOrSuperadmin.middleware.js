const jwt = require("jsonwebtoken");
const AdminModel = require("../../Models/Admin.model");
const SuperAdminModel = require("../../Models/superadmin.model");

/**
 * Lets a request through if it carries a valid Admin token OR a valid
 * SuperAdmin token. Used for routes (shift, holiday policy) that a
 * SuperAdmin should be able to manage directly, in addition to Admins.
 *
 * Downstream controllers only ever read req.admin._id / req.admin.organisation_id,
 * so when the caller is a SuperAdmin we shim req.admin to look the same shape,
 * using the SuperAdmin's own _id as organisation_id — this matches how
 * organisation_id is assigned to Admins/Managers/Users everywhere else
 * (see superadmin.controller.js, e.g. `organisation_id = req.superAdmin._id`).
 *
 * req.actorModel is also set to "Admin" or "SuperAdmin" so controllers that
 * write createdBy/updatedBy/setBy audit fields can store the correct model name.
 */
const adminOrSuperAdminAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "super_admin") {
      const superAdmin = await SuperAdminModel.findById(decoded.superadminid).select("-password");

      if (!superAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (superAdmin.status === "suspended") {
        return res.status(403).json({ message: "Your account has been suspended" });
      }

      if (!superAdmin.isVerified) {
        return res.status(403).json({ message: "Please verify your email first" });
      }

      // Shim so existing admin-only controller code keeps working unchanged.
      superAdmin.organisation_id = superAdmin._id;

      req.superAdmin = superAdmin;
      req.admin = superAdmin;
      req.user = superAdmin;
      req.actorModel = "SuperAdmin";
      return next();
    }

    const adminRoles = ["admin", "senior_admin", "official"];
    if (!decoded.role || !adminRoles.includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const admin = await AdminModel.findById(decoded.adminid).select("-password");

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!admin.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    if (admin.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    // Intentionally not checking admin.status === "inactive" here —
    // see admin.middleware.js for why. working_status is the source of
    // truth for login eligibility, checked at login time.

    req.admin = admin;
    req.user = admin;
    req.actorModel = "Admin";
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminOrSuperAdminAuth;