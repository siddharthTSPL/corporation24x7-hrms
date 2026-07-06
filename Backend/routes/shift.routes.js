const express = require("express");
const shiftrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/adminOrSuperadmin.middleware");

const {
  createShift,
  updateShift,
  setDefaultShift,
  deleteShift,
  listShifts,
  assignShiftToUser,
} = require("../controllers/shift.controller");

holidaypolicyStyleNote: // mount this router in app.js as e.g. app.use("/admin", shiftrouter);

shiftrouter.get("/shift", adminauthmiddleware, asyncHandler(listShifts));
shiftrouter.post("/shift", adminauthmiddleware, asyncHandler(createShift));
shiftrouter.put("/shift/:id", adminauthmiddleware, asyncHandler(updateShift));
shiftrouter.patch("/shift/:id/set-default", adminauthmiddleware, asyncHandler(setDefaultShift));
shiftrouter.delete("/shift/:id", adminauthmiddleware, asyncHandler(deleteShift));
shiftrouter.patch("/shift/assign", adminauthmiddleware, asyncHandler(assignShiftToUser));

module.exports = shiftrouter;