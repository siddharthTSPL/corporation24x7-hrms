// Usage: node scripts/Scanpendingapprovals.js
// Lists every timesheet waiting for approval, whose queue it sits in, and flags the ones nobody can act on.
const mongoose = require("mongoose");
require("dotenv").config();
const Timesheet = require("../Models/Timesheet.model");
const Admin = require("../Models/Admin.model");
const Manager = require("../Models/manager.model");
const User = require("../Models/user.model");
const SuperAdmin = require("../Models/superadmin.model");

const MODELS = { Admin, Manager, User, SuperAdmin };
const PENDING = ["pending_manager", "pending_reporting_manager", "pending_coadmin", "pending_admin", "pending_superadmin"];
const cache = new Map();
const who = async (model, id) => {
  if (!id) return null;
  const k = `${model}:${id}`;
  if (cache.has(k)) return cache.get(k);
  const d = MODELS[model] ? await MODELS[model].findById(id).select("f_name l_name empid working_status").lean() : null;
  const v = d ? { name: `${d.f_name || ""} ${d.l_name || ""}`.trim(), empid: d.empid, working: d.working_status || "working" } : null;
  cache.set(k, v);
  return v;
};

const run = async () => {
  const sheets = await Timesheet.find({ status: { $in: PENDING } }).sort({ submitted_at: 1 }).lean();
  if (!sheets.length) return console.log("No timesheets are pending approval.");
  const rows = [];
  for (const ts of sheets) {
    const owner = await who(ts.owner_model, ts.owner);
    const handler = await who(ts.currentHandlerModel, ts.currentHandler);
    const pool = [];
    for (const a of ts.approverPool || []) pool.push((await who("Admin", a))?.name || String(a));
    let problem = "";
    if (!ts.currentHandler && !pool.length) problem = "NO HANDLER";
    else if (ts.currentHandler && !handler) problem = "HANDLER NOT FOUND";
    else if (handler && handler.working !== "working") problem = `HANDLER ${handler.working.toUpperCase()}`;
    rows.push({
      owner: `${owner?.name || ts.owner} (${owner?.empid || ts.owner_model})`,
      week: ts.week_start.toISOString().slice(0, 10),
      status: ts.status,
      waitingOn: handler ? `${handler.name} [${ts.currentHandlerModel}]` : "-",
      pool: pool.join(", ") || "-",
      daysWaiting: Math.floor((Date.now() - new Date(ts.submitted_at || ts.updatedAt)) / 86400000),
      problem,
    });
  }
  console.table(rows);
  const by = {};
  rows.forEach((r) => { by[r.waitingOn] = (by[r.waitingOn] || 0) + 1; });
  console.log("\nPending count per approver:");
  console.table(by);
  const bad = rows.filter((r) => r.problem);
  console.log(bad.length ? `\n${bad.length} timesheet(s) are STUCK (see 'problem' column).` : "\nNo stuck timesheets.");
};
mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });