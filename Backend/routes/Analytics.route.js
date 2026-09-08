const express = require("express");
const analyticsRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");
const { cacheRoute } = require("../middleware/cache/cache.middleware");
const { getAnalyticsSummary } = require("../controllers/Analytics.controller");

// GET /admin/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// GET /superadmin/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Same controller for both — adminOrSuperAdminAuth normalizes req.admin.organisation_id
// for either role, and every model here is already scoped by organisation_id.
//
// This runs several full-collection Mongo aggregations per request, so it's
// cached in-memory for 60s per (org, from, to) combination. No explicit
// invalidation: this summary is fed by attendance/leave/payroll/review/ticket/
// asset writes scattered across the whole app, so there's no single place to
// hook an invalidation call. A 60s-stale dashboard is an acceptable trade for
// not re-running ~10 aggregation pipelines on every tab focus.
analyticsRouter.get(
  "/summary",
  adminOrSuperAdminAuth,
  cacheRoute(60_000),
  asyncHandler(getAnalyticsSummary)
);

module.exports = analyticsRouter;