const express = require("express");
const analyticsRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");
const { getAnalyticsSummary } = require("../controllers/Analytics.controller");

// GET /admin/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// GET /superadmin/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Same controller for both — adminOrSuperAdminAuth normalizes req.admin.organisation_id
// for either role, and every model here is already scoped by organisation_id.
analyticsRouter.get("/summary", adminOrSuperAdminAuth, asyncHandler(getAnalyticsSummary));

module.exports = analyticsRouter;