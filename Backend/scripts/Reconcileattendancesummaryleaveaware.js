const mongoose = require("mongoose");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
require("dotenv").config();

const APPLY = process.argv.includes("--apply");

// Leave-aware replacement for Reconcileattendancesummary.js.
// That script (and the pre-fix monthattendanceupdate.js) counted a day as
// absent/half_day in AttendanceSummary even when it was covered by an
// approved EL/SL/ML/PL leave, which meant Payroll (which reads
// AttendanceSummary.absentDays/halfDays directly) could dock salary on a
// day that should have been paid leave. This script recomputes
// AttendanceSummary the same corrected way updateSummary() now does:
// a day only counts as an unpaid absent/half-day if there was NO approved
// leave covering that date.

const loadApprovedLeaveRanges = async () => {
  // employee/role -> [{start, end}]
  const map = new Map();

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

const recomputeSummaries = async () => {
  const [records, leaveMap] = await Promise.all([
    Attendance.find({ checkOut: { $exists: true, $ne: null } }).lean(),
    loadApprovedLeaveRanges(),
  ]);

  console.log(`Found ${records.length} completed attendance record(s)`);
  console.log(`Loaded approved leave ranges for ${leaveMap.size} employee(s)\n`);

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
    "\nNOTE 1: LeaveBalance.lwp is NOT touched by this script. It's a cumulative " +
    "counter also debited by other flows (leave approval, sandwich-leave rules), " +
    "so it can't be safely recomputed from Attendance + Leave alone. Check it " +
    "manually per employee if you suspect it's wrong.\n" +
    "NOTE 2: Any Payroll documents already generated for the corrected months " +
    "were built from the old (wrong) absentDays/halfDays numbers and will need " +
    "to be regenerated after this script runs, or they will still reflect the " +
    "incorrect deduction."
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