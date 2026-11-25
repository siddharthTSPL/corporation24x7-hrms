// Changes TODAY's check-in time (IST) of one employee and re-derives the late fields from the new time,
// exactly the way the real check-in does it (evaluateCheckinWindow + computeLateStanding):
//   checkIn, isLate, lateMinutes, lateCountInMonth, latePenalty
//
// TODAY ONLY and OPEN records only (no check-out yet): if the person already checked out, status / summary /
// LWP would also depend on the check-in time, so this script refuses instead of half-fixing it.
// Defaults: employee = Mujeem (ENG13), new time = 10:23 IST.
// A backup of the original attendance document is saved first (collection: attendance_backup_before_change_checkin).
//
// Usage:
//   dry run : node scripts/ChangeCheckin.js
//   apply   : node scripts/ChangeCheckin.js --apply
//   other   : node scripts/ChangeCheckin.js [employeeId] [--time=HH:MM] [--apply]     (24h clock, IST)
//
// Works from the backend root (node scripts/...) and from inside scripts/.
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Attendance = require("../Models/attendance.model");
const Shift = require("../Models/shift.model");
const { evaluateCheckinWindow, resolveEmployeeShift } = require("../utils/shift.utils");
const { computeLateStanding } = require("../utils/Laterule.utils");
const { startOfISTDay, toISTKey } = require("../utils/Istdate.utils");

const APPLY = process.argv.includes("--apply");
const DEFAULT_EMPLOYEE_ID = "6ad5f75f1754262290fd38b6"; // Mujeem (ENG13)
const DEFAULT_TIME = "10:23";

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const employeeId = positional[0] || DEFAULT_EMPLOYEE_ID;
const timeArg = (process.argv.find((a) => a.startsWith("--time=")) || `--time=${DEFAULT_TIME}`).split("=")[1];

const ist = (d) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + " IST" : null);

const brief = (a) => ({
  _id: String(a._id),
  date: toISTKey(a.date),
  role: a.role,
  source: a.source,
  checkIn: ist(a.checkIn),
  checkOut: a.checkOut ? ist(a.checkOut) : null,
  isLate: !!a.isLate,
  lateMinutes: a.lateMinutes ?? 0,
  lateCountInMonth: a.lateCountInMonth ?? 0,
  latePenalty: !!a.latePenalty,
  activeMinutes: Math.round(a.activeMinutes || 0),
});

const run = async () => {
  if (!mongoose.isValidObjectId(employeeId)) return console.log("Invalid employeeId. Usage: see top of file");
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeArg);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return console.log("Invalid --time. Use HH:MM (24h), e.g. --time=10:23");

  console.log("Database:", mongoose.connection.name, APPLY ? "(APPLY mode)" : "(dry run - nothing will be changed)");

  const dayStart = startOfISTDay(new Date()); // today, IST midnight (how attendance.date is stored)
  const newCheckIn = new Date(dayStart.getTime() + (Number(m[1]) * 60 + Number(m[2])) * 60000);
  console.log("Day (IST):", toISTKey(dayStart), "- today only");

  const a = await Attendance.findOne({ employee: employeeId, date: dayStart }).lean();
  if (!a) return console.log("No attendance record for this employee for today. Nothing done.");

  console.log("Before:", brief(a));

  // ---- safety checks ----
  if (a.checkOut) return console.log("Already checked out - changing check-in would also change status / summary / LWP. Not handled by this script. Nothing done.");
  if (!a.checkIn) return console.log("This record has no check-in. Nothing to change.");
  if (!["manual", "face"].includes(a.source))
    return console.log(`source is "${a.source}" - agent / biometric / field-duty records are not a plain check-in. Not handled by this script. Nothing done.`);
  if (newCheckIn.getTime() > Date.now()) return console.log(`${timeArg} IST is in the future. Nothing done.`);
  if (newCheckIn.getTime() === new Date(a.checkIn).getTime()) return console.log("Check-in is already at that time. Nothing to do.");

  // ---- re-derive late fields from the NEW time (same functions as the real check-in) ----
  const shift = (a.shift && (await Shift.findById(a.shift).lean())) || (await resolveEmployeeShift({}, a.organisation_id));
  const { isLate, lateMinutes } = evaluateCheckinWindow(shift, newCheckIn);
  const { lateCountInMonth, latePenalty } = await computeLateStanding({
    organisation_id: a.organisation_id,
    employee: a.employee,
    role: a.role,
    date: a.date,
    isLate,
    lateMinutes,
  });

  const changes = { checkIn: newCheckIn, isLate, lateMinutes, lateCountInMonth, latePenalty: !!latePenalty };

  console.log(`\nShift used: ${shift.name} ${shift.startTime}-${shift.endTime}, grace ${shift.graceMinutes ?? 15} min`);
  console.log("Plan:");
  console.log("  checkIn          :", ist(a.checkIn), "->", ist(newCheckIn));
  console.log("  isLate           :", !!a.isLate, "->", isLate);
  console.log("  lateMinutes      :", a.lateMinutes ?? 0, "->", lateMinutes);
  console.log("  lateCountInMonth :", a.lateCountInMonth ?? 0, "->", lateCountInMonth);
  console.log("  latePenalty      :", !!a.latePenalty, "->", !!latePenalty);
  if (a.source === "manual")
    console.log("  note: for a manual (app) check-in, activeMinutes come from activity pings, so the extra minutes are NOT added to activeMinutes.");

  if (!APPLY) return console.log("\nDry run only. Add --apply to make the change.");

  // ---- apply ----
  await mongoose.connection
    .collection("attendance_backup_before_change_checkin")
    .replaceOne({ _id: a._id }, a, { upsert: true });
  console.log("\nBackup saved in collection attendance_backup_before_change_checkin");

  const res = await Attendance.updateOne(
    {
      _id: a._id,
      checkIn: a.checkIn, // guard: unchanged since we read it
      $or: [{ checkOut: { $exists: false } }, { checkOut: null }], // guard: still open
    },
    { $set: changes }
  );
  if (res.modifiedCount !== 1) return console.log("Record was changed by someone else just now (or checked out). Nothing was changed.");

  console.log("After :", brief(await Attendance.findById(a._id).lean()));
  console.log("\nDone.");
};

mongoose
  .connect(process.env.LINK)
  .then(run)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });