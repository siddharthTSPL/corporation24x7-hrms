const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");
const {
  getApprovalFlows,
  saveApprovalFlow,
  resetApprovalFlow,
} = require("../controllers/approvalFlow.controller");

router.get("/", adminOrSuperAdminAuth, asyncHandler(getApprovalFlows));
router.put("/:module", adminOrSuperAdminAuth, asyncHandler(saveApprovalFlow));
router.delete("/:module", adminOrSuperAdminAuth, asyncHandler(resetApprovalFlow));

module.exports = router;