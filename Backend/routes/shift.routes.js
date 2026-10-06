const express = require("express");
const shiftrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminDelegatedAccess = require("../middleware/auth/adminDelegatedAccess.middleware");
const torchxManagementAccess = adminDelegatedAccess("torchx_management");

const {
  createShift,
  updateShift,
  setDefaultShift,
  deleteShift,
  listShifts,
  assignShiftToUser,
  getShiftHistoryForEmployee,
  editShiftAssignment,
  deleteShiftAssignment,
} = require("../controllers/shift.controller");

holidaypolicyStyleNote: // mount this router in app.js as e.g. app.use("/admin", shiftrouter);

shiftrouter.get("/shift", torchxManagementAccess, asyncHandler(listShifts));
shiftrouter.post("/shift", torchxManagementAccess, asyncHandler(createShift));
shiftrouter.put("/shift/:id", torchxManagementAccess, asyncHandler(updateShift));
shiftrouter.patch("/shift/:id/set-default", torchxManagementAccess, asyncHandler(setDefaultShift));
shiftrouter.delete("/shift/:id", torchxManagementAccess, asyncHandler(deleteShift));

// Assign/reassign shift to an employee/manager/admin - every call adds a
// new row to that person's shift history (used for both first assign and reassign).
shiftrouter.patch("/shift/assign", torchxManagementAccess, asyncHandler(assignShiftToUser));

// History of every shift assignment/reassignment made to one person.
// e.g. GET /admin/shift/history/64f.../?role=employee
shiftrouter.get("/shift/history/:employee_id", torchxManagementAccess, asyncHandler(getShiftHistoryForEmployee));

// Edit or delete a single history entry (fix a mistaken assignment).
shiftrouter.patch("/shift/history/:historyId", torchxManagementAccess, asyncHandler(editShiftAssignment));
shiftrouter.delete("/shift/history/:historyId", torchxManagementAccess, asyncHandler(deleteShiftAssignment));

module.exports = shiftrouter;
