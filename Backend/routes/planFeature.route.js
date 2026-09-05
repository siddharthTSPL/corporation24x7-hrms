const express = require("express");
const planFeatureRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRole = require("../middleware/auth/Planfeatureanyrole.middleware");
const { getPlanFeatureAccess } = require("../controllers/planFeature.controller");

// GET /plan-features — tells the frontend whether Review, Timesheet, and
// Recruitment are unlocked for the caller's organisation, based on plan
// tier (Basic = locked, Advance/enterprise = open, trial = open).
planFeatureRouter.get("/", anyRole, asyncHandler(getPlanFeatureAccess));

module.exports = planFeatureRouter;