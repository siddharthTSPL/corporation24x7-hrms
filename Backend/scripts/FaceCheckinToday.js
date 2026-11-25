// Adds TODAY's (IST) face-type check-in for 3 accounts when the kiosk scan was missed, so the day can be
// closed normally by a face check-out (one channel owns the whole day: source "face" -> face check-out).
//   Pawan Kumar (ENG11), Mujeem (ENG13), Ashish Gangwar (ENG09, manager)
//
// How the record is built: identical to what controllers/faceattendance.controller.js creates for a real scan
// (source "face", shift, late fields from evaluateCheckinWindow + computeLateStanding), with ONE difference so the
// audit trail stays honest: checkInGate = "Admin correction" instead of a kiosk gate name. Every record is also
// written to the collection attendance_admin_corrections_log.
//
// Safe by design:
//   - TODAY only, IST. The time must not be in the future.
//   - never overwrites: anyone who already has a real check-in today is skipped and reported
//     (a background desktop-agent ping record is upgraded the same way the real face flow does it, with a backup)
//   - skips holidays, week-offs and inactive accounts (the real check-in blocks those too)
//   - dry run by default
//
// Usage:
//   dry run : node scripts/FaceCheckinToday.js
//   apply   : node scripts/FaceCheckinToday.js --apply
//   other time (24h, IST): node scripts/FaceCheckinToday.js --time=10:05 [--apply]       default 10:00
//
// Works from the backend root (node scripts/...) and from inside scripts/.
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Attendance = require("../Models/attendance.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const { resolveEmployeeShift, evaluateCheckinWindow } = require("../utils/shift.utils");
const { computeLateStanding } = require("../utils/Laterule.utils");
const { isHoliday, isWeekOff } = require("../automatic/weekoffcalendar");
const { startOfISTDay, toISTKey } = require("../utils/Istdate.utils");

const APPLY = process.argv.includes("--apply");
const timeArg = (process.argv.find((a) => a.startsWith("--time=")) || "--time=10:00").split("=")[1];
const GATE = "Admin correction";

const PEOPLE = [
  { name: "Pawan Kumar (ENG11)", id: "6a704cc521f3ae8bae8f71fc", role: "employee", onModel: "User", Model: User },
  { name: "Mujeem (ENG13)", id: "6ad5f75f1754262290fd38b6", role: "employee", onModel: "User", Model: User },
  { name: "Ashish Gangwar (ENG09)", id: "6a4fcbe1a0a9ab5ebcdf1ac9", role: "manager", onModel: "Manager", Model: Manager },
];

const ist = (d) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + " IST" : null);

const run = async () => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeArg);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return console.log("Invalid --time. Use HH:MM (24h), e.g. --time=10:00");

  console.log("Database:", mongoose.connection.name, APPLY ? "(APPLY mode)" : "(dry run - nothing will be changed)");

  const dayStart = startOfISTDay(new Date()); // today, IST midnight (how attendance.date is stored)
  const checkIn = new Date(dayStart.getTime() + (Number(m[1]) * 60 + Number(m[2])) * 60000);
  console.log("Day (IST):", toISTKey(dayStart), "- today only | check-in time:", ist(checkIn));

  if (checkIn.getTime() > Date.now()) return console.log(`${timeArg} IST has not happened yet. Nothing done.`);

  const done = [];
  for (const p of PEOPLE) {
    console.log(`\n--- ${p.name} ---`);

    const user = await p.Model.findById(p.id).select("organisation_id shift status working_status f_name role").lean();
    if (!user) { console.log("Account not found in this database. Skipped."); continue; }
    if (user.status !== "active") { console.log(`Account status is "${user.status}". Skipped.`); continue; }
    const org = user.organisation_id;

    const hol = await isHoliday(dayStart, org);
    if (hol.isHoliday) { console.log(`Today is a holiday (${hol.name}). Skipped.`); continue; }
    const wo = await isWeekOff(dayStart, org, p.id, p.onModel);
    if (wo.isOff) { console.log("Today is this person's week off. Skipped."); continue; }

    const existing = await Attendance.findOne({ employee: p.id, role: p.role, date: dayStart, organisation_id: org }).lean();
    if (existing && existing.source !== "agent") {
      console.log("Already has attendance today - NOT touched:", { source: existing.source, checkIn: ist(existing.checkIn), checkOut: existing.checkOut ? ist(existing.checkOut) : null });
      continue;
    }

    const shift = await resolveEmployeeShift(user, org);
    const { allowed, isLate, lateMinutes } = evaluateCheckinWindow(shift, checkIn);
    if (!allowed) { console.log(`${timeArg} is before check-in opens for ${shift.name} (${shift.startTime}). Skipped.`); continue; }
    const { lateCountInMonth, latePenalty } = await computeLateStanding({
      organisation_id: org, employee: p.id, role: p.role, date: dayStart, isLate, lateMinutes,
    });

    const fields = {
      checkIn, source: "face", shift: shift._id, isLate, lateMinutes, lateCountInMonth, latePenalty: !!latePenalty,
      checkInGate: GATE, activeMinutes: 0, idleMinutes: 0,
    };

    console.log(existing ? "Plan: upgrade desktop-agent ping record to a face check-in" : "Plan: create new face check-in record");
    console.log(`  shift ${shift.name} ${shift.startTime}-${shift.endTime}, grace ${shift.graceMinutes ?? 15} min`);
    console.log("  ", { checkIn: ist(checkIn), isLate, lateMinutes, lateCountInMonth, latePenalty: !!latePenalty, source: "face", checkInGate: GATE });

    if (!APPLY) continue;

    let attendanceId;
    if (existing) {
      await mongoose.connection.collection("attendance_backup_before_face_checkin").replaceOne({ _id: existing._id }, existing, { upsert: true });
      const r = await Attendance.updateOne({ _id: existing._id, source: "agent" }, { $set: fields });
      if (r.modifiedCount !== 1) { console.log("Record changed by someone else just now. Skipped."); continue; }
      attendanceId = existing._id;
    } else {
      try {
        const created = await Attendance.create({
          organisation_id: org, employee: p.id, onModel: p.onModel, role: p.role, date: dayStart, ...fields,
        });
        attendanceId = created._id;
      } catch (e) {
        if (e.code === 11000) { console.log("Someone created today's record just now. Skipped."); continue; }
        throw e;
      }
    }

    await mongoose.connection.collection("attendance_admin_corrections_log").insertOne({
      action: existing ? "face_checkin_upgraded_from_agent" : "face_checkin_added",
      attendanceId, employee: new mongoose.Types.ObjectId(p.id), role: p.role,
      date: dayStart, checkIn, gate: GATE, at: new Date(), by: "scripts/FaceCheckinToday.js",
    });
    console.log("Done. attendance _id:", String(attendanceId));
    done.push({ name: p.name, id: String(attendanceId) });
  }

  if (!APPLY) return console.log("\nDry run only. Add --apply to make the changes.");
  console.log("\nSummary:", done.length ? done : "nothing was changed");
};

mongoose
  .connect(process.env.LINK)
  .then(run)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });