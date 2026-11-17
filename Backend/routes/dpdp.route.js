const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const c = require("../controllers/dpdp.controller");

// everyone signed in
router.get("/status", anyRoleAuth, asyncHandler(c.getStatus));
router.post("/pin/verify", anyRoleAuth, asyncHandler(c.verifyPin));
router.post("/pin/lock", anyRoleAuth, asyncHandler(c.lock));
router.get("/consent/me", anyRoleAuth, asyncHandler(c.getMyConsent));
router.post("/consent/me", anyRoleAuth, asyncHandler(c.saveMyConsent));
router.get("/requests/me", anyRoleAuth, asyncHandler(c.myRequests));
router.post("/requests", anyRoleAuth, asyncHandler(c.createRequest));
router.get("/me/export", anyRoleAuth, asyncHandler(c.exportMyData));

// super admin only
router.get("/admin/settings", superAdminAuth, asyncHandler(c.adminGetSettings));
router.put("/admin/settings", superAdminAuth, asyncHandler(c.adminUpdateSettings));
router.post("/admin/pin", superAdminAuth, asyncHandler(c.adminSetPin));
router.get("/admin/access-log", superAdminAuth, asyncHandler(c.adminAccessLog));
router.get("/admin/requests", superAdminAuth, asyncHandler(c.adminListRequests));
router.patch("/admin/requests/:id", superAdminAuth, asyncHandler(c.adminUpdateRequest));

module.exports = router;
