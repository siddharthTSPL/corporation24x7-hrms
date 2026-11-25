const mongoose = require("mongoose");
require("dotenv").config();
const TimeLog = require("../Models/Timelog.model");
const Timesheet = require("../Models/Timesheet.model");
const Attendance = require("../Models/attendance.model");
const { parseISTDateOnly, endOfISTDay, toISTKey } = require("../utils/Istdate.utils");

const [employeeId, model, from, to] = process.argv.slice(2);

const run = async () => {
  if (!employeeId || !model || !from || !to) return console.log("Usage: node scripts/Inspecttimesheetdays.js <employeeId> <Admin|Manager|User> <YYYY-MM-DD> <YYYY-MM-DD>");
  const start = parseISTDateOnly(from);
  const end = new Date(endOfISTDay(parseISTDateOnly(to)).getTime() + 1);

  const att = await Attendance.find({ employee: employeeId, date: { $gte: start, $lt: end } }).select("date source status checkIn checkOut").sort({ date: 1 }).lean();
  console.log("\n== Attendance records ==");
  console.table(att.map((a) => ({ date: toISTKey(a.date), source: a.source, status: a.status, checkIn: !!a.checkIn, checkOut: !!a.checkOut, stub: a.source === "agent" && !a.checkIn && !a.checkOut })));

  const logs = await TimeLog.find({ logged_by: employeeId, logged_by_model: model, log_date: { $gte: start, $lt: end } }).sort({ log_date: 1 }).lean();
  const sheets = await Timesheet.find({ _id: { $in: logs.map((l) => l.timesheet).filter(Boolean) } }).lean();
  const sheetById = new Map(sheets.map((t) => [String(t._id), t]));
  console.log("\n== Time logs ==");
  console.table(logs.map((l) => {
    const t = l.timesheet ? sheetById.get(String(l.timesheet)) : null;
    return {
      day: toISTKey(l.log_date),
      regularMin: l.regular_minutes,
      mode: l.entry_mode,
      logStatus: l.status,
      note: (l.note || "").slice(0, 30),
      createdAt: l.createdAt && l.createdAt.toISOString(),
      sheetStatus: t ? t.status : null,
      submittedAt: t && t.submitted_at ? t.submitted_at.toISOString() : null,
      approvedBy: t && t.approved_by ? String(t.approved_by) : null,
    };
  }));
};

mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });