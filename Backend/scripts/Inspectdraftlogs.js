// Usage: node scripts/Inspectdraftlogs.js <employeeId> <Admin|Manager|User>
// Lists draft time logs with WHEN each was created vs the day it is for, and whether it came from the timer or manual entry.
const mongoose = require("mongoose");
require("dotenv").config();
const TimeLog = require("../Models/Timelog.model");
const TSJob = require("../Models/Tsjob.model");
const { toISTKey } = require("../utils/Istdate.utils");

const [employeeId, model] = process.argv.slice(2);
const run = async () => {
  if (!employeeId || !model) return console.log("Usage: node scripts/Inspectdraftlogs.js <employeeId> <Admin|Manager|User>");
  const logs = await TimeLog.find({ logged_by: employeeId, logged_by_model: model, status: "draft" })
    .sort({ log_date: 1 }).lean();
  const jobs = await TSJob.find({ _id: { $in: logs.map((l) => l.job) } }).select("title").lean();
  const jobName = new Map(jobs.map((j) => [String(j._id), j.title]));
  console.table(logs.map((l) => ({
    forDate: toISTKey(l.log_date),
    createdAt: new Date(l.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    daysLate: Math.round((new Date(l.createdAt) - l.log_date) / 86400000),
    mode: l.entry_mode,
    minutes: l.duration_minutes,
    start: l.start_time ? new Date(l.start_time).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "-",
    job: jobName.get(String(l.job)) || "-",
    note: (l.note || "").slice(0, 25),
  })));
  const created = new Set(logs.map((l) => new Date(l.createdAt).toISOString().slice(0, 16)));
  console.log(`\n${logs.length} draft logs, created at ${created.size} distinct minute(s).`);
  if (created.size <= 2 && logs.length > 3) console.log("=> Almost all created in one go (bulk/script/admin), NOT daily by the employee. Don't submit blindly.");
  else console.log("=> Created spread over different times (looks like the employee filled them day by day).");
};
mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });