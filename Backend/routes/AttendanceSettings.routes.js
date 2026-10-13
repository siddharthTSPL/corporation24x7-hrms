const express = require("express");
const router = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminDelegatedAccess = require("../middleware/auth/adminDelegatedAccess.middleware");
const torchxManagementAccess = adminDelegatedAccess("torchx_management");

const {
  getAttendanceSettings,
  updateAttendanceSettings,
} = require("../controllers/AttendanceSettings.controller");

router.get("/settings", torchxManagementAccess, asyncHandler(getAttendanceSettings));
router.patch("/settings", torchxManagementAccess, asyncHandler(updateAttendanceSettings));

module.exports = router;
