// One-off manual test for the LWP -> per-day absent fix.
// Run with: node scripts/testLwpFix.js
// Uses the same LINK env var as the rest of the app (see .env) - point
// this at a STAGING/TEST database, not production, since it writes and
// then deletes test documents.

require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../Models/user.model");
const SuperAdmin = require("../Models/superadmin.model");
const Leave = require("../Models/leave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const NoShowLog = require("../Models/noshowlog.model");
const Attendance = require("../Models/attendance.model");

const { processLeaveDeduction } = require("../automatic/calculateleave");
const { markNoShowAbsences } = require("../automatic/Marknoshowabsent");
const { getISTDateParts } = require("../utils/Istdate.utils");
const { startOfDay } = require("../automatic/weekoffcalendar");

const ymd = (d) => startOfDay(d);
const addDays = (d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

async function main() {
  await mongoose.connect(process.env.LINK);
  console.log("Connected.\n");

  // ---- 1. set up a throwaway employee with a KNOWN, small EL balance ----
  const org = await SuperAdmin.findOne().select("_id").lean();
  if (!org) throw new Error("No SuperAdmin/org found - seed one first.");

  const testUser = await User.create({
    organisation_id: org._id,
    empid: `LWPTEST${Date.now()}`,
    uid: `LWPTEST${Date.now()}`,
    department: "OPR",
    f_name: "LwpFixTest",
    l_name: "Employee",
    work_email: `lwpfixtest+${Date.now()}@example.com`,
    gender: "male",
    password: "TestPassword123!",
    personal_contact: "9999999999",
    e_contact: "9999999998",
    designation: "Test Designation",
    office_location: "Test Office",
    working_status: "working",
    date_of_joining: addDays(new Date(), -60),
  });

  await LeaveBalance.create({
    organisation_id: org._id,
    employee: testUser._id,
    EL: { entitled: 3, yearlyEntitled: 3, availed: 0, accrued: 3 }, // only 3 days available
    SL: { entitled: 0, yearlyEntitled: 0, availed: 0 },
    ML: 0,
    PL: 0,
    pbc: 0,
    lwp: 0,
  });

  // ---- 2. apply + "approve" a 10-day EL leave (3 available, 7 short) ----
  const startDate = ymd(addDays(new Date(), -10)); // finished leave, so
  const endDate = ymd(addDays(startDate, 9));       // markNoShowAbsences will pick it up

  const leave = await Leave.create({
    organisation_id: org._id,
    employee: testUser._id,
    manager: testUser._id, // dummy, not used by this test path
    applicantName: "LwpFixTest Employee",
    applicantEmail: testUser.work_email,
    leaveType: "el",
    startDate,
    endDate,
    days: 10,
    reason: "testing lwp fix",
    status: "approved_admin",
  });

  await processLeaveDeduction(leave);
  const savedLeave = await Leave.findById(leave._id).lean();

  console.log("=== Step 1: lwpDays persisted on the Leave document ===");
  console.log(`  expected lwpDays: 7, actual: ${savedLeave.lwpDays}`);
  console.log(savedLeave.lwpDays === 7 ? "  PASS\n" : "  FAIL\n");

  const balanceAfter = await LeaveBalance.findOne({ employee: testUser._id }).lean();
  console.log("=== Step 2: LeaveBalance.lwp unchanged in HOW it's calculated ===");
  console.log(`  expected LeaveBalance.lwp: 7, actual: ${balanceAfter.lwp}`);
  console.log(balanceAfter.lwp === 7 ? "  PASS\n" : "  FAIL\n");

  // ---- 3. run markNoShowAbsences for each of the 10 days, one at a time ----
  // (this mirrors exactly what the nightly cron does - one date per call)
  for (let i = 0; i < 10; i++) {
    await markNoShowAbsences(addDays(startDate, i));
  }

  const { month, year } = getISTDateParts(startDate);
  const summary = await AttendanceSummary.findOne({
    employee: testUser._id, role: "employee", month, year,
  }).lean();

  const accountedFor = (summary?.absentDays ?? 0) + (summary?.weekOffHolidayDays ?? 0);
  console.log("=== Step 3: AttendanceSummary after the 10-day sweep ===");
  console.log(`  absentDays: ${summary?.absentDays}, weekOffHolidayDays: ${summary?.weekOffHolidayDays}`);
  console.log(`  sum should equal lwpDays (7): ${accountedFor}`);
  console.log(accountedFor === 7 ? "  PASS (any weekend-overlap LWP days correctly bucket as weekOffHolidayDays, not absentDays)\n" : "  FAIL\n");

  // ---- 4. confirm it was incremented day-by-day, not in one lump sum ----
  const noShowRows = await NoShowLog.find({
    employee: testUser._id, role: "employee",
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 }).lean();

  console.log("=== Step 4: NoShowLog rows (proves per-day increments) ===");
  noShowRows.forEach((r) => console.log(`  ${r.date.toISOString().slice(0, 10)}`));
  console.log(`  total rows: ${noShowRows.length} (each = one separate $inc, not a lump sum)\n`);

  // ---- cleanup ----
  await Promise.all([
    Leave.deleteOne({ _id: leave._id }),
    LeaveBalance.deleteOne({ employee: testUser._id }),
    AttendanceSummary.deleteOne({ employee: testUser._id, role: "employee", month, year }),
    NoShowLog.deleteMany({ employee: testUser._id, role: "employee" }),
    Attendance.deleteMany({ employee: testUser._id, role: "employee" }),
    User.deleteOne({ _id: testUser._id }),
  ]);
  console.log("Cleanup done.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});