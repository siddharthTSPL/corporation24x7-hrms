const mongoose = require("mongoose");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const { classifyNonWorkingDay, startOfDay } = require("../automatic/weekoffcalendar");
const { getISTDateParts, toISTKey } = require("../utils/Istdate.utils");
require("dotenv").config();

const APPLY = process.argv.includes("--apply");

// Leave-aware, no-show-aware, join-date-aware rebuild of AttendanceSummary.
//
// This replaces two previously separate (and previously conflicting) code
// paths:
//   1. This script's old version, which only recomputed present/half/absent
//      from CHECKED-OUT Attendance records. It $set the whole absentDays
//      field, so any employee/month with ZERO checkout records (e.g. an
//      employee who simply never checked in all month) was never touched
//      at all — their AttendanceSummary doc was left exactly as-is, bugs
//      and all. This is why an employee could show 45 absent days in a
//      22-day-old month: the no-show cron/backfill had been $inc'ing that
//      number (sometimes more than once per day, see Marknoshowabsent.js),
//      and this script never recomputed/overwrote it because it only looks
//      at checkout records.
//   2. Marknoshowabsent.js / Backfillnoshowabsent.js, which $inc absentDays
//      for no-show days. $inc is fine going forward but can't repair
//      numbers that are already wrong.
//
// This script now does BOTH in one pass and fully $sets the result, so it
// is safe to run at any time to get every employee/month back to the truth:
// presentDays/halfDays from checkout records, absentDays from checkout
// records with status "absent" PLUS every working day with no Attendance
// record at all, from the employee's date_of_joining (falling back to
// createdAt) through yesterday, excluding holidays/week-offs/approved leave.

const ROLE_CONFIG = {
  employee: { Model: User, onModel: "User", LeaveModel: Leave, leaveField: "employee" },
  manager: { Model: Manager, onModel: "Manager", LeaveModel: ManagerLeave, leaveField: "manager" },
  admin: { Model: Admin, onModel: "Admin", LeaveModel: AdminLeave, leaveField: "admin" },
};

