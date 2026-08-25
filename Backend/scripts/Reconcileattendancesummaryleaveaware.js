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
const { isDateInLwpPortion, resolveLeaveDayOverride } = require("../utils/leaveLwpDay.utils");
require("dotenv").config();

const CLI_APPLY = process.argv.includes("--apply");
// --days=N restricts a run to only employees with recent activity, so you
// can quickly re-check "just the last couple of days" instead of the whole
// org/history. See the scoping block inside recomputeSummaries() for what
// "recent" means and why a scoped employee still gets their WHOLE current+
// previous month recomputed (not just N days).
const daysArg = process.argv.find((a) => a.startsWith("--days="));
const CLI_DAYS = daysArg ? parseInt(daysArg.split("=")[1], 10) : null;

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
// createdAt) through yesterday, excluding holidays/week-offs/approved PAID
// leave. weekOffHolidayDays is also recomputed here (a no-Attendance-record
// day that classifies as holiday/week_off), so this single script now
// replaces the need to separately run
// `node scripts/Backfillnoshowabsent.js --weekoff-only`.
//
// "Approved PAID leave" deliberately excludes leaveType "lwp": an approved
// LWP leave is the employee going unpaid for that day by their own choice,
// not an excused one, so those days still get recomputed as absentDays —
// matching the same rule now used by Marknoshowabsent.js and
// monthattendanceupdate.js.
//
// Additionally, even an el/sl/ml/pl leave can partially run out of balance
// mid-application - those shortfall days are recorded per-leave in
// `lwpDays` (see Models/leave.model.js) and are excluded from the excused
// range here too (isOnApprovedLeave -> isDateInLwpPortion), so they get
// recomputed as absentDays exactly like a genuine no-show day would.

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
      // lwpDays carried along so isOnApprovedLeave() can, per date, exclude
      // the LWP-shortfall portion of an otherwise-paid leave (see
      // Models/leave.model.js's `lwpDays` field comment and
      // utils/leaveLwpDay.utils.js).
      map.get(key).push({ startDate: new Date(d.startDate), endDate: new Date(d.endDate), lwpDays: d.lwpDays || 0 });
    });
  };

  // leaveType "lwp" is excluded: an approved LWP leave is an unpaid day by
  // the employee's own choice, not an excused one — it must still be
  // recomputed as absent below. Only genuinely paid leave (el/sl/ml/pl/
  // half_day_*) belongs in this "excused" range map - and even within it,
  // isOnApprovedLeave() below still filters out that leave's own lwpDays
  // shortfall days.
  const [empLeaves, mgrLeaves, adminLeaves] = await Promise.all([
    Leave.find({ status: { $in: ["approved_manager", "approved_admin"] }, leaveType: { $ne: "lwp" } })
      .select("employee startDate endDate lwpDays").lean(),
    ManagerLeave.find({ status: { $in: ["approved_reporting_manager", "approved_admin"] }, leaveType: { $ne: "lwp" } })
      .select("manager startDate endDate lwpDays").lean(),
    AdminLeave.find({ status: "approved_superadmin", leaveType: { $ne: "lwp" } })
      .select("admin startDate endDate lwpDays").lean(),
  ]);

  addAll(empLeaves, "employee", "employee");
  addAll(mgrLeaves, "manager", "manager");
  addAll(adminLeaves, "admin", "admin");

  return map;
};

const isOnApprovedLeave = (leaveMap, employeeId, role, date) => {
  const ranges = leaveMap.get(`${employeeId}_${role}`);
  if (!ranges) return false;
  return ranges.some((r) => date >= r.startDate && date <= r.endDate && !isDateInLwpPortion(r, date));
};

// Same shape as loadApprovedLeaveRanges above, but WITHOUT the
// `leaveType: { $ne: "lwp" }` filter, and keeping leaveType on each range.
// The no-record no-show sweep only ever needed to know "is this day
// excused" (paid leave only), which is what loadApprovedLeaveRanges/
// isOnApprovedLeave above still answer. But an approved LWP leave still
// needs to override a checked-in/checked-out day's status (present/half_day
// -> absent per the leave, just not "excused" from the count) - this is
// the bug this file exists to fix: a day the employee checked in and
// worked (so Attendance.status naturally computed as "present") must stop
// being counted (and stop being DISPLAYED) as present the moment ANY
// approved leave - paid or LWP - is approved for that date. See
// resolveLeaveDayOverride in utils/leaveLwpDay.utils.js for the exact rule.
const loadAllApprovedLeaveRangesWithType = async () => {
  const map = new Map(); // "employeeId_role" -> [{startDate, endDate, lwpDays, leaveType}]

  const addAll = (docs, empField, role) => {
    docs.forEach((d) => {
      const key = `${d[empField]}_${role}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        startDate: new Date(d.startDate),
        endDate: new Date(d.endDate),
        lwpDays: d.lwpDays || 0,
        leaveType: d.leaveType,
      });
    });
  };

  const [empLeaves, mgrLeaves, adminLeaves] = await Promise.all([
    Leave.find({ status: { $in: ["approved_manager", "approved_admin"] } })
      .select("employee startDate endDate lwpDays leaveType").lean(),
    ManagerLeave.find({ status: { $in: ["approved_reporting_manager", "approved_admin"] } })
      .select("manager startDate endDate lwpDays leaveType").lean(),
    AdminLeave.find({ status: "approved_superadmin" })
      .select("admin startDate endDate lwpDays leaveType").lean(),
  ]);

  addAll(empLeaves, "employee", "employee");
  addAll(mgrLeaves, "manager", "manager");
  addAll(adminLeaves, "admin", "admin");

  return map;
};

// Finds the approved leave (any type, including lwp) covering `date` for
// this employee, if any, and returns resolveLeaveDayOverride's verdict for
// it. Returns null when no leave covers the date - callers fall back to
// the raw checkin/checkout-based Attendance.status in that case.
const leaveOverrideForDate = (allLeaveMap, employeeId, role, date) => {
  const ranges = allLeaveMap.get(`${employeeId}_${role}`);
  if (!ranges) return null;
  const leave = ranges.find((r) => date >= r.startDate && date <= r.endDate);
  if (!leave) return null;
  return resolveLeaveDayOverride(leave, date);
};

const bucketKey = (employee, role, year, month) => `${employee}_${role}_${year}_${month}`;

const getOrCreateBucket = (buckets, employee, role, year, month, organisation_id) => {
  const key = bucketKey(employee, role, year, month);
  if (!buckets.has(key)) {
    buckets.set(key, {
      employee, role, organisation_id, year, month,
      presentDays: 0, halfDays: 0, absentDays: 0, weekOffHolidayDays: 0, totalWorkingMinutes: 0,
    });
  }
  return buckets.get(key);
};

const recomputeSummaries = async (apply = CLI_APPLY, sinceDays = CLI_DAYS) => {
  const yesterday = startOfDay(new Date(Date.now() - 24 * 60 * 60 * 1000));

  // Scoping for --days=N: find employees who either (a) had a checkout in
  // the last N days, or (b) had a leave APPROVED in the last N days (its
  // startDate could be much older - this is exactly the "leave approved
  // late" case this whole file exists to fix, so it must count as "recent
  // activity" even if the leave's own dates aren't recent). Everyone else
  // is left completely untouched by this run. A scoped employee still gets
  // their whole current + previous IST month recomputed, never just the N
  // days - AttendanceSummary is a monthly bucket and is always $set in
  // full, so recomputing from a partial slice of the month would wipe out
  // the rest of that month's already-correct numbers.
  let scopeEmployeeRoles = null;
  let scopeMonths = null;

  if (sinceDays) {
    const sinceDate = startOfDay(new Date(Date.now() - (sinceDays - 1) * 24 * 60 * 60 * 1000));
    const [recentAttendance, recentEmpLeaves, recentMgrLeaves, recentAdminLeaves] = await Promise.all([
      Attendance.find({ date: { $gte: sinceDate }, checkOut: { $exists: true } }).select("employee role").lean(),
      Leave.find({ status: { $in: ["approved_manager", "approved_admin"] }, approvedAt: { $gte: sinceDate } }).select("employee").lean(),
      ManagerLeave.find({ status: { $in: ["approved_reporting_manager", "approved_admin"] }, approvedAt: { $gte: sinceDate } }).select("manager").lean(),
      AdminLeave.find({ status: "approved_superadmin", approvedAt: { $gte: sinceDate } }).select("admin").lean(),
    ]);

    scopeEmployeeRoles = new Set();
    recentAttendance.forEach((r) => scopeEmployeeRoles.add(`${r.employee}_${r.role}`));
    recentEmpLeaves.forEach((l) => scopeEmployeeRoles.add(`${l.employee}_employee`));
    recentMgrLeaves.forEach((l) => scopeEmployeeRoles.add(`${l.manager}_manager`));
    recentAdminLeaves.forEach((l) => scopeEmployeeRoles.add(`${l.admin}_admin`));

    const now = new Date();
    const thisMonth = getISTDateParts(now);
    const prevMonth = getISTDateParts(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    scopeMonths = new Set([`${thisMonth.year}-${thisMonth.month}`, `${prevMonth.year}-${prevMonth.month}`]);

    console.log(
      `--days=${sinceDays}: scoped to ${scopeEmployeeRoles.size} employee(s) with activity ` +
      `since ${sinceDate.toISOString().slice(0, 10)}, months ${[...scopeMonths].join(", ")}\n`
    );
  }

  const [allRecords, leaveMap, allLeaveMap] = await Promise.all([
    Attendance.find({}).select("employee role date checkOut status activeMinutes organisation_id source").lean(),
    loadApprovedLeaveRanges(),
    loadAllApprovedLeaveRangesWithType(),
  ]);

  console.log(`Found ${allRecords.length} attendance record(s) total`);
  console.log(`Loaded approved leave ranges for ${leaveMap.size} employee(s)\n`);

  const buckets = new Map();

  // A day with ANY REAL Attendance record (manual/face check-in, or
  // anything that got checked out) is never a no-show. A pure
  // source:"agent" stub that never got checked out is deliberately
  // excluded here - it's a background ping, not real attendance (see the
  // matching fix + comment in Marknoshowabsent.js and the activity()
  // weekoff/holiday guard in attendance.controller.js). Without this
  // exclusion, such a stub would make this script think the day is
  // "handled" and skip it in the no-show sweep below, permanently hiding
  // it from weekOffHolidayDays/absentDays.
  const hasAnyRecord = new Set();

  // Attendance._id -> corrected status, collected below whenever an
  // approved leave overrides what checkin/checkout produced. Applied as a
  // bulk update at the end (only when apply=true) so the raw Attendance
  // record itself - not just the aggregated AttendanceSummary - reflects
  // the leave everywhere it's read directly (e.g. the admin "Attendance
  // History" modal, which shows Attendance.status as-is with no leave
  // awareness of its own).
  const statusCorrections = [];

  allRecords.forEach((r) => {
    if (scopeEmployeeRoles && !scopeEmployeeRoles.has(`${r.employee}_${r.role}`)) return;

    if (r.checkOut || r.source !== "agent") {
      hasAnyRecord.add(`${r.employee}_${r.role}_${toISTKey(r.date)}`);
    }

    if (!r.checkOut) return; // not checked out yet — handled by no-show sweep only if it's a genuinely empty day, otherwise ignored

    const { year, month } = getISTDateParts(r.date);
    if (scopeMonths && !scopeMonths.has(`${year}-${month}`)) return;

    const d = startOfDay(r.date);
    const b = getOrCreateBucket(buckets, String(r.employee), r.role, year, month, r.organisation_id);
    b.totalWorkingMinutes += r.activeMinutes || 0;

    // An approved leave (paid OR lwp) ALWAYS wins over whatever
    // checkin/checkout worked out to, including "present" - someone who
    // checked in, worked, and got auto-checked-out as present on a day a
    // leave later got approved for must stop counting (and stop showing)
    // as present. See resolveLeaveDayOverride for the exact rule; this is
    // the fix for the "leave approved after checkout still shows Present"
    // bug.
    const override = leaveOverrideForDate(allLeaveMap, r.employee, r.role, d);

    if (override) {
      if (r.status !== override.status) {
        statusCorrections.push({ _id: r._id, status: override.status });
      }
      if (override.status === "half_day") {
        b.presentDays += 0.5;
        if (!override.isPaidForThisDate) b.halfDays += 1;
      } else if (!override.isPaidForThisDate) {
        b.absentDays += 1;
      }
      return;
    }

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
    // See the matching note in Marknoshowabsent.js: `status` is a login/
    // logout session flag, not an employment flag — working_status is the
    // field that actually tells us if this person is still employed.
    const scopedIds = scopeEmployeeRoles
      ? [...scopeEmployeeRoles].filter((k) => k.endsWith(`_${role}`)).map((k) => k.slice(0, -(`_${role}`.length)))
      : null;
    if (scopeEmployeeRoles && scopedIds.length === 0) continue; // no scoped employee of this role - skip the sweep entirely

    const employees = await Model.find({
      working_status: "working",
      ...(scopedIds ? { _id: { $in: scopedIds } } : {}),
    })
      .select("_id organisation_id date_of_joining createdAt")
      .lean();

    for (const emp of employees) {
      const effectiveJoinDate = emp.date_of_joining || emp.createdAt;
      if (!effectiveJoinDate) {
        console.log(`[SKIP] employee=${emp._id} role=${role}: no date_of_joining and no createdAt, cannot determine a safe start date`);
        continue;
      }

      // When scoped (--days=N), only walk the current + previous IST month
      // instead of the employee's entire tenure - the point of scoping is
      // to make this run fast, and full-history no-show sweeping is the
      // expensive part.
      let cursor = scopeMonths
        ? (() => {
            const now = new Date();
            const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
            const join = startOfDay(effectiveJoinDate);
            return join > start ? join : start;
          })()
        : startOfDay(effectiveJoinDate);
      const end = yesterday;
      while (cursor <= end) {
        const key = `${emp._id}_${role}_${toISTKey(cursor)}`;
        const { year, month } = getISTDateParts(cursor);
        if (scopeMonths && !scopeMonths.has(`${year}-${month}`)) {
          cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
          continue;
        }
        // Ensure a bucket exists for every month in the employee's tenure,
        // even if it ends up all zeros — this is what lets a stale/garbage
        // AttendanceSummary doc (e.g. from a pre-fix double-counted run)
        // get overwritten back to the truth instead of being left alone.
        const b = getOrCreateBucket(buckets, String(emp._id), role, year, month, emp.organisation_id);

        if (!hasAnyRecord.has(key)) {
          const nonWorking = await classifyNonWorkingDay(cursor, emp.organisation_id, emp._id, onModel);
          if (nonWorking.type === "holiday" || nonWorking.type === "week_off") {
            // Matches Marknoshowabsent.js: a holiday/week-off with no
            // Attendance record always counts here, regardless of leave —
            // an employee doesn't need to "apply leave" for their own
            // week-off or a company holiday.
            b.weekOffHolidayDays += 1;
          } else if (nonWorking.type !== "unconfigured") {
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
      && existing.weekOffHolidayDays === b.weekOffHolidayDays
      && existing.totalWorkingMinutes === b.totalWorkingMinutes;

    if (!same) {
      mismatches++;
      console.log(
        `[MISMATCH] employee=${b.employee} role=${b.role} ${b.year}-${b.month}: ` +
        `stored={present:${existing?.presentDays ?? "-"}, half:${existing?.halfDays ?? "-"}, absent:${existing?.absentDays ?? "-"}, weekOffHoliday:${existing?.weekOffHolidayDays ?? "-"}, mins:${existing?.totalWorkingMinutes ?? "-"}} ` +
        `→ recomputed={present:${b.presentDays}, half:${b.halfDays}, absent:${b.absentDays}, weekOffHoliday:${b.weekOffHolidayDays}, mins:${b.totalWorkingMinutes}}`
      );
      if (apply) {
        await AttendanceSummary.findOneAndUpdate(
          { employee: b.employee, role: b.role, year: b.year, month: b.month },
          {
            $set: {
              organisation_id: b.organisation_id,
              presentDays: b.presentDays, halfDays: b.halfDays,
              absentDays: b.absentDays, weekOffHolidayDays: b.weekOffHolidayDays,
              totalWorkingMinutes: b.totalWorkingMinutes,
            },
          },
          { upsert: true }
        );
      }
    }
  }

  console.log(`\n${mismatches} employee-month summary(ies) ${apply ? "corrected" : "would be corrected"}.`);

  // Fix the raw Attendance records themselves, not just the aggregated
  // AttendanceSummary - anywhere that reads Attendance.status directly
  // (e.g. the admin "Attendance History" modal / getAttendanceHistory)
  // would otherwise keep showing "Present"/"Half Day" for a day an
  // approved leave now covers, even after the summary numbers above are
  // corrected.
  console.log(
    `\n${statusCorrections.length} attendance record(s) ${apply ? "corrected" : "would be corrected"} ` +
    `to match an approved leave (present/half_day/absent overridden by the leave's own type).`
  );
  if (apply && statusCorrections.length) {
    await Attendance.bulkWrite(
      statusCorrections.map((c) => ({
        updateOne: { filter: { _id: c._id }, update: { $set: { status: c.status } } },
      })),
      { ordered: false }
    );
  }

  if (!apply) console.log("\nDRY RUN — nothing was changed. Re-run with --apply to actually fix AttendanceSummary.");

  console.log(
    "\nNOTE 1: LeaveBalance.lwp is NOT touched by this script. It's a cumulative " +
    "counter also debited by other flows (leave approval, sandwich-leave rules), " +
    "so it can't be safely recomputed from Attendance + Leave alone. Check it " +
    "manually per employee if you suspect it's wrong.\n" +
    "NOTE 2: Any Payroll documents already generated for the corrected months " +
    "were built from the old (wrong) absentDays/halfDays/weekOffHolidayDays " +
    "numbers and will need to be regenerated after this script runs, or they " +
    "will still reflect the incorrect deduction.\n" +
    "NOTE 3: absentDays now also counts days covered ONLY by an approved LWP " +
    "leave (leaveType 'lwp') — those are unpaid days by the employee's own " +
    "choice, not excused ones, so they show as absent here even though " +
    "LeaveBalance.lwp for them was already charged once at approval time.\n" +
    "NOTE 4: This script's writes don't touch the NoShowLog collection, so " +
    "Marknoshowabsent.js's own per-day idempotency tracking is untouched and " +
    "the next nightly cron run continues normally for new days going forward.\n" +
    "NOTE 5: A leave approved AFTER the employee already checked in/out for " +
    "that day (e.g. approved the next morning) only gets picked up here on " +
    "the next run of this script - it runs nightly via automatic/Nightlyreconcile.js " +
    "(2 AM IST), so correction shows up within ~24h, same as absentDays/halfDays " +
    "always have."
  );
};

module.exports = { recomputeSummaries };

// Only run as a standalone script (`node scripts/Reconcileattendancesummaryleaveaware.js`)
// when required directly - not when imported by automatic/nightlyReconcile.js, which
// reuses recomputeSummaries() inside the already-connected main server process.
if (require.main === module) {
  mongoose.connect(process.env.LINK)
    .then(async () => {
      await recomputeSummaries();
      process.exit(0);
    })
    .catch((err) => {
      console.error("DB connection failed:", err.message);
      process.exit(1);
    });
}