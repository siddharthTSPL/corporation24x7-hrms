const express = require("express");
const payrollrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/adminOrSuperadmin.middleware");
const planFeatureAnyRole = require("../middleware/auth/Planfeatureanyrole.middleware");

const {
  getOrgOwner,
  setEmployeeCTC,
  reapplyPolicy,
  getSalaryStructure,
  listSalaryStructures,
  generatePayroll,
  bulkGeneratePayroll,
  listPayrolls,
  getPayslip,
  getMyPayslips,
  updatePayrollStatus,
  deletePayroll,
  bulkUpdatePayrollStatus,
  bulkDeletePayroll,
} = require("../controllers/payroll.controller");



payrollrouter.get("/org-owner", adminauthmiddleware, asyncHandler(getOrgOwner));

payrollrouter.post("/structure", adminauthmiddleware, asyncHandler(setEmployeeCTC));
payrollrouter.get("/structure", adminauthmiddleware, asyncHandler(listSalaryStructures));
payrollrouter.get("/structure/:employee", adminauthmiddleware, asyncHandler(getSalaryStructure));
payrollrouter.post("/structure/:employee/reapply-policy", adminauthmiddleware, asyncHandler(reapplyPolicy));


payrollrouter.post("/generate", adminauthmiddleware, asyncHandler(generatePayroll));
payrollrouter.post("/generate/bulk", adminauthmiddleware, asyncHandler(bulkGeneratePayroll));


payrollrouter.get("/", adminauthmiddleware, asyncHandler(listPayrolls));
payrollrouter.get("/payslip", adminauthmiddleware, asyncHandler(getPayslip));

// Self-service: logged-in Employee/Manager/Admin fetching their OWN paid
// payslips. Plan-independent by design — available on every plan (Basic
// included), unlike Review/Timesheet/Recruitment/Asset/TorchX Voice.
payrollrouter.get("/my-payslips", planFeatureAnyRole, asyncHandler(getMyPayslips));



payrollrouter.patch("/bulk/status", adminauthmiddleware, asyncHandler(bulkUpdatePayrollStatus));
payrollrouter.post("/bulk/delete", adminauthmiddleware, asyncHandler(bulkDeletePayroll));

payrollrouter.patch("/:id/status", adminauthmiddleware, asyncHandler(updatePayrollStatus));
payrollrouter.delete("/:id", adminauthmiddleware, asyncHandler(deletePayroll));

module.exports = payrollrouter;