const loadApprovedLeaveRanges = async () => {
  const map = new Map(); // "employeeId_role" -> [{start, end}]

  const addAll = (docs, empField, role) => {
    docs.forEach((d) => {
      const key = `${d[empField]}_${role}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ start: new Date(d.startDate), end: new Date(d.endDate) });
    });
  };

  const [empLeaves, mgrLeaves, adminLeaves] = await Promise.all([
    Leave.find({ status: { $in: ["approved_manager", "approved_admin"] } })
      .select("employee startDate endDate").lean(),
    ManagerLeave.find({ status: { $in: ["approved_reporting_manager", "approved_admin"] } })
      .select("manager startDate endDate").lean(),
    AdminLeave.find({ status: "approved_superadmin" })
      .select("admin startDate endDate").lean(),
  ]);

  addAll(empLeaves, "employee", "employee");
  addAll(mgrLeaves, "manager", "manager");
  addAll(adminLeaves, "admin", "admin");

  return map;
};

const isOnApprovedLeave = (leaveMap, employeeId, role, date) => {
  const ranges = leaveMap.get(`${employeeId}_${role}`);
  if (!ranges) return false;
  return ranges.some((r) => date >= r.start && date <= r.end);
};

const bucketKey = (employee, role, year, month) => `${employee}_${role}_${year}_${month}`;

const getOrCreateBucket = (buckets, employee, role, year, month, organisation_id) => {
  const key = bucketKey(employee, role, year, month);
  if (!buckets.has(key)) {
    buckets.set(key, {
      employee, role, organisation_id, year, month,
      presentDays: 0, halfDays: 0, absentDays: 0, totalWorkingMinutes: 0,
    });
  }
  return buckets.get(key);
};

const recomputeSummaries = async () => {
  const yesterday = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const [allRecords, leaveMap] = await Promise.all([
    Attendance.find({}).select("employee role date checkOut status activeMinutes organisation_id").lean(),
    loadApprovedLeaveRanges(),
  ]);

  console.log(`Found ${allRecords.length} attendance record(s) total`);
  console.log(`Loaded approved leave ranges for ${leaveMap.size} employee(s)\n`);

  const buckets = new Map();

  // A day with ANY Attendance record (checked out or not) is never a
  // no-show — it's either already counted below (checkout) or still
  // in-progress (no checkout yet, e.g. today; skipped either way here
  // since the no-show sweep only ever looks at dates up to yesterday).
  const hasAnyRecord = new Set();

  allRecords.forEach((r) => {
    hasAnyRecord.add(`${r.employee}_${r.role}_${toISTKey(r.date)}`);

    if (!r.checkOut) return; // not checked out yet — handled by no-show sweep only if it's a genuinely empty day, otherwise ignored

    const { year, month } = getISTDateParts(r.date);
    const d = startOfDay(r.date);
    const b = getOrCreateBucket(buckets, String(r.employee), r.role, year, month, r.organisation_id);
    b.totalWorkingMinutes += r.activeMinutes || 0;

    const onLeave = (r.status === "half_day" || r.status === "absent")
      ? isOnApprovedLeave(leaveMap, r.employee, r.role, d)
      : false;

    if (r.status === "present") {
      b.presentDays += 1;
    } else if (r.status === "half_day") {
      b.presentDays += 0.5;
      if (!onLeave) b.halfDays += 1;
    } else if (r.status === "absent") {
      if (!onLeave) b.absentDays += 1;
    }
  });

  // No-show sweep: for every active employee, walk every day from their
  // join date through yesterday and count genuine no-shows (no Attendance
  // record, not a holiday/week-off, not on approved leave).
  for (const role of Object.keys(ROLE_CONFIG)) {
    const { Model, onModel, leaveField } = ROLE_CONFIG[role];
    const employees = await Model.find({ status: "active" })
      .select("_id organisation_id date_of_joining createdAt")
      .lean();

    for (const emp of employees) {
      const effectiveJoinDate = emp.date_of_joining || emp.createdAt;
      if (!effectiveJoinDate) {
        console.log(`[SKIP] employee=${emp._id} role=${role}: no date_of_joining and no createdAt, cannot determine a safe start date`);
        continue;
      }

      let cursor = startOfDay(effectiveJoinDate);
      const end = yesterday;
      while (cursor <= end) {
        const key = `${emp._id}_${role}_${toISTKey(cursor)}`;
        const { year, month } = getISTDateParts(cursor);
        // Ensure a bucket exists for every month in the employee's tenure,
        // even if it ends up all zeros — this is what lets a stale/garbage
        // AttendanceSummary doc (e.g. from a pre-fix double-counted run)
        // get overwritten back to the truth instead of being left alone.
        const b = getOrCreateBucket(buckets, String(emp._id), role, year, month, emp.organisation_id);

        if (!hasAnyRecord.has(key)) {
          const nonWorking = await classifyNonWorkingDay(cursor, emp.organisation_id, emp._id, onModel);
          if (nonWorking.type !== "holiday" && nonWorking.type !== "week_off" && nonWorking.type !== "unconfigured") {
            if (!isOnApprovedLeave(leaveMap, emp._id, role, cursor)) {
              b.absentDays += 1;
            }
          }
        }

        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      }
    }
  }

  let mismatches = 0;

  for (const b of buckets.values()) {
    const existing = await AttendanceSummary.findOne({
      employee: b.employee, role: b.role, year: b.year, month: b.month,
    }).lean();

    const same = existing
      && existing.presentDays === b.presentDays
      && existing.halfDays === b.halfDays
      && existing.absentDays === b.absentDays
      && existing.totalWorkingMinutes === b.totalWorkingMinutes;

    if (!same) {
      mismatches++;
      console.log(
        `[MISMATCH] employee=${b.employee} role=${b.role} ${b.year}-${b.month}: ` +
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
              // Reset the idempotency tracker to match the freshly
              // recomputed absentDays for this month — from this point on
              // Marknoshowabsent.js's own noShowDates check takes over
              // again for any NEW no-show day going forward.
              noShowDates: [],
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
    "\nNOTE 1: LeaveBalance.lwp is NOT touched by this script. It's a cumulative " +
    "counter also debited by other flows (leave approval, sandwich-leave rules), " +
    "so it can't be safely recomputed from Attendance + Leave alone. Check it " +
    "manually per employee if you suspect it's wrong.\n" +
    "NOTE 2: Any Payroll documents already generated for the corrected months " +
    "were built from the old (wrong) absentDays/halfDays numbers and will need " +
    "to be regenerated after this script runs, or they will still reflect the " +
    "incorrect deduction.\n" +
    "NOTE 3: After this runs with --apply, Marknoshowabsent.js's noShowDates " +
    "tracking is reset to empty for every corrected month — this is expected " +
    "and correct, it just means the very next nightly cron run re-derives it " +
    "from scratch for that month's remaining days."
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