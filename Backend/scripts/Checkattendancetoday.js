/**
 * Check one employee's attendance for a day (default: today, IST).
 *
 * Usage (from the backend root, where .env with LINK lives):
 *   node scripts/Checkattendancetoday.js
 *   node scripts/Checkattendancetoday.js 2026-11-18
 *   node scripts/Checkattendancetoday.js 2026-11-18 6a4fcbe1a0a9ab5ebcdf1ac9
 *
 * Read-only: nothing is modified.
 */
const mongoose = require("mongoose");
require("dotenv").config();

const Attendance = require("../Models/attendance.model");
const { startOfISTDay, endOfISTDay } = require("../utils/Istdate.utils");

const DEFAULT_EMPLOYEE_ID = "6a4fcbe1a0a9ab5ebcdf1ac9"; // Ashish Gangwar (ENG09)

const [dateArg, idArg] = process.argv.slice(2);
const employeeId = idArg || DEFAULT_EMPLOYEE_ID;

const fmtIST = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "-";

const fmtDur = (mins) => {
  const m = Math.round(mins || 0);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const run = async () => {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    console.log("Invalid employee id:", employeeId);
    return;
  }

  // dateArg is an IST calendar day (YYYY-MM-DD); no arg = today in IST.
  let base = new Date();
  if (dateArg) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
      console.log("Date format must be YYYY-MM-DD");
      return;
    }
    base = new Date(`${dateArg}T00:00:00+05:30`);
  }
  const dayStart = startOfISTDay(base);
  const dayEnd = endOfISTDay(base);

  console.log(`Employee : ${employeeId}`);
  console.log(`IST day  : ${fmtIST(dayStart)}  ->  ${fmtIST(dayEnd)}\n`);

  // Match on employee + date only (not role/onModel) so we find the record
  // no matter which model the account was created under.
  const docs = await Attendance.find({
    employee: employeeId,
    date: { $gte: dayStart, $lte: dayEnd },
  }).lean();

  if (!docs.length) {
    console.log("❌ No attendance record found for this day (not checked in yet / no record created).");

    const last = await Attendance.findOne({ employee: employeeId })
      .sort({ date: -1 })
      .lean();
    if (last) {
      console.log(
        `\nLast record on file: ${fmtIST(last.date)} | status=${last.status} | checkIn=${fmtIST(last.checkIn)} | checkOut=${fmtIST(last.checkOut)}`
      );
    }
    return;
  }

  if (docs.length > 1) {
    console.log(
      `⚠️  ${docs.length} records found for the same day (duplicate). Run scripts/mergeDuplicateAttendance.js to review.\n`
    );
  }

  docs.forEach((a, i) => {
    console.log(`── Record ${i + 1} (${a._id}) ──`);
    console.log(`Status            : ${a.status}`);
    console.log(`Role / onModel    : ${a.role} / ${a.onModel}`);
    console.log(`Source            : ${a.source}`);
    console.log(`Check-in          : ${fmtIST(a.checkIn)}${a.checkInGate ? `  (gate: ${a.checkInGate})` : ""}`);
    console.log(`Check-out         : ${fmtIST(a.checkOut)}${a.checkOutGate ? `  (gate: ${a.checkOutGate})` : ""}`);
    console.log(`Late              : ${a.isLate ? `Yes (${a.lateMinutes} min)` : "No"}`);
    console.log(`Late count/month  : ${a.lateCountInMonth || 0}   Late penalty: ${a.latePenalty ? "Yes" : "No"}`);
    console.log(`Active time       : ${fmtDur(a.activeMinutes)}`);
    console.log(`Idle time         : ${fmtDur(a.idleMinutes)}`);
    console.log(`Checkout remark   : ${a.checkoutRemark || "-"}`);
    console.log(`Overtime          : ${a.overtimeMinutes || 0} min`);
    console.log(`Auto checked-out  : ${a.autoCheckedOut ? "Yes" : "No"}`);
    console.log(`Location          : ${a.latitude != null ? `${a.latitude}, ${a.longitude} (accuracy ${a.accuracy ?? "?"} m)` : "-"}`);
    console.log(`Selfie            : ${a.selfie || "-"}`);
    console.log(`Shift id          : ${a.shift || "-"}`);
    console.log(`Created / Updated : ${fmtIST(a.createdAt)} / ${fmtIST(a.updatedAt)}`);

    if (a.channelPings && Object.keys(a.channelPings).length) {
      console.log("Channel pings     :");
      Object.entries(a.channelPings).forEach(([ch, p]) => {
        console.log(`   - ${ch}: status=${p.status} lastUpdated=${p.lastUpdated ? fmtIST(p.lastUpdated) : "-"}`);
      });
    }
    console.log("");
  });
};

mongoose
  .connect(process.env.LINK)
  .then(run)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });