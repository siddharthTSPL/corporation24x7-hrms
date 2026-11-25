// Usage: node scripts/Diagnosetimesheetapproval.js <employeeId> <Admin|Manager|User> <month 1-12> <year>
// Shows, per week, the timesheet status + who it is waiting on, and per day why it is LOP.
const mongoose = require("mongoose");
require("dotenv").config();

const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const Admin = require("../Models/Admin.model");
const Manager = require("../Models/manager.model");
const SuperAdmin = require("../Models/superadmin.model");
const SalaryStructure = require("../Models/salarystructure.model");
const { getOrCreatePolicy } = require("../controllers/payrollpolicy.controller");
const { getTimesheetAttendanceByEmployee } = require("../utils/Timesheetattendance.utils");

const MODELS = { Admin, Manager, SuperAdmin };
const [employeeId, employeeModel, monthArg, yearArg] = process.argv.slice(2);

const handlerInfo = async (ts) => {
  if (!ts.currentHandler) return "NO HANDLER (nobody will see this)";
  const M = MODELS[ts.currentHandlerModel];
  const h = M ? await M.findById(ts.currentHandler).select("f_name l_name working_status").lean() : null;
  if (!h) return `${ts.currentHandlerModel} ${ts.currentHandler} -> USER NOT FOUND (stranded)`;
  const st = h.working_status && h.working_status !== "working" ? `  <-- ${h.working_status.toUpperCase()}, cannot approve` : "";
  return `${ts.currentHandlerModel}: ${h.f_name || ""} ${h.l_name || ""}${st}`;
};

const run = async () => {
  if (!employeeId || !employeeModel || !monthArg || !yearArg) {
    console.log("Usage: node scripts/Diagnosetimesheetapproval.js <employeeId> <Admin|Manager|User> <month> <year>");
    return;
  }
  const structure = await SalaryStructure.findOne({ employee: employeeId }).lean();
  if (!structure) return console.log("Salary structure not found");

  const sheets = await Timesheet.find({ owner: employeeId, owner_model: employeeModel }).sort({ week_start: 1 }).lean();
  console.log("\n== Timesheets ==");
  for (const ts of sheets) {
    const wk = ts.week_start.toISOString().slice(0, 10);
    console.log(`${wk}  ${ts.status.padEnd(26)} esc=${ts.escalation_level}  ->  ${["approved", "rejected", "draft"].includes(ts.status) ? "-" : await handlerInfo(ts)}`);
  }

  const orphan = await TimeLog.countDocuments({ logged_by: employeeId, logged_by_model: employeeModel, status: "draft", regular_minutes: { $gt: 0 } });
  console.log(`\nDraft (never submitted) logs: ${orphan}`);

  const policy = await getOrCreatePolicy(structure.organisation_id);
  const map = await getTimesheetAttendanceByEmployee({
    organisation_id: structure.organisation_id,
    employeeModel,
    employees: [{ id: employeeId, joinDate: null }],
    month: Number(monthArg),
    year: Number(yearArg),
    policy,
  });
  const sum = map.get(String(employeeId));
  console.log("\n== Days counted as absent ==");
  console.table(
    sum.days
      .filter((d) => String(d.result).startsWith("absent") || d.result === "half_day")
      .map((d) => ({ date: d.date, result: d.result, approvedMin: d.approvedRegularMinutes, pendingApprovalMin: d.pendingApprovalMinutes, unsubmittedMin: d.unsubmittedMinutes, percent: d.percent }))
  );
  console.log(`present=${sum.presentDays} half=${sum.halfDays} absent=${sum.absentDays} (pending approval=${sum.pendingApprovalDays}, unsubmitted=${sum.unsubmittedDays})`);
};

mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });