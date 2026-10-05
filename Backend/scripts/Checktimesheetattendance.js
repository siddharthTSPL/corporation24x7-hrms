const mongoose = require("mongoose");
require("dotenv").config();

const SalaryStructure = require("../Models/salarystructure.model");
const { getOrCreatePolicy } = require("../controllers/payrollpolicy.controller");
const { getTimesheetAttendanceByEmployee } = require("../utils/Timesheetattendance.utils");

const [employeeId, monthArg, yearArg] = process.argv.slice(2);

const run = async () => {
  if (!employeeId || !monthArg || !yearArg) {
    console.log("Usage: node scripts/Checktimesheetattendance.js <employeeId> <month 1-12> <year>");
    return;
  }

  const structure = await SalaryStructure.findOne({ employee: employeeId }).lean();
  if (!structure) {
    console.log("Salary structure not found for this employee id");
    return;
  }

  const policy = await getOrCreatePolicy(structure.organisation_id);
  const map = await getTimesheetAttendanceByEmployee({
    organisation_id: structure.organisation_id,
    employeeModel: structure.employeeModel,
    employees: [{ id: structure.employee, joinDate: null }],
    month: Number(monthArg),
    year: Number(yearArg),
    policy,
  });

  const summary = map.get(String(structure.employee));
  if (!summary) {
    console.log("No result (SuperAdmin has no timesheets)");
    return;
  }

  console.log(`Attendance basis in structure: ${structure.attendanceBasis || "attendance"}`);
  console.log(`Standard minutes/day: ${summary.days.find((d) => d.standardMinutes)?.standardMinutes ?? "-"}\n`);

  console.table(
    summary.days.map((d) => ({
      date: d.date,
      approvedMinutes: d.approvedRegularMinutes ?? "-",
      percentOfStandard: d.percent !== undefined ? `${d.percent}%` : "-",
      result: d.result,
    }))
  );

  console.log(`\nFull/present days: ${summary.presentDays - summary.halfDays * 0.5}`);
  console.log(`Half days: ${summary.halfDays}`);
  console.log(`Absent (LOP) days: ${summary.absentDays}`);
};

mongoose
  .connect(process.env.LINK)
  .then(run)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });