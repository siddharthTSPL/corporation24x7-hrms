const express = require("express");
const departmentrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/adminOrSuperadmin.middleware");
const { cacheRoute } = require("../middleware/cache/cache.middleware");

const {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");

// mount this router in app.js as e.g. app.use("/admin", departmentrouter);
// and app.use("/superadmin", departmentrouter); (same pattern as shift.routes.js)

// Departments change rarely (a handful of admin edits a month at most), so
// this is cached for 5 minutes per org. The three write routes below call
// invalidateOrgCache() so an edit is visible immediately instead of waiting
// out the TTL.
departmentrouter.get(
  "/department",
  adminauthmiddleware,
  cacheRoute(5 * 60_000),
  asyncHandler(listDepartments)
);
departmentrouter.post("/department", adminauthmiddleware, asyncHandler(createDepartment));
departmentrouter.put("/department/:id", adminauthmiddleware, asyncHandler(updateDepartment));
departmentrouter.delete("/department/:id", adminauthmiddleware, asyncHandler(deleteDepartment));

module.exports = departmentrouter;