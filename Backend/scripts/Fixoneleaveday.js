/**
 * Fix ONE person's attendance for ONE day that sits inside an approved leave
 * (e.g. LWP) but still shows Present. Defaults are set for Anshika Pandey
 * (admin, HR03) and "yesterday" (IST).
 *
 * Put this file in hrms/scripts/ and run from the backend root:
 *   node scripts/Fixoneleaveday.js             # DRY RUN - shows what it would do
 *   node scripts/Fixoneleaveday.js --apply     # writes the fix
 *
 * Optional flags (all have defaults):
 *   --employee=<_id>   --role=admin|manager|employee   --date=YYYY-MM-DD
 *
 * It (1) finds the approved leave covering that date, (2) corrects
 * Attendance.status for that day (full-day leave -> absent, i.e. LWP/unpaid;
 * half-day leave -> half_day; comp_off -> present), (3) rebuilds that
 * person's AttendanceSummary for the month. The History modal and Total Paid
 * Days then follow the leave.
 */
const mongoose = require("mongoose");
require("dotenv").config();

const Attendance = require("../Models/attendance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const { startOfDay } = require("../automatic/weekoffcalendar");
const { getISTDateParts, toISTKey } = require("../utils/Istdate.utils");
const { resolveLeaveDayOverride } = require("../utils/Leavelwpday.utils");
const { recomputeSummaries } = require("./Reconcileattendancesummaryleaveaware");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const opt = (n, d) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=")[1] : d;
};

const EMPLOYEE = opt("employee", "6a54dcaa9bffd9843c7a70dc"); // Anshika Pandey
const ROLE = opt("role", "admin");
const DAY = 24 * 60 * 60 * 1000;

const CFG = {
  employee: { Model: Leave, field: "employee", approved: ["approved_manager", "approved_reporting_manager", "approved_admin"] },
  manager: { Model: ManagerLeave, field: "manager", approved: ["approved_reporting_manager", "approved_admin"] },
  admin: { Model: AdminLeave, field: "admin", approved: ["approved_reporting_manager", "approved_superadmin"] },
};

(async () => {
  const cfg = CFG[ROLE];
  if (!cfg) throw new Error(`Bad --role=${ROLE}`);

  await mongoose.connect(process.env.LINK);

  // Target day: --date=YYYY-MM-DD, otherwise yesterday (IST).
  const dateArg = opt("date", null);
  const target = dateArg ? startOfDay(new Date(`${dateArg}T12:00:00+05:30`)) : startOfDay(new Date(Date.now() - DAY));
  console.log(`Person: ${EMPLOYEE} (${ROLE})  Day: ${toISTKey(target)}  Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  // 1) approved leave covering that day
  const leaves = await cfg.Model.find({
    [cfg.field]: EMPLOYEE,
    status: { $in: cfg.approved },
    startDate: { $lte: new Date(target.getTime() + DAY) },
    endDate: { $gte: new Date(target.getTime() - DAY) },
  }).lean();
  const leave = leaves.find((l) => target >= startOfDay(l.startDate) && target <= startOfDay(l.endDate));

  if (!leave) {
    console.log("No APPROVED leave covers this day for this person.");
    console.log("Leaves found near the date (check status - it must be an approved one):");
    const near = await cfg.Model.find({ [cfg.field]: EMPLOYEE }).sort({ createdAt: -1 }).limit(5)
      .select("leaveType startDate endDate status lwpDays").lean();
    near.forEach((l) => console.log(`  ${l.leaveType}  ${toISTKey(l.startDate)} -> ${toISTKey(l.endDate)}  status=${l.status}  lwpDays=${l.lwpDays}`));
    process.exit(1);
  }
  console.log(`Leave: ${leave.leaveType}  ${toISTKey(leave.startDate)} -> ${toISTKey(leave.endDate)}  status=${leave.status}  lwpDays=${leave.lwpDays || 0}`);

  // 2) correct the attendance record for that day
  const ov = resolveLeaveDayOverride(leave, target);
  const rec = await Attendance.findOne({
    employee: EMPLOYEE,
    role: ROLE,
    date: { $gte: target, $lt: new Date(target.getTime() + DAY) },
  });

  if (!rec) {
    console.log("No Attendance record for that day (nothing to correct - History already shows it as leave).");
  } else {
    let newStatus = ov.status; // absent (full-day leave) | half_day | present (comp_off)
    if (leave.leaveType.startsWith("half_day") && rec.status !== "present") newStatus = rec.status;
    console.log(`Attendance: status "${rec.status}" -> "${newStatus}"  (checkIn ${rec.checkIn || "-"}, checkOut ${rec.checkOut || "-"})`);
    if (APPLY && rec.status !== newStatus) {
      await Attendance.updateOne({ _id: rec._id }, { $set: { status: newStatus } });
      console.log("  updated.");
    }
  }

  // 3) rebuild this person's monthly summary
  const p = getISTDateParts(target);
  console.log(`\nRebuilding summary for ${p.year}-${p.month} ...`);
  await recomputeSummaries(APPLY, null, { months: [`${p.year}-${p.month}`], employeeId: EMPLOYEE, role: ROLE });

  console.log(APPLY ? "\nDone. Refresh the Attendance History modal." : "\nDry run only. Re-run with --apply to write.");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});