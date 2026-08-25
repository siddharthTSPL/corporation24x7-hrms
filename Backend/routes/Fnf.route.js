const express = require("express");
const fnfrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/adminOrSuperadmin.middleware");

const {
  listEligibleForFnF,
  generateFnF,
  listFnF,
  getFnFSlip,
  updateFnF,
  updateFnFStatus,
  deleteFnF,
} = require("../controllers/Fnf.controller");

fnfrouter.get("/eligible", adminauthmiddleware, asyncHandler(listEligibleForFnF));

fnfrouter.post("/generate", adminauthmiddleware, asyncHandler(generateFnF));

fnfrouter.get("/", adminauthmiddleware, asyncHandler(listFnF));
fnfrouter.get("/:id", adminauthmiddleware, asyncHandler(getFnFSlip));
fnfrouter.patch("/:id", adminauthmiddleware, asyncHandler(updateFnF));
fnfrouter.patch("/:id/status", adminauthmiddleware, asyncHandler(updateFnFStatus));
fnfrouter.delete("/:id", adminauthmiddleware, asyncHandler(deleteFnF));

module.exports = fnfrouter;