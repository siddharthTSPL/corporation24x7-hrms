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
const employeemiddleware = require("../middleware/auth/employee.middleware");

router.post("/assign/superadmin", superAdminAuth, createOrUpdatePermission);
router.post("/assign/admin", adminauthmiddleware, createOrUpdatePermission);

router.get("/:user_model/:user_id", superAdminAuth, getPermissions);
router.get("/admin/:user_model/:user_id", adminauthmiddleware, getPermissions);

router.get("/me/admin", adminauthmiddleware, getMyPermissions);
router.get("/me/manager", managermiddleware, getMyPermissions);
router.get("/me/employee", employeemiddleware, getMyPermissions);

router.delete("/superadmin/:user_model/:user_id", superAdminAuth, deletePermission);
router.delete("/admin/:user_model/:user_id", adminauthmiddleware, deletePermission);

module.exports = router;