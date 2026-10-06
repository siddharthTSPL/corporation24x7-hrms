const express = require("express");
const payrollpolicyrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const payrollManagementAuth = require("../middleware/auth/payrollManagement.middleware");

const {
  getPolicy,
  setPolicy,
  addAllowance,
  updateAllowance,
  removeAllowance,
  resetToStandard,
  getPaySchedule,
  setPaySchedule,
} = require("../controllers/payrollpolicy.controller");

// Org-wide payroll policy: Basic %, HRA enable+%, PF enable+%, ESI enable+%,
// Professional Tax enable+amount, TDS enable
payrollpolicyrouter.get("/policy", payrollManagementAuth, asyncHandler(getPolicy));
payrollpolicyrouter.put("/policy", payrollManagementAuth, asyncHandler(setPolicy));
payrollpolicyrouter.post("/policy/reset", payrollManagementAuth, asyncHandler(resetToStandard));

// Salary Components (Zoho-style): Earnings, Deductions, Benefits and
// Reimbursements all share these same three endpoints — pass
// category: "earning" | "deduction" | "benefit" | "reimbursement" in the
// body to place a component in the right tab. Also covers Medical,
// Conveyance, custom ones, and the balancing "Special Allowance" that soaks
// up whatever gross is left over.
payrollpolicyrouter.post("/policy/allowance", payrollManagementAuth, asyncHandler(addAllowance));
payrollpolicyrouter.put("/policy/allowance/:name", payrollManagementAuth, asyncHandler(updateAllowance));
payrollpolicyrouter.delete("/policy/allowance/:name", payrollManagementAuth, asyncHandler(removeAllowance));

// Fixed org-wide Pay Schedule — locks after the first pay run is processed
payrollpolicyrouter.get("/pay-schedule", payrollManagementAuth, asyncHandler(getPaySchedule));
payrollpolicyrouter.put("/pay-schedule", payrollManagementAuth, asyncHandler(setPaySchedule));

module.exports = payrollpolicyrouter;
