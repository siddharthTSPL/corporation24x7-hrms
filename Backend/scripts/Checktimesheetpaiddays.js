// READ-ONLY. Shows why payroll Paid Days differs from the dashboard for one employee.
// Usage (from the backend folder, where .env with LINK lives):
//   node scripts/checkTimesheetPaidDays.js ENG10 9 2026
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../Models/user.model");
const Payroll = require("../Models/payroll.model");
const TimeLog = require("../Models/Timelog.model");
const Timesheet = require("../Models/Timesheet.model");
const PayrollPolicy = require("../Models/payrollpolicy.model");
const { getTimesheetAttendanceByEmployee, classifyDay } = require("../utils/Timesheetattendance.utils");
const { shapeSyncConfig } = require("../utils/Timesheetovertime.utils");
const { toISTKey, istDateFromYMD } = require("../utils/Istdate.utils");

const [empid, m, y] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
if (!empid || !m || !y) { console.log("Usage: node scripts/checkTimesheetPaidDays.js ENG10 9 2026"); process.exit(1); }

(async () => {
  await mongoose.connect(process.env.LINK);
  const user = await User.findOne({ empid }).lean();
  if (!user) { console.log("No User with empid", empid, "(managers/admins: change the model in this script)"); return; }
  const org = user.organisation_id;
  const policy = await PayrollPolicy.findOne({ organisation_id: org }).lean();
  const stdMin = shapeSyncConfig(policy).standardHoursPerDay * 60;

  // 1) What is SAVED in the payroll record
  const pr = await Payroll.findOne({ employee: user._id, month: m, year: y }).select("status attendance updatedAt").lean();
  console.log("\n=== SAVED PAYROLL ===");
  console.log(pr ? { status: pr.status, ...pr.attendance, updatedAt: pr.updatedAt } : "no payroll record");
  if (pr?.attendance?.manualEntry) console.log(">>> manualEntry=true : Paid Days was typed manually at generate time, timesheet is ignored.");
  if (pr && pr.attendance?.basis !== "timesheet") console.log(">>> basis is not 'timesheet' : check SalaryStructure.attendanceBasis / timesheetBasisFrom.");

  // 2) What payroll would calculate RIGHT NOW (same function payroll uses)
  const map = await getTimesheetAttendanceByEmployee({
    organisation_id: org, employeeModel: "User",
    employees: [{ id: user._id, joinDate: user.date_of_joining || user.createdAt }],
    month: m, year: y, policy,
  });
  const live = map.get(String(user._id));
  console.log("\n=== PAYROLL LOGIC RIGHT NOW ===");
  console.log({ presentDays: live.presentDays, halfDays: live.halfDays, absentDays: live.absentDays });

  // 3) Raw logs per day with the timesheet each one is attached to
  const from = istDateFromYMD(y, m, 1);
  const to = m === 12 ? istDateFromYMD(y + 1, 1, 1) : istDateFromYMD(y, m + 1, 1);
  const logs = await TimeLog.find({ organisation_id: org, logged_by: user._id, log_date: { $gte: from, $lt: to }, regular_minutes: { $gt: 0 } }).lean();
  const sheets = await Timesheet.find({ _id: { $in: logs.map((l) => l.timesheet).filter(Boolean) } }).select("status week_start week_end").lean();
  const sheetById = new Map(sheets.map((s) => [String(s._id), s]));
  const byDay = {};
  for (const l of logs) {
    const k = toISTKey(l.log_date);
    const s = l.timesheet ? sheetById.get(String(l.timesheet)) : null;
    (byDay[k] ||= []).push({ mins: l.regular_minutes, sheet: l.timesheet ? (s?.status || "MISSING") : "NOT-ATTACHED" });
  }

  console.log("\n=== DAYS WHERE PAYROLL = ABSENT (LOP) ===");
  const lop = live.days.filter((d) => d.result === "absent_lop");
  if (!lop.length) console.log("none -> payroll logic now gives full pay. Regenerate the payroll.");
  for (const d of lop) {
    const items = byDay[d.date] || [];
    const total = items.reduce((s, i) => s + i.mins, 0);
    const reason = !items.length ? "no TimeLog at all"
      : items.some((i) => i.sheet !== "approved") ? "log exists but timesheet NOT approved / not attached"
      : `approved but only ${Math.round((total / stdMin) * 100)}% of standard day (<50%)`;
    console.log(d.date, `| logged ${total} min of ${stdMin} |`, JSON.stringify(items), "=>", reason);
  }
  console.log("\nStandard day =", stdMin, "min. Full >=85%, half >=50%.");
})().catch((e) => console.error(e)).finally(() => mongoose.disconnect());