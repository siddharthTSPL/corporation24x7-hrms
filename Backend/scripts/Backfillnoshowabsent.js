const mongoose = require("mongoose");
require("dotenv").config();
const { markNoShowAbsences } = require("../automatic/Marknoshowabsent");
const { classifyNonWorkingDay, startOfDay } = require("../automatic/weekoffcalendar");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");

// One-time backfill for the no-show-absent bug: AttendanceSummary was never
// incremented for days an employee simply never checked in (no Attendance
// record at all), because updateSummary() only ever ran from checkout() /
// autoCheckoutAll(), both of which require a record to already exist.
//
// Usage (default mode — no-show absentDays):
//   node scripts/Backfillnoshowabsent.js                     -> from 2026-01-01 to yesterday
//   node scripts/Backfillnoshowabsent.js 2026-06-01           -> from given date to yesterday
//   node scripts/Backfillnoshowabsent.js 2026-06-01 2026-06-30 -> explicit range (inclusive)
//
// Safe to re-run: markNoShowAbsences() only $inc's a day once it confirms
// there's no existing Attendance record for that employee/day, so running
// this twice for the same range WILL double count. Do not re-run over a
// range you've already backfilled unless you first re-run
// Reconcileattendancesummaryleaveaware.js --apply (which rebuilds the
// checkout-driven portion from scratch) right before this script, so the
// two together produce a clean, correct total rather than adding on top of
// a previous backfill.
//
// Usage (--weekoff-only mode — added when weekOffHolidayDays was introduced,
// for fixing AttendanceSummary docs that were already backfilled under the
// default mode above and so can't safely go through it again):
//   node scripts/Backfillnoshowabsent.js --weekoff-only
//   node scripts/Backfillnoshowabsent.js --weekoff-only 2026-06-01 2026-06-30
//
// This mode ONLY touches weekOffHolidayDays, and does so as an absolute
// recount per employee/month ($set, not $inc) rather than day-by-day
// incrementing — so unlike the default mode, it is always safe to re-run,
// including over a range the default mode already processed. It never
// reads or writes presentDays/halfDays/absentDays.

const ROLE_CONFIG = {
  employee: { Model: User, onModel: "User" },
  manager: { Model: Manager, onModel: "Manager" },
  admin: { Model: Admin, onModel: "Admin" },
};

const args = process.argv.slice(2);
const WEEKOFF_ONLY = args.includes("--weekoff-only");
const dateArgs = args.filter((a) => !a.startsWith("--"));
const startArg = dateArgs[0] ? new Date(dateArgs[0]) : new Date("2026-01-01");
const endArg = dateArgs[1] ? new Date(dateArgs[1]) : new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

/**
 * Recomputes weekOffHolidayDays only, from scratch, for every employee/month
 * bucket touched by the given range. For each day in range: if the employee
 * already has an Attendance record for that day (they worked it, holiday or
 * not), it's skipped — that day is already correctly reflected as present/
 * half/absent elsewhere. Otherwise, if the day classifies as "holiday" or
 * "week_off" (never "unconfigured" — that's genuinely unknown, not a
 * weekoff/holiday), it counts toward that employee/month's total.
 */
const runWeekoffOnly = async (start, end) => {
  const counts = new Map(); // "employee_role_year_month" -> count
  const orgByEmp = new Map();

  for (const role of Object.keys(ROLE_CONFIG)) {
    const { Model, onModel } = ROLE_CONFIG[role];
    const employees = await Model.find({}).select("_id organisation_id date_of_joining createdAt").lean();

    for (const emp of employees) {
      orgByEmp.set(String(emp._id), emp.organisation_id);
      const joinDate = emp.date_of_joining || emp.createdAt;

      let cursor = new Date(start);
      while (cursor <= end) {
        const date = startOfDay(cursor);

        // Employee hadn't joined yet — this day isn't theirs to count,
        // weekoff/holiday or otherwise. Falls back to createdAt when
        // date_of_joining was never filled in.
        if (joinDate && date < startOfDay(joinDate)) {
          cursor = new Date(cursor.getTime() + 86400000);
          continue;
        }

        const existing = await Attendance.findOne({ employee: emp._id, role, date })
          .select("_id")
          .lean();

        if (!existing) {
          const nonWorking = await classifyNonWorkingDay(date, emp.organisation_id, emp._id, onModel);
          if (nonWorking.type === "holiday" || nonWorking.type === "week_off") {
            const key = `${emp._id}_${role}_${date.getFullYear()}_${date.getMonth() + 1}`;
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        }

        cursor = new Date(cursor.getTime() + 86400000);
      }
    }
  }

  console.log(`Recomputed weekOffHolidayDays for ${counts.size} employee-month bucket(s).\n`);

  for (const [key, count] of counts.entries()) {
    const [employee, role, year, month] = key.split("_");
    await AttendanceSummary.findOneAndUpdate(
      { employee, role, year: Number(year), month: Number(month) },
      { $set: { weekOffHolidayDays: count }, $setOnInsert: { organisation_id: orgByEmp.get(employee) } },
      { upsert: true }
    );
  }

  console.log(`Done. weekOffHolidayDays set for ${counts.size} employee-month bucket(s).`);
};

const run = async () => {
  const start = startOfDay(startArg);
  const end = startOfDay(endArg);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    console.error("Invalid date(s) passed. Use YYYY-MM-DD format.");
    process.exit(1);
  }
  if (start > end) {
    console.error("Start date is after end date.");
    process.exit(1);
  }

  if (WEEKOFF_ONLY) {
    console.log(
      `Backfilling weekOffHolidayDays ONLY (presentDays/halfDays/absentDays untouched) ` +
      `from ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}...\n`
    );
    await runWeekoffOnly(start, end);
    return;
  }

  const totalDays = Math.round((end - start) / 86400000) + 1;
  console.log(`Backfilling no-show absences from ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)} (${totalDays} day(s))...\n`);

  let cursor = new Date(start);
  let processed = 0;
  while (cursor <= end) {
    process.stdout.write(`\r  processing ${cursor.toISOString().slice(0, 10)}  (${++processed}/${totalDays})`);
    await markNoShowAbsences(new Date(cursor));
    cursor = new Date(cursor.getTime() + 86400000);
  }

  console.log("\n\nDone. Recommended next steps:");
  console.log("  1. Spot-check a few employees' AttendanceSummary docs against their calendar view.");
  console.log("  2. Regenerate any Payroll documents for the backfilled months (they were built from the old, incomplete absentDays).");
};

mongoose.connect(process.env.LINK)
  .then(async () => {
    await run();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });