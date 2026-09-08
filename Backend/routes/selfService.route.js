const express = require("express");
const selfServiceRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const planFeatureAnyRole = require("../middleware/auth/Planfeatureanyrole.middleware");
const { restrictPlanFeature } = require("../middleware/auth/planFeatureGate.middleware");
const { getSelfServiceSummary } = require("../controllers/selfService.controller");

const selfServicePlanGate = restrictPlanFeature("selfService");

selfServiceRouter.get("/summary", planFeatureAnyRole, selfServicePlanGate, asyncHandler(getSelfServiceSummary));

module.exports = selfServiceRouter;