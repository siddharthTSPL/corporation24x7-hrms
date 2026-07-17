const express = require("express");
const payrollrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/adminOrSuperadmin.middleware");

const {
  setEmployeeCTC,
  reapplyPolicy,
  getSalaryStructure,
  listSalaryStructures,
  generatePayroll,
  bulkGeneratePayroll,
  listPayrolls,
  getPayslip,
  updatePayrollStatus,
} = require("../controllers/payroll.controller");

// Salary structure: set CTC once (auto-computes breakup from current policy),
// call again later to revise CTC (keeps history + recalculates)
payrollrouter.post("/structure", adminauthmiddleware, asyncHandler(setEmployeeCTC));
payrollrouter.get("/structure", adminauthmiddleware, asyncHandler(listSalaryStructures));
payrollrouter.get("/structure/:employee", adminauthmiddleware, asyncHandler(getSalaryStructure));
payrollrouter.post("/structure/:employee/reapply-policy", adminauthmiddleware, asyncHandler(reapplyPolicy));

// Payroll generation (pulls SalaryStructure + AttendanceSummary for the month)
payrollrouter.post("/generate", adminauthmiddleware, asyncHandler(generatePayroll));
payrollrouter.post("/generate/bulk", adminauthmiddleware, asyncHandler(bulkGeneratePayroll));

// Retrieval
payrollrouter.get("/", adminauthmiddleware, asyncHandler(listPayrolls));
payrollrouter.get("/payslip", adminauthmiddleware, asyncHandler(getPayslip));
payrollrouter.patch("/:id/status", adminauthmiddleware, asyncHandler(updatePayrollStatus));

module.exports = payrollrouter;
