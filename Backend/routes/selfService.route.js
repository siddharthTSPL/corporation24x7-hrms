const express = require("express");
const selfServiceRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const planFeatureAnyRole = require("../middleware/auth/Planfeatureanyrole.middleware");
const { getSelfServiceSummary } = require("../controllers/selfService.controller");

// Self Service Portal (Leave/Reimbursement/Documents summary) is available
// on every plan, including Basic — no restrictPlanFeature() gate here.
selfServiceRouter.get("/summary", planFeatureAnyRole, asyncHandler(getSelfServiceSummary));

module.exports = selfServiceRouter;