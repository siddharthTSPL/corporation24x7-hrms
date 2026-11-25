// Attaches never-submitted DRAFT time logs to their week's existing timesheet.
// Usage (dry run):  node scripts/Fixorphandraftlogs.js <employeeId> <Admin|Manager|User> <from YYYY-MM-DD> <to YYYY-MM-DD>
//       (apply)  :  add --apply
//       (apply + mark approved by org owner, no re-approval needed): add --apply --approve
// Example (Riya, 1 Oct): node scripts/Fixorphandraftlogs.js 6a4f7c93aefa81a0f12f7242 Admin 2026-10-01 2026-10-01 --apply --approve
const mongoose = require("mongoose");
require("dotenv").config();
const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const { getWeekBounds } = require("../controllers/timesheet.controller");
const { parseISTDateOnly, endOfISTDay } = require("../utils/Istdate.utils");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const APPROVE = process.argv.includes("--approve");
const [employeeId, model, from, to] = args;

const run = async () => {
  if (!employeeId || !model || !from || !to) return console.log("Usage: see top of file");
  const start = parseISTDateOnly(from);
  const end = new Date(endOfISTDay(parseISTDateOnly(to)).getTime() + 1);
  const drafts = await TimeLog.find({
    logged_by: employeeId, logged_by_model: model, status: "draft", log_date: { $gte: start, $lt: end },
  });
  if (!drafts.length) return console.log("No draft logs in that range.");

  const byWeek = new Map();
  for (const l of drafts) {
    const { start: ws } = getWeekBounds(l.log_date);
    const k = ws.toISOString();
    if (!byWeek.has(k)) byWeek.set(k, { ws, logs: [] });
    byWeek.get(k).logs.push(l);
  }

  for (const { ws, logs } of byWeek.values()) {
    const ts = await Timesheet.findOne({ owner: employeeId, owner_model: model, week_start: ws });
    console.log(`Week ${ws.toISOString().slice(0, 10)}: ${logs.length} draft log(s), timesheet: ${ts ? ts.status : "NONE (submit from the UI)"}`);
    if (!ts) continue;
    if (!APPLY) { console.log("  dry-run, nothing changed"); continue; }

    const all = await TimeLog.find({ _id: { $in: [...ts.time_logs, ...logs.map((l) => l._id)] } });
    ts.time_logs = all.map((l) => l._id);
    ts.total_minutes = all.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    ts.working_minutes = all.reduce((s, l) => s + (l.regular_minutes ?? l.duration_minutes ?? 0), 0);
    ts.overtime_minutes = all.reduce((s, l) => s + (l.overtime_minutes || 0), 0);
    ts.billable_minutes = all.filter((l) => l.billable).reduce((s, l) => s + (l.duration_minutes || 0), 0);
    ts.total_billed_amount = Math.round(all.reduce((s, l) => s + (l.billed_amount || 0), 0) * 100) / 100;
    if (APPROVE) {
      ts.status = "approved";
      ts.approved_by = ts.organisation_id;
      ts.currentHandler = null; ts.currentHandlerModel = null; ts.approverPool = [];
      ts.remarks = "Late entries attached by admin repair";
    }
    await ts.save();
    await TimeLog.updateMany({ _id: { $in: logs.map((l) => l._id) } }, { $set: { status: APPROVE ? "approved" : "submitted", timesheet: ts._id } });
    console.log(`  attached, timesheet now: ${ts.status}`);
  }
};
mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });