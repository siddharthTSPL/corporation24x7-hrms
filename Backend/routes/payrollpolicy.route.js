const express = require("express");
const payrollpolicyrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/adminOrSuperadmin.middleware");

const {
  getPolicy,
  setPolicy,
  addAllowance,
  updateAllowance,
  removeAllowance,
  resetToStandard,
} = require("../controllers/payrollpolicy.controller");

// Org-wide payroll policy: Basic %, HRA enable+%, PF enable+%, ESI enable+%,
// Professional Tax enable+amount, TDS enable
payrollpolicyrouter.get("/policy", adminauthmiddleware, asyncHandler(getPolicy));
payrollpolicyrouter.put("/policy", adminauthmiddleware, asyncHandler(setPolicy));
payrollpolicyrouter.post("/policy/reset", adminauthmiddleware, asyncHandler(resetToStandard));

// Allowance line items (Medical, Conveyance, custom ones, and the balancing
// "Special Allowance" that soaks up whatever gross is left over)
payrollpolicyrouter.post("/policy/allowance", adminauthmiddleware, asyncHandler(addAllowance));
payrollpolicyrouter.put("/policy/allowance/:name", adminauthmiddleware, asyncHandler(updateAllowance));
payrollpolicyrouter.delete("/policy/allowance/:name", adminauthmiddleware, asyncHandler(removeAllowance));

module.exports = payrollpolicyrouter;
