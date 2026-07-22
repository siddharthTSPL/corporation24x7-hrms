const cron = require("node-cron");
const mongoose = require("mongoose");

const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const { classifyNonWorkingDay, startOfDay } = require("./weekoffcalendar");
const { getISTDateParts } = require("../utils/Istdate.utils");

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
  // IMPORTANT: date.getMonth()/getFullYear() read the SERVER PROCESS's local
  // timezone, not IST — on a UTC host, IST midnight of the 1st is still the
  // 30th UTC, so day 1 of every month was getting filed under the previous
  // month's summary. getISTDateParts() is timezone-independent.
  const { month, year } = getISTDateParts(date);

  for (const role of Object.keys(ROLE_CONFIG)) {
    const { Model, onModel, LeaveModel, leaveField, leaveApprovedStatuses } = ROLE_CONFIG[role];

    const employees = await Model.find({ status: "active" })
      .select("_id organisation_id date_of_joining createdAt")
      .lean();

    for (const emp of employees) {
      // Never mark a no-show absence for a day before the employee actually
      // joined. date_of_joining is nullable, so fall back to createdAt
      // (record creation = effectively when they were onboarded).
      const effectiveJoinDate = emp.date_of_joining || emp.createdAt;
      if (effectiveJoinDate && date < startOfDay(effectiveJoinDate)) continue;

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

      // Idempotency: only $inc if this exact date hasn't already been
      // counted for this employee/month. Without this, re-running the cron
      // (catchUpMissedRuns) or Backfillnoshowabsent.js for an overlapping
      // range silently double/triple counts absentDays — this was the main
      // cause of employees showing more absent days than actually exist in
      // the month.
      const summary = await AttendanceSummary.findOne({ employee: emp._id, role, month, year })
        .select("noShowDates")
        .lean();
      const alreadyCounted = (summary?.noShowDates || []).some(
        (d) => startOfDay(d).getTime() === date.getTime()
      );
      if (alreadyCounted) continue;

      await AttendanceSummary.findOneAndUpdate(
        { employee: emp._id, role, month, year },
        {
          $inc: { absentDays: 1 },
          $push: { noShowDates: date },
          $setOnInsert: { organisation_id: emp.organisation_id },
        },
        { upsert: true }
      );
    }
  }
}

// Runs once a day, early morning IST, for "yesterday" (so the day is fully
// over and can't still turn into a late check-in / face check-in before this
// runs). `timezone` is explicit because node-cron otherwise reads the SERVER
// PROCESS's OS timezone — on Render (and almost every cloud host) that's
// UTC, so without this the job actually fired at 6:45 AM IST, not 1:15 AM.
cron.schedule(
  "15 1 * * *",
  () => {
    markNoShowAbsences().catch((err) =>
      console.error("[Cron] markNoShowAbsences failed:", err.message)
    );
  },
  { timezone: "Asia/Kolkata" }
);

/**
 * Safety net for the in-process cron above: if the dyno was asleep, mid
 * restart/deploy, or crashed at exactly 1:15 AM IST, that day's run is
 * silently lost (node-cron has no retry/catch-up of its own). Call this
 * once on server boot to sweep the last few days and fill in anything the
 * nightly job missed. It's safe to re-run — findOneAndUpdate + $inc only
 * ever adds a given day once, because the day is skipped the moment an
 * Attendance record exists for it, and Backfillnoshowabsent.js's comment
 * about re-run safety applies here too.
 */
async function catchUpMissedRuns(daysBack = 3) {
  for (let i = 1; i <= daysBack; i++) {
    const forDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    await markNoShowAbsences(forDate).catch((err) =>
      console.error(`[Startup catch-up] markNoShowAbsences failed for day -${i}:`, err.message)
    );
  }
}

module.exports = { markNoShowAbsences, catchUpMissedRuns };