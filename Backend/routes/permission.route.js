const express = require("express");
const router = express.Router();

const {
  createOrUpdatePermission,
  getPermissions,
  getMyPermissions,
  deletePermission,
} = require("../controllers/permission.controller");

const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const managermiddleware = require("../middleware/auth/manager.middleware");

// Assign Permissions
router.post(
  "/assign/superadmin",
  superAdminAuth,
  createOrUpdatePermission
);

router.post(
  "/assign/admin",
  adminauthmiddleware,
  createOrUpdatePermission
);

// Get Permissions
router.get(
  "/:user_model/:user_id",
  superAdminAuth,
  getPermissions
);

router.get(
  "/admin/:user_model/:user_id",
  adminauthmiddleware,
  getPermissions
);

// Get Logged-in User Permissions
router.get(
  "/me/admin",
  adminauthmiddleware,
  getMyPermissions
);

router.get(
  "/me/manager",
  managermiddleware,
  getMyPermissions
);

// Delete Permissions
router.delete(
  "/superadmin/:user_model/:user_id",
  superAdminAuth,
  deletePermission
);

router.delete(
  "/admin/:user_model/:user_id",
  adminauthmiddleware,
  deletePermission
);

module.exports = router;