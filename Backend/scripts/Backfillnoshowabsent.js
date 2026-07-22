const mongoose = require("mongoose");
require("dotenv").config();
const { markNoShowAbsences } = require("../automatic/Marknoshowabsent");
const { startOfDay } = require("../automatic/weekoffcalendar");

// One-time backfill for the no-show-absent bug: AttendanceSummary was never
// incremented for days an employee simply never checked in (no Attendance
// record at all), because updateSummary() only ever ran from checkout() /
// autoCheckoutAll(), both of which require a record to already exist.
//
// Usage:
//   node scripts/backfillNoShowAbsent.js                     -> from 2026-01-01 to yesterday
//   node scripts/backfillNoShowAbsent.js 2026-06-01           -> from given date to yesterday
//   node scripts/backfillNoShowAbsent.js 2026-06-01 2026-06-30 -> explicit range (inclusive)
//
// Safe to re-run, including over overlapping ranges: markNoShowAbsences()
// now records each counted date in AttendanceSummary.noShowDates and skips
// a date it has already counted, so running this twice (or three times)
// over the same range no longer double-counts absentDays.
//
// It also now skips any date before the employee's date_of_joining
// (falling back to createdAt when date_of_joining isn't set), so it won't
// mark someone absent for days before they were onboarded.
//
// If you're fixing numbers that were already double-counted by an OLD run
// of this script (before this fix), run
// scripts/Reconcileattendancesummaryleaveaware.js --apply first — it fully
// recomputes presentDays/halfDays/absentDays from scratch (checkout records
// + a fresh no-show sweep), so it overwrites bad historical totals instead
// of adding to them.

const args = process.argv.slice(2);
const startArg = args[0] ? new Date(args[0]) : new Date("2026-01-01");
const endArg = args[1] ? new Date(args[1]) : new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

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