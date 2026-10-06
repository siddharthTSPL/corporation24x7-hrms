const express = require("express");
const overtimeRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");

const {
  applyOvertime,
  getMyOvertime,
  editMyOvertime,
  deleteMyOvertime,
  getOvertimeAccess,
  listOvertimeForReview,
  approveOvertime,
  rejectOvertime,
} = require("../controllers/overtime.controller");

// Everyone (Employee / Manager / Admin) files and tracks their own overtime.
// Reviewing is restricted inside the controller to HR admins + the SuperAdmin.
overtimeRouter.get("/access", anyRoleAuth, asyncHandler(getOvertimeAccess));
overtimeRouter.post("/apply", anyRoleAuth, asyncHandler(applyOvertime));
overtimeRouter.get("/my", anyRoleAuth, asyncHandler(getMyOvertime));
overtimeRouter.put("/my/:id", anyRoleAuth, asyncHandler(editMyOvertime));
overtimeRouter.delete("/my/:id", anyRoleAuth, asyncHandler(deleteMyOvertime));

overtimeRouter.get("/review", anyRoleAuth, asyncHandler(listOvertimeForReview));
overtimeRouter.post("/review/:id/approve", anyRoleAuth, asyncHandler(approveOvertime));
overtimeRouter.post("/review/:id/reject", anyRoleAuth, asyncHandler(rejectOvertime));

module.exports = overtimeRouter;