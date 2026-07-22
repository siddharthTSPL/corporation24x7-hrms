const cron = require("node-cron");
const mongoose = require("mongoose");

const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const { classifyNonWorkingDay, startOfDay } = require("./weekoffcalendar");

// Same shape as monthattendanceupdate.js's hasApprovedLeave — kept local
// so this file has no runtime dependency on that module's internals.
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");

const ROLE_CONFIG = {
  employee: { Model: User, onModel: "User", LeaveModel: Leave, leaveField: "employee", leaveApprovedStatuses: ["approved_manager", "approved_admin"] },
  manager:  { Model: Manager, onModel: "Manager", LeaveModel: ManagerLeave, leaveField: "manager", leaveApprovedStatuses: ["approved_reporting_manager", "approved_admin"] },
  admin:    { Model: Admin, onModel: "Admin", LeaveModel: AdminLeave, leaveField: "admin", leaveApprovedStatuses: ["approved_superadmin"] },
};

/**
 * For the given (already-finished) calendar day, find every active employee
 * across all three roles who has NO Attendance record at all for that day,
 * and — if that day isn't a holiday/week-off/approved-leave day — count it
 * as an absent day in AttendanceSummary.
 *
 * This exists because AttendanceSummary is otherwise only ever incremented
 * from checkout() / autoCheckoutAll(), both of which require an Attendance
 * record to already exist (i.e. the employee checked in). A true no-show
 * (never checked in at all) was previously invisible to AttendanceSummary,
 * even though the calendar / generateMonthlyReport() correctly counted it
 * as absent from the Attendance collection's absence, not presence, of a
 * record.
 */
async function markNoShowAbsences(forDate = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const date = startOfDay(forDate);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  for (const role of Object.keys(ROLE_CONFIG)) {
    const { Model, onModel, LeaveModel, leaveField, leaveApprovedStatuses } = ROLE_CONFIG[role];

    const employees = await Model.find({ status: "active" })
      .select("_id organisation_id")
      .lean();

    for (const emp of employees) {
      // Already has a record for this day (checked in, whatever the
      // outcome) -> handled by the checkout-driven path already.
      const existing = await Attendance.findOne({
        employee: emp._id,
        role,
        date,
      }).select("_id").lean();
      if (existing) continue;

      const nonWorking = await classifyNonWorkingDay(date, emp.organisation_id, emp._id, onModel);
      if (nonWorking.type === "holiday" || nonWorking.type === "week_off" || nonWorking.type === "unconfigured") continue;

      const onLeave = await LeaveModel.findOne({
        [leaveField]: emp._id,
        status: { $in: leaveApprovedStatuses },
        startDate: { $lte: date },
        endDate: { $gte: date },
      }).select("_id").lean();
      if (onLeave) continue;

      await AttendanceSummary.findOneAndUpdate(
        { employee: emp._id, role, month, year },
        { $inc: { absentDays: 1 }, $setOnInsert: { organisation_id: emp.organisation_id } },
        { upsert: true }
      );
    }
  }
}

// Runs once a day, early morning, for "yesterday" (so the day is fully over
// and can't still turn into a late check-in / face check-in before this runs).
cron.schedule("15 1 * * *", () => {
  markNoShowAbsences().catch((err) =>
    console.error("[Cron] markNoShowAbsences failed:", err.message)
  );
});

module.exports = { markNoShowAbsences };