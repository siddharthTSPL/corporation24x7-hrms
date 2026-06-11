const express = require("express");
const router = express.Router();

const {
  createOrUpdatePermission,
  getPermissions,
  getMyPermissions,
  deletePermission,
} = require("../controllers/permission.controller");

const { verifySuperAdmin } = require("../middleware/auth/superadmin.middleware");
const { verifyAdmin } = require("../middleware/auth/admin.middleware");
const { verifyManager } = require("../middleware/auth/manager.middleware");

router.post("/assign/superadmin", verifySuperAdmin, createOrUpdatePermission);
router.post("/assign/admin", verifyAdmin, createOrUpdatePermission);

router.get("/:user_model/:user_id", verifySuperAdmin, getPermissions);
router.get("/admin/:user_model/:user_id", verifyAdmin, getPermissions);

router.get("/me/admin", verifyAdmin, getMyPermissions);
router.get("/me/manager", verifyManager, getMyPermissions);

router.delete("/superadmin/:user_model/:user_id", verifySuperAdmin, deletePermission);
router.delete("/admin/:user_model/:user_id", verifyAdmin, deletePermission);

module.exports = router;