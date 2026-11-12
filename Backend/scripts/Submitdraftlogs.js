// Submits ALL draft time logs of one employee for approval (same routing as the "Submit Week" button).
// It does NOT approve anything - the normal approvers still have to approve.
// Usage (dry run): node scripts/Submitdraftlogs.js <employeeId> <Admin|Manager|User>
//       (apply)  : add --apply
const mongoose = require("mongoose");
require("dotenv").config();
const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const { getWeekBounds, resolveFirstHandler } = require("../controllers/timesheet.controller");
const { notifyTimesheetPending, notifyTimesheetDecision } = require("../utils/Timesheetnotify.utils");

const APPLY = process.argv.includes("--apply");
const [employeeId, model] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const PENDING = ["pending_manager", "pending_reporting_manager", "pending_coadmin", "pending_admin", "pending_superadmin"];

const run = async () => {
  if (!employeeId || !model) return console.log("Usage: see top of file");
  const drafts = await TimeLog.find({ logged_by: employeeId, logged_by_model: model, status: "draft" }).sort({ log_date: 1 });
  if (!drafts.length) return console.log("No draft logs.");
  const organisation_id = drafts[0].organisation_id;

  const byWeek = new Map();
  for (const l of drafts) {
    const { start, end } = getWeekBounds(l.log_date);
    const k = start.toISOString();
    if (!byWeek.has(k)) byWeek.set(k, { start, end, logs: [] });
    byWeek.get(k).logs.push(l);
  }

  const routing = await resolveFirstHandler({ actor: { id: employeeId, model }, organisation_id });
  console.log(`Routing: ${routing ? `${routing.status} -> ${routing.handlerModel} ${routing.handler}` : "no approver (would auto-approve)"}\n`);

  for (const { start, end, logs } of byWeek.values()) {
    let ts = await Timesheet.findOne({ organisation_id, owner: employeeId, week_start: start });
    const label = `Week ${start.toISOString().slice(0, 10)}: ${logs.length} log(s), existing timesheet: ${ts ? ts.status : "none"}`;
    if (!APPLY) { console.log(label, "-> dry run"); continue; }

    let merge = false, wasApproved = false;
    if (ts) {
      if (["draft", "rejected"].includes(ts.status)) ts.handlerChain = [];
      else if (PENDING.includes(ts.status) || ts.status === "approved") { merge = true; wasApproved = ts.status === "approved"; }
    } else ts = new Timesheet({ organisation_id, owner: employeeId, owner_model: model, week_start: start, week_end: end });

    const existing = merge && ts.time_logs?.length ? await TimeLog.find({ _id: { $in: ts.time_logs } }) : [];
    const all = [...existing, ...logs];
    ts.time_logs = all.map((l) => l._id);
    ts.total_minutes = all.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    ts.working_minutes = all.reduce((s, l) => s + (l.regular_minutes ?? l.duration_minutes ?? 0), 0);
    ts.overtime_minutes = all.reduce((s, l) => s + (l.overtime_minutes || 0), 0);
    ts.billable_minutes = all.filter((l) => l.billable).reduce((s, l) => s + (l.duration_minutes || 0), 0);
    ts.total_billed_amount = Math.round(all.reduce((s, l) => s + (l.billed_amount || 0), 0) * 100) / 100;

    if (!(merge && !wasApproved)) {
      ts.currentHandler = routing?.handler || null;
      ts.currentHandlerModel = routing?.handlerModel || null;
      ts.approverPool = routing?.pool || [];
      ts.status = routing ? routing.status : "approved";
      if (routing) ts.approved_by = null;
      ts.escalation_level = 0; ts.last_escalated_at = null;
      if (wasApproved) ts.handlerChain = [];
    }
    ts.submitted_at = new Date();
    await ts.save();
    await TimeLog.updateMany({ _id: { $in: logs.map((l) => l._id) } }, { $set: { status: ts.status === "approved" ? "approved" : "submitted", timesheet: ts._id } });
    try { ts.status === "approved" ? await notifyTimesheetDecision({ timesheetId: ts._id }) : await notifyTimesheetPending({ timesheetId: ts._id }); } catch (e) { console.log("  (notification failed:", e.message, ")"); }
    console.log(label, `-> now ${ts.status}`);
  }
};
mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });