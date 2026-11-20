// HR correction: tops up ONE day so it reaches <targetMinutes> regular minutes, by adding a "HR correction" log
// to that week's EXISTING approved timesheet. Use only when the person really worked that day.
// Usage (dry run): node scripts/Addcorrectionlog.js <employeeId> <Admin|Manager|User> <YYYY-MM-DD> <targetMinutes>
//       (apply)  : add --apply
// Examples:
//   Pandey 6 Oct -> full day : node scripts/Addcorrectionlog.js 6a61e337fcce5f0e99803a59 Manager 2026-10-06 540 --apply
//   Adnan 23 Oct -> full day : node scripts/Addcorrectionlog.js 6a61eb33dbf7a8ef02d1ef3e User 2026-10-23 540 --apply
const mongoose = require("mongoose");
require("dotenv").config();
const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const { getWeekBounds } = require("../controllers/timesheet.controller");
const { parseISTDateOnly, endOfISTDay } = require("../utils/Istdate.utils");

const APPLY = process.argv.includes("--apply");
const [employeeId, model, date, target] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const run = async () => {
  if (!employeeId || !model || !date || !target) return console.log("Usage: see top of file");
  const dayStart = parseISTDateOnly(date);
  const dayEnd = new Date(endOfISTDay(dayStart).getTime() + 1);
  const dayLogs = await TimeLog.find({ logged_by: employeeId, logged_by_model: model, log_date: { $gte: dayStart, $lt: dayEnd } });
  const have = dayLogs.reduce((s, l) => s + (l.regular_minutes || 0), 0);
  const need = Number(target) - have;
  console.log(`${date}: has ${have} min, target ${target} min -> add ${need} min`);
  if (need <= 0) return console.log("Nothing to add.");

  const { start: weekStart } = getWeekBounds(dayStart);
  const ts = await Timesheet.findOne({ owner: employeeId, owner_model: model, week_start: weekStart });
  if (!ts || ts.status !== "approved") return console.log(`Week timesheet is "${ts ? ts.status : "missing"}" - needs to be approved first. Aborting.`);

  const ref = dayLogs[0] || (await TimeLog.findOne({ logged_by: employeeId, logged_by_model: model, status: "approved" }).sort({ log_date: -1 }));
  if (!ref) return console.log("No existing log to copy job/project from. Aborting.");
  if (!APPLY) return console.log(`Dry run. Would add a ${need}-min log on job ${ref.job} to timesheet ${ts._id}.`);

  const log = await TimeLog.create({
    organisation_id: ts.organisation_id, job: ref.job, project: ref.project || null,
    logged_by: employeeId, logged_by_model: model, log_date: dayStart, entry_mode: "manual",
    duration_minutes: need, regular_minutes: need, overtime_minutes: 0, is_overtime: false,
    daily_limit_minutes_at_log: 540, day_type: "working",
    note: "HR correction (added by admin)", status: "approved", timesheet: ts._id,
  });
  ts.time_logs.push(log._id);
  ts.total_minutes += need; ts.working_minutes += need;
  await ts.save();
  console.log(`Added ${need} min. ${date} now has ${target} min in approved timesheet.`);
};
mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });