// Rollback of Addcorrectionlog.js: removes the "HR correction (added by admin)" log(s) for ONE person on ONE day,
// pulls them out of the timesheet and subtracts their minutes from the timesheet totals.
// Usage (dry run): node scripts/Rollbackcorrectionlog.js <employeeId> <Admin|Manager|User> <YYYY-MM-DD>
//       (apply)  : add --apply
// Examples:
//   node scripts/Rollbackcorrectionlog.js 6a61e337fcce5f0e99803a59 Manager 2026-10-06 --apply
//   node scripts/Rollbackcorrectionlog.js 6a61eb33dbf7a8ef02d1ef3e User 2026-10-23 --apply
const mongoose = require("mongoose");
require("dotenv").config();
const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const { parseISTDateOnly, endOfISTDay } = require("../utils/Istdate.utils");

const APPLY = process.argv.includes("--apply");
const [employeeId, model, date] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const NOTE = "HR correction (added by admin)";

const run = async () => {
  if (!employeeId || !model || !date) return console.log("Usage: see top of file");
  const dayStart = parseISTDateOnly(date);
  const dayEnd = new Date(endOfISTDay(dayStart).getTime() + 1);

  const logs = await TimeLog.find({
    logged_by: employeeId, logged_by_model: model,
    log_date: { $gte: dayStart, $lt: dayEnd }, note: NOTE,
  });
  if (!logs.length) return console.log(`${date}: no "${NOTE}" log found. Nothing to roll back.`);

  for (const log of logs) {
    const ts = await Timesheet.findById(log.timesheet);
    console.log(`Found log ${log._id}: ${log.duration_minutes} min (regular ${log.regular_minutes}), timesheet ${ts ? ts._id : "MISSING"}`);
    if (!APPLY) continue;

    if (ts) {
      ts.time_logs = ts.time_logs.filter((id) => String(id) !== String(log._id));
      ts.total_minutes -= log.duration_minutes;
      ts.working_minutes -= log.regular_minutes;
      await ts.save();
    }
    await TimeLog.deleteOne({ _id: log._id });
    console.log(`Rolled back log ${log._id} (-${log.duration_minutes} min).`);
  }
  if (!APPLY) console.log("Dry run. Nothing changed. Add --apply to roll back.");
};
mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });