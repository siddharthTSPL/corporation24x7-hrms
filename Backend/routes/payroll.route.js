const express = require("express");
const payrollrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const payrollManagementAuth = require("../middleware/auth/payrollManagement.middleware");
const planFeatureAnyRole = require("../middleware/auth/Planfeatureanyrole.middleware");
const checkPermission = require("../middleware/auth/Checkpermission.middleware");

const {
  getOrgOwner,
  setEmployeeCTC,
  bulkSetEmployeeCTC,
  updateAttendanceBasis,
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



payrollrouter.get("/org-owner", payrollManagementAuth, asyncHandler(getOrgOwner));

payrollrouter.post("/structure", payrollManagementAuth, asyncHandler(setEmployeeCTC));
payrollrouter.post("/structure/bulk", payrollManagementAuth, asyncHandler(bulkSetEmployeeCTC));
payrollrouter.get("/structure", payrollManagementAuth, asyncHandler(listSalaryStructures));
payrollrouter.get("/structure/:employee", payrollManagementAuth, asyncHandler(getSalaryStructure));
payrollrouter.post("/structure/:employee/reapply-policy", payrollManagementAuth, asyncHandler(reapplyPolicy));
payrollrouter.patch("/structure/:employee/attendance-basis", payrollManagementAuth, asyncHandler(updateAttendanceBasis));


payrollrouter.post("/generate", payrollManagementAuth, asyncHandler(generatePayroll));
payrollrouter.post("/generate/bulk", payrollManagementAuth, asyncHandler(bulkGeneratePayroll));


payrollrouter.get("/", payrollManagementAuth, asyncHandler(listPayrolls));
payrollrouter.get("/payslip", payrollManagementAuth, asyncHandler(getPayslip));

// Self-service: logged-in Employee/Manager/Admin fetching their OWN paid
// payslips. Plan-independent by design — available on every plan (Basic
// included), unlike Review/Timesheet/Recruitment/Asset/TorchX Voice.
payrollrouter.get("/my-payslips", planFeatureAnyRole, checkPermission("payroll.can_view_own_payslips"), asyncHandler(getMyPayslips));



payrollrouter.patch("/bulk/status", payrollManagementAuth, asyncHandler(bulkUpdatePayrollStatus));
payrollrouter.post("/bulk/delete", payrollManagementAuth, asyncHandler(bulkDeletePayroll));

payrollrouter.patch("/:id/status", payrollManagementAuth, asyncHandler(updatePayrollStatus));
payrollrouter.delete("/:id", payrollManagementAuth, asyncHandler(deletePayroll));

module.exports = payrollrouter;
