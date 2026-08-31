const express = require("express");
const departmentrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/adminOrSuperadmin.middleware");

const {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/department.controller");

// mount this router in app.js as e.g. app.use("/admin", departmentrouter);
// and app.use("/superadmin", departmentrouter); (same pattern as shift.routes.js)

departmentrouter.get("/department", adminauthmiddleware, asyncHandler(listDepartments));
departmentrouter.post("/department", adminauthmiddleware, asyncHandler(createDepartment));
departmentrouter.put("/department/:id", adminauthmiddleware, asyncHandler(updateDepartment));
departmentrouter.delete("/department/:id", adminauthmiddleware, asyncHandler(deleteDepartment));

module.exports = departmentrouter;