const mongoose = require("mongoose");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
require("dotenv").config();

const APPLY = process.argv.includes("--apply");

// AttendanceSummary is purely derived from completed (checked-out) Attendance
// records — recomputing it from scratch is always safe, unlike LeaveBalance
// (see the LWP note printed at the end).
const recomputeSummaries = async () => {
  const records = await Attendance.find({ checkOut: { $exists: true, $ne: null } }).lean();
  console.log(`Found ${records.length} completed attendance record(s)\n`);

  const buckets = new Map(); // "employee_role_year_month" -> accumulator

  records.forEach((r) => {
    const d = new Date(r.date);
    const key = `${r.employee}_${r.role}_${d.getUTCFullYear()}_${d.getUTCMonth() + 1}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        employee: r.employee, role: r.role,
        organisation_id: r.organisation_id,
        year: d.getUTCFullYear(), month: d.getUTCMonth() + 1,
        presentDays: 0, halfDays: 0, absentDays: 0, totalWorkingMinutes: 0,
      });
    }
    const b = buckets.get(key);
    b.totalWorkingMinutes += r.activeMinutes || 0;
    if (r.status === "present") b.presentDays += 1;
    else if (r.status === "half_day") { b.halfDays += 1; b.presentDays += 0.5; }
    else if (r.status === "absent") b.absentDays += 1;
  });

  let mismatches = 0;

  for (const b of buckets.values()) {
    const existing = await AttendanceSummary.findOne({
      employee: b.employee, year: b.year, month: b.month,
    }).lean();

    const same = existing
      && existing.presentDays === b.presentDays
      && existing.halfDays === b.halfDays
      && existing.absentDays === b.absentDays
      && existing.totalWorkingMinutes === b.totalWorkingMinutes;

    if (!same) {
      mismatches++;
      console.log(
        `[MISMATCH] employee=${b.employee} ${b.year}-${b.month}: ` +
        `stored={present:${existing?.presentDays ?? "-"}, half:${existing?.halfDays ?? "-"}, absent:${existing?.absentDays ?? "-"}, mins:${existing?.totalWorkingMinutes ?? "-"}} ` +
        `→ recomputed={present:${b.presentDays}, half:${b.halfDays}, absent:${b.absentDays}, mins:${b.totalWorkingMinutes}}`
      );
      if (APPLY) {
        await AttendanceSummary.findOneAndUpdate(
          { employee: b.employee, role: b.role, year: b.year, month: b.month },
          {
            $set: {
              organisation_id: b.organisation_id,
              presentDays: b.presentDays, halfDays: b.halfDays,
              absentDays: b.absentDays, totalWorkingMinutes: b.totalWorkingMinutes,
            },
          },
          { upsert: true }
        );
      }
    }
  }

  console.log(`\n${mismatches} employee-month summary(ies) ${APPLY ? "corrected" : "would be corrected"}.`);
  if (!APPLY) console.log("\nDRY RUN — nothing was changed. Re-run with --apply to actually fix AttendanceSummary.");

  console.log(
    "\nNOTE: LeaveBalance.lwp is NOT touched by this script. Unlike AttendanceSummary, " +
    "it's a cumulative counter that also gets debited by other flows, so it can't be safely " +
    "recomputed from Attendance alone. Run mergeDuplicateAttendance.js first (it logs which " +
    "deleted duplicates had a real checkout — those are the ones that may have double-counted " +
    "LWP) and adjust LeaveBalance manually per employee if needed."
  );
};

mongoose.connect(process.env.LINK)
  .then(async () => {
    await recomputeSummaries();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });