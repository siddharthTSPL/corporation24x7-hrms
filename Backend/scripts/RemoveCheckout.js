// Removes a check-out that was done by mistake, so the person is "checked in, not yet checked out"
// again (they can check out properly later, or the normal auto check-out closes the day).
//
// What a check-out changes, and what this script reverses (mirrors controllers/attendance.controller.js
// checkout() + automatic/monthattendanceupdate.js updateSummary()):
//   1. Attendance      : checkOut, status, checkoutRemark, overtimeMinutes   -> checkOut removed, status back to
//                        the pre-checkout default "absent", remark cleared, overtime 0
//   2. AttendanceSummary: presentDays / halfDays / absentDays / totalWorkingMinutes -> reversed
//   3. LeaveBalance.lwp: the automatic LWP debit for half-day / absent          -> reversed
// A backup of the original attendance document is saved first
// (collection: attendance_backup_before_remove_checkout).
//
// TODAY ONLY (IST). There is no date argument, so an old day can never be touched by mistake.
// By default it targets Baibhav (ENG05); pass another employee _id to override.
//
// Usage:
//   dry run : node scripts/RemoveCheckout.js
//   apply   : node scripts/RemoveCheckout.js --apply
//   other employee (today only): node scripts/RemoveCheckout.js <employeeId> [--apply]
//
// Works from the backend root (node scripts/...) and from inside scripts/.
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const { isDateInLwpPortion } = require("../utils/Leavelwpday.utils");
const { startOfISTDay, getISTDateParts, toISTKey } = require("../utils/Istdate.utils");

const APPLY = process.argv.includes("--apply");
const DEFAULT_EMPLOYEE_ID = "6a4f817eaefa81a0f12f7543"; // Baibhav Kumar (ENG05)
const [argEmployeeId] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const employeeId = argEmployeeId || DEFAULT_EMPLOYEE_ID;

// Same logic as hasApprovedLeave() in automatic/monthattendanceupdate.js (not exported there)
const hasApprovedLeave = async (empId, date, role, { excludeLwp = false } = {}) => {
  const checkDate = new Date(date);
  const id = new mongoose.Types.ObjectId(String(empId));
  const f = excludeLwp ? { leaveType: { $ne: "lwp" } } : {};
  const sel = "_id startDate endDate lwpDays";
  let leave;
  if (role === "manager") {
    leave = await ManagerLeave.findOne({
      manager: id, status: { $in: ["approved_reporting_manager", "approved_admin"] },
      startDate: { $lte: checkDate }, endDate: { $gte: checkDate }, ...f,
    }).select(sel).lean();
  } else if (role === "admin") {
    leave = await AdminLeave.findOne({
      admin: id, status: { $in: ["approved_reporting_manager", "approved_superadmin"] },
      startDate: { $lte: checkDate }, endDate: { $gte: checkDate }, ...f,
    }).select(sel).lean();
  } else {
    leave = await Leave.findOne({
      employee: id, status: { $in: ["approved_manager", "approved_reporting_manager", "approved_admin"] },
      startDate: { $lte: checkDate }, endDate: { $gte: checkDate }, ...f,
    }).select(sel).lean();
  }
  if (!leave) return false;
  if (excludeLwp && isDateInLwpPortion(leave, checkDate)) return false;
  return true;
};

const brief = (a) => ({
  _id: String(a._id),
  date: toISTKey(a.date),
  role: a.role,
  source: a.source,
  checkIn: a.checkIn,
  checkOut: a.checkOut || null,
  status: a.status,
  checkoutRemark: a.checkoutRemark || null,
  overtimeMinutes: a.overtimeMinutes || 0,
  activeMinutes: Math.round(a.activeMinutes || 0),
  autoCheckedOut: !!a.autoCheckedOut,
});

const summaryBrief = (s) =>
  s ? { presentDays: s.presentDays, halfDays: s.halfDays, absentDays: s.absentDays, totalWorkingMinutes: s.totalWorkingMinutes } : null;

const run = async () => {
  if (!employeeId || !mongoose.isValidObjectId(employeeId)) return console.log("Usage: see top of file");

  console.log("Database:", mongoose.connection.name, APPLY ? "(APPLY mode)" : "(dry run - nothing will be changed)");

  const dayStart = startOfISTDay(new Date()); // today, IST midnight (how attendance.date is stored)
  console.log("Day (IST):", toISTKey(dayStart), "- today only");

  const a = await Attendance.findOne({ employee: employeeId, date: dayStart }).lean();
  if (!a) return console.log("No attendance record for this employee for today. Nothing done.");

  console.log("Before (attendance):", brief(a));

  // ---- safety checks ----
  if (!a.checkOut) return console.log("This record has no check-out. Nothing to remove.");
  if (!["manual", "face"].includes(a.source))
    return console.log(`source is "${a.source}" - field-duty / biometric / agent check-outs have extra logic (sessions, punches). Not handled by this script. Nothing done.`);
  if (a.checkoutRemark === "missed_checkout")
    return console.log('checkoutRemark is "missed_checkout": the half day was already counted by the nightly job, so this check-out never touched the summary. Not the simple case. Nothing done.');

  // ---- work out the reversal (inverse of updateSummary) ----
  const isUnpaidCandidate = a.status === "half_day" || a.status === "absent";
  const [onPaidLeave, onAnyLeave] = isUnpaidCandidate
    ? await Promise.all([
        hasApprovedLeave(a.employee, a.date, a.role, { excludeLwp: true }),
        hasApprovedLeave(a.employee, a.date, a.role),
      ])
    : [false, false];

  const inc = { totalWorkingMinutes: -(a.activeMinutes || 0) };
  let lwpBack = 0;
  if (a.status === "present") {
    inc.presentDays = -1;
  } else if (a.status === "half_day") {
    inc.presentDays = -0.5;
    if (!onPaidLeave) inc.halfDays = -1;
    if (!onAnyLeave) lwpBack = 0.5;
  } else if (a.status === "absent") {
    if (!onPaidLeave) inc.absentDays = -1;
    if (!onAnyLeave) lwpBack = 1;
  }

  const { month, year } = getISTDateParts(a.date);
  const sumFilter = { employee: a.employee, role: a.role, month, year };
  const sumBefore = await AttendanceSummary.findOne(sumFilter).lean();

  console.log("\nPlan:");
  console.log("  attendance : remove checkOut, status", a.status, '-> "absent" (pre-checkout default), clear remark/overtime');
  console.log("  summary    :", `${month}/${year}`, "inc", inc, "| current:", summaryBrief(sumBefore));
  console.log("  LWP back   :", lwpBack ? `-${lwpBack} from LeaveBalance.lwp` : "none");
  if (!sumBefore) console.log("  WARNING    : no AttendanceSummary row found for that month - summary will not be changed.");

  if (!APPLY) return console.log("\nDry run only. Add --apply to make the change.");

  // ---- apply ----
  await mongoose.connection
    .collection("attendance_backup_before_remove_checkout")
    .replaceOne({ _id: a._id }, a, { upsert: true });
  console.log("\nBackup saved in collection attendance_backup_before_remove_checkout");

  const res = await Attendance.updateOne(
    { _id: a._id, checkOut: a.checkOut }, // guard: only if the check-out is still there, unchanged
    {
      $set: { status: "absent", checkoutRemark: null, overtimeMinutes: 0, autoCheckedOut: false, checkOutGate: null },
      $unset: { checkOut: 1 },
    }
  );
  if (res.modifiedCount !== 1) return console.log("Attendance was changed by someone else just now. Nothing else was touched.");
  console.log("Attendance updated.");

  if (sumBefore) {
    await AttendanceSummary.updateOne(sumFilter, { $inc: inc });
    console.log("AttendanceSummary reversed.");
  }
  if (lwpBack) {
    const r = await LeaveBalance.updateOne({ employee: a.employee, lwp: { $gte: lwpBack } }, { $inc: { lwp: -lwpBack } });
    console.log(r.modifiedCount ? `LeaveBalance.lwp -${lwpBack}` : "LWP not reversed - balance did not have that much LWP (check manually).");
  }

  console.log("\nAfter (attendance):", brief(await Attendance.findById(a._id).lean()));
  console.log("After (summary)   :", summaryBrief(await AttendanceSummary.findOne(sumFilter).lean()));
  console.log("\nDone. The employee now shows as checked in. They can check out properly, or auto check-out will close the day.");
};

mongoose
  .connect(process.env.LINK)
  .then(run)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });