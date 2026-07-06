const express = require("express");
const holidaypolicyrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");

const {
  getPolicy,
  setPolicy,
  setWeekSchedule,
  bulkSetWeekSchedule,
  setWeekScheduleForMonth,
  getWeekSchedules,
  createGroup,
  addGroupMembers,
  removeGroupMember,
  listGroups,
  addHoliday,
  bulkAddHolidays,
  bulkEditHolidays,
  bulkDeleteHolidays,
  deleteHoliday,
  listHolidays,
  setEmployeeOverride,
  removeEmployeeOverride,
  getEmployeeMonthlyReport,
} = require("../controllers/holidaypolicy.controller");

// Org-wide weekoff mode: sunday / sat_sun / rotational
holidaypolicyrouter.get("/policy", adminauthmiddleware, asyncHandler(getPolicy));
holidaypolicyrouter.put("/policy", adminauthmiddleware, asyncHandler(setPolicy));

// Teams that can get different rotational off-days in the same week
holidaypolicyrouter.post("/group", adminauthmiddleware, asyncHandler(createGroup));
holidaypolicyrouter.get("/group", adminauthmiddleware, asyncHandler(listGroups));
holidaypolicyrouter.post("/group/:groupId/members", adminauthmiddleware, asyncHandler(addGroupMembers));
holidaypolicyrouter.delete("/group/:groupId/members/:employee", adminauthmiddleware, asyncHandler(removeGroupMember));

// Mandatory per-week entry (optionally scoped to a group), only relevant when policy = rotational
holidaypolicyrouter.post("/week-schedule", adminauthmiddleware, asyncHandler(setWeekSchedule));
holidaypolicyrouter.post("/week-schedule/bulk", adminauthmiddleware, asyncHandler(bulkSetWeekSchedule));
holidaypolicyrouter.post("/week-schedule/month", adminauthmiddleware, asyncHandler(setWeekScheduleForMonth));
holidaypolicyrouter.get("/week-schedule", adminauthmiddleware, asyncHandler(getWeekSchedules));

// Admin-managed holiday calendar (replaces old npm date-holidays package)
holidaypolicyrouter.post("/holiday", adminauthmiddleware, asyncHandler(addHoliday));
holidaypolicyrouter.post("/holiday/bulk", adminauthmiddleware, asyncHandler(bulkAddHolidays));
holidaypolicyrouter.put("/holiday/bulk", adminauthmiddleware, asyncHandler(bulkEditHolidays));
holidaypolicyrouter.delete("/holiday/bulk", adminauthmiddleware, asyncHandler(bulkDeleteHolidays));
holidaypolicyrouter.delete("/holiday/:id", adminauthmiddleware, asyncHandler(deleteHoliday));
holidaypolicyrouter.get("/holiday", adminauthmiddleware, asyncHandler(listHolidays));

// Individual employee exception to org policy
holidaypolicyrouter.post("/override", adminauthmiddleware, asyncHandler(setEmployeeOverride));
holidaypolicyrouter.delete("/override/:employee", adminauthmiddleware, asyncHandler(removeEmployeeOverride));

// Monthly attendance + leave report (present / sl / el / week-off / holiday breakdown)
holidaypolicyrouter.get("/report", adminauthmiddleware, asyncHandler(getEmployeeMonthlyReport));

module.exports = holidaypolicyrouter;
