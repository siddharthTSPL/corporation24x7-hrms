const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");

const {
  getAttendanceSettings,
  updateAttendanceSettings,
} = require("../controllers/AttendanceSettings.controller");

router.get("/settings", adminOrSuperAdminAuth, asyncHandler(getAttendanceSettings));
router.patch("/settings", adminOrSuperAdminAuth, asyncHandler(updateAttendanceSettings));

module.exports = router;