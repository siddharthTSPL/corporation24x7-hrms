const express = require("express");
const fnfrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const payrollManagementAuth = require("../middleware/auth/payrollManagement.middleware");

const {
  listEligibleForFnF,
  generateFnF,
  listFnF,
  getFnFSlip,
  updateFnF,
  updateFnFStatus,
  deleteFnF,
} = require("../controllers/Fnf.controller");

fnfrouter.get("/eligible", payrollManagementAuth, asyncHandler(listEligibleForFnF));

fnfrouter.post("/generate", payrollManagementAuth, asyncHandler(generateFnF));

fnfrouter.get("/", payrollManagementAuth, asyncHandler(listFnF));
fnfrouter.get("/:id", payrollManagementAuth, asyncHandler(getFnFSlip));
fnfrouter.patch("/:id", payrollManagementAuth, asyncHandler(updateFnF));
fnfrouter.patch("/:id/status", payrollManagementAuth, asyncHandler(updateFnFStatus));
fnfrouter.delete("/:id", payrollManagementAuth, asyncHandler(deleteFnF));

module.exports = fnfrouter;
