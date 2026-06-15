const AttendanceSummary = require("../Models/attendancesummary.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const mongoose = require("mongoose");

const calculateStatus = (activeMinutes) => {
  const hours = activeMinutes / 60;
  if (hours >= 5)   return "present";
  if (hours >= 3.5) return "half_day";
  return "absent";
};

const hasApprovedLeave = async (employeeId, date, role) => {
  const checkDate = new Date(date);
  const id = new mongoose.Types.ObjectId(employeeId);

  if (role === "manager") {
    const leave = await ManagerLeave.findOne({
      manager: id,
      status: { $in: ["approved_reporting_manager", "approved_admin"] },
      startDate: { $lte: checkDate },
      endDate:   { $gte: checkDate },
    }).select("_id").lean();
    return !!leave;
  }

  if (role === "admin") {
    const leave = await AdminLeave.findOne({
      admin: id,
      status: "approved_superadmin",
      startDate: { $lte: checkDate },
      endDate:   { $gte: checkDate },
    }).select("_id").lean();
    return !!leave;
  }

  // employee
  const leave = await Leave.findOne({
    employee: id,
    status: { $in: ["approved_manager", "approved_admin"] },
    startDate: { $lte: checkDate },
    endDate:   { $gte: checkDate },
  }).select("_id").lean();
  return !!leave;
};

const updateSummary = async (attendance) => {
  const date  = new Date(attendance.date);
  const empId = new mongoose.Types.ObjectId(attendance.employee);

  const summaryInc = { totalWorkingMinutes: attendance.activeMinutes || 0 };

  if      (attendance.status === "present")  { summaryInc.presentDays = 1; }
  else if (attendance.status === "half_day") { summaryInc.halfDays = 1; summaryInc.presentDays = 0.5; }
  else if (attendance.status === "absent")   { summaryInc.absentDays = 1; }

  const summaryWrite = AttendanceSummary.findOneAndUpdate(
    {
      employee: attendance.employee,
      role:     attendance.role,
      month:    date.getMonth() + 1,
      year:     date.getFullYear(),
    },
    { $inc: summaryInc },
    { upsert: true, new: true }
  );

  if (attendance.status === "half_day" || attendance.status === "absent") {
    const lwpAmount = attendance.status === "half_day" ? 0.5 : 1;

    const [, onLeave] = await Promise.all([
      summaryWrite,
      hasApprovedLeave(attendance.employee, attendance.date, attendance.role),
    ]);

    if (!onLeave) {
      await LeaveBalance.findOneAndUpdate(
        { employee: empId },
        { $inc: { lwp: lwpAmount } }
      );
    }
  } else {
    await summaryWrite;
  }
};

module.exports = { calculateStatus, updateSummary };