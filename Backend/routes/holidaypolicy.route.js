const express = require("express");
const holidaypolicyrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminDelegatedAccess = require("../middleware/auth/adminDelegatedAccess.middleware");
const torchxManagementAccess = adminDelegatedAccess("torchx_management");

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
holidaypolicyrouter.get("/policy", torchxManagementAccess, asyncHandler(getPolicy));
holidaypolicyrouter.put("/policy", torchxManagementAccess, asyncHandler(setPolicy));

// Teams that can get different rotational off-days in the same week
holidaypolicyrouter.post("/group", torchxManagementAccess, asyncHandler(createGroup));
holidaypolicyrouter.get("/group", torchxManagementAccess, asyncHandler(listGroups));
holidaypolicyrouter.post("/group/:groupId/members", torchxManagementAccess, asyncHandler(addGroupMembers));
holidaypolicyrouter.delete("/group/:groupId/members/:employee", torchxManagementAccess, asyncHandler(removeGroupMember));

// Mandatory per-week entry (optionally scoped to a group), only relevant when policy = rotational
holidaypolicyrouter.post("/week-schedule", torchxManagementAccess, asyncHandler(setWeekSchedule));
holidaypolicyrouter.post("/week-schedule/bulk", torchxManagementAccess, asyncHandler(bulkSetWeekSchedule));
holidaypolicyrouter.post("/week-schedule/month", torchxManagementAccess, asyncHandler(setWeekScheduleForMonth));
holidaypolicyrouter.get("/week-schedule", torchxManagementAccess, asyncHandler(getWeekSchedules));

// Admin-managed holiday calendar (replaces old npm date-holidays package)
holidaypolicyrouter.post("/holiday", torchxManagementAccess, asyncHandler(addHoliday));
holidaypolicyrouter.post("/holiday/bulk", torchxManagementAccess, asyncHandler(bulkAddHolidays));
holidaypolicyrouter.put("/holiday/bulk", torchxManagementAccess, asyncHandler(bulkEditHolidays));
holidaypolicyrouter.delete("/holiday/bulk", torchxManagementAccess, asyncHandler(bulkDeleteHolidays));
holidaypolicyrouter.delete("/holiday/:id", torchxManagementAccess, asyncHandler(deleteHoliday));
holidaypolicyrouter.get("/holiday", torchxManagementAccess, asyncHandler(listHolidays));

// Individual employee exception to org policy
holidaypolicyrouter.post("/override", torchxManagementAccess, asyncHandler(setEmployeeOverride));
holidaypolicyrouter.delete("/override/:employee", torchxManagementAccess, asyncHandler(removeEmployeeOverride));

// Monthly attendance + leave report (present / sl / el / week-off / holiday breakdown)
holidaypolicyrouter.get("/report", torchxManagementAccess, asyncHandler(getEmployeeMonthlyReport));

module.exports = holidaypolicyrouter;
