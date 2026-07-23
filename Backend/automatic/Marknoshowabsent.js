const cron = require("node-cron");
const mongoose = require("mongoose");

const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const NoShowLog = require("../Models/noshowlog.model");
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
 * as an absent day in AttendanceSummary. If it IS a holiday/week-off day,
 * count it in weekOffHolidayDays instead. A day the employee hadn't joined
 * the company by yet is skipped entirely — it isn't any of the above.
 *
 * A rotational org's "unconfigured" week (no WeeklyOffSchedule entry filled
 * in for that week) is deliberately NOT treated as a free pass here: it's
 * neither a holiday nor a week-off, so per the same rule as any other day,
 * it counts as absent unless covered by approved leave. If your org uses
 * rotational week-offs, keep those schedules filled in in advance — an
 * unfilled week will otherwise mark real off-days absent.
 *
 * This exists because AttendanceSummary is otherwise only ever incremented
 * from checkout() / autoCheckoutAll(), both of which require an Attendance
 * record to already exist (i.e. the employee checked in). A true no-show
 * (never checked in at all) was previously invisible to AttendanceSummary,
 * even though the calendar / generateMonthlyReport() correctly counted it
 * as absent from the Attendance collection's absence, not presence, of a
 * record.
 *
 * IMPORTANT — idempotency: this function gets called more than once for the
 * same date by design (the nightly cron below covers "yesterday", and
 * catchUpMissedRuns() re-sweeps the last few days on every server boot so a
 * missed nightly run isn't silently lost). A genuine no-show day NEVER
 * gains an Attendance record, so "does an Attendance record already exist"
 * can't be used to detect "have I already counted this day" — without a
 * separate guard, every re-run would $inc absentDays / weekOffHolidayDays
 * again. NoShowLog is that guard: a unique (employee, role, date) row is
 * inserted right before any $inc, and a duplicate-key error on that insert
 * means this employee/day was already processed, so it's skipped instead
 * of counted twice.
 */
async function markNoShowAbsences(forDate = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  const date = startOfDay(forDate);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  for (const role of Object.keys(ROLE_CONFIG)) {
    const { Model, onModel, LeaveModel, leaveField, leaveApprovedStatuses } = ROLE_CONFIG[role];

    const employees = await Model.find({ status: "active" })
      .select("_id organisation_id date_of_joining createdAt")
      .lean();

    for (const emp of employees) {
      // Employee wasn't with the company yet on this day — not a valid day
      // to judge attendance for, in either direction (absent, weekoff, or
      // present). Fall back to createdAt when date_of_joining was never
      // filled in, rather than treating the employee as having no start
      // date at all (which would let every past day count against them).
      const joinDate = emp.date_of_joining || emp.createdAt;
      if (joinDate && date < startOfDay(joinDate)) continue;

      // Already has a record for this day (checked in, whatever the
      // outcome) -> handled by the checkout-driven path already.
      const existing = await Attendance.findOne({
        employee: emp._id,
        role,
        date,
      }).select("_id").lean();
      if (existing) continue;

      const nonWorking = await classifyNonWorkingDay(date, emp.organisation_id, emp._id, onModel);

      // classifyNonWorkingDay returns { type: null } for an ordinary working
      // day, and also { type: "unconfigured", isOff: false } when a
      // rotational org's per-week schedule was never filled in. Both count
      // as "not a holiday, not a week-off" — only check leave for these;
      // holiday/week_off don't need it.
      const isWorkingDay = nonWorking.type !== "holiday" && nonWorking.type !== "week_off";
      const onLeave = isWorkingDay
        ? await LeaveModel.findOne({
            [leaveField]: emp._id,
            status: { $in: leaveApprovedStatuses },
            startDate: { $lte: date },
            endDate: { $gte: date },
          }).select("_id").lean()
        : null;
      if (isWorkingDay && onLeave) continue;

      // Claim this employee/day before incrementing anything. If another
      // invocation (nightly cron overlapping a startup catch-up, or two
      // catch-up sweeps racing each other) already claimed it, this throws
      // a duplicate-key error and we skip — the $inc below never runs twice
      // for the same day.
      try {
        await NoShowLog.create({ employee: emp._id, role, date });
      } catch (err) {
        if (err.code === 11000) continue; // already counted this employee/day
        throw err;
      }

      if (nonWorking.type === "holiday" || nonWorking.type === "week_off") {
        await AttendanceSummary.findOneAndUpdate(
          { employee: emp._id, role, month, year },
          { $inc: { weekOffHolidayDays: 1 }, $setOnInsert: { organisation_id: emp.organisation_id } },
          { upsert: true }
        );
        continue;
      }

      await AttendanceSummary.findOneAndUpdate(
        { employee: emp._id, role, month, year },
        { $inc: { absentDays: 1 }, $setOnInsert: { organisation_id: emp.organisation_id } },
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
 * nightly job missed.
 *
 * Safe to re-run, including on every restart: markNoShowAbsences() itself
 * is now guarded by NoShowLog, so re-processing a day it already counted
 * is a no-op rather than a double-increment.
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