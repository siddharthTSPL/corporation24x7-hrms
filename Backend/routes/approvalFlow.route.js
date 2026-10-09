const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminDelegatedAccess = require("../middleware/auth/adminDelegatedAccess.middleware");
const torchxManagementAccess = adminDelegatedAccess("torchx_management");
const {
  getApprovalFlows,
  saveApprovalFlow,
  resetApprovalFlow,
} = require("../controllers/approvalFlow.controller");

router.get("/", torchxManagementAccess, asyncHandler(getApprovalFlows));
router.put("/:module", torchxManagementAccess, asyncHandler(saveApprovalFlow));
router.delete("/:module", torchxManagementAccess, asyncHandler(resetApprovalFlow));

module.exports = router;
