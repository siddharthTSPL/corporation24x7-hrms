const AttendanceSummary = require("../Models/attendancesummary.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const mongoose = require("mongoose");

const calculateStatus = (activeMinutes) => {
  const hours = activeMinutes / 60;
  if (hours >= 5)   return "present";
  if (hours >= 3.5) return "half_day";
  return "absent";
};

// Check if employee has an approved leave for this date
const hasApprovedLeave = async (employeeId, date) => {
  const checkDate = new Date(date);
  const leave = await Leave.findOne({
    employee: new mongoose.Types.ObjectId(employeeId),
    status: { $in: ["approved_manager", "approved_admin"] },
    startDate: { $lte: checkDate },
    endDate:   { $gte: checkDate },
  });
  return !!leave;
};

const updateSummary = async (attendance) => {
  const date = new Date(attendance.date);

  // ── Update monthly summary ──────────────────────────────────────────────────
  let summary = await AttendanceSummary.findOne({
    employee: attendance.employee,
    role:     attendance.role,
    month:    date.getMonth() + 1,
    year:     date.getFullYear()
  });

  if (!summary) {
    summary = new AttendanceSummary({
      employee:            attendance.employee,
      role:                attendance.role,
      month:               date.getMonth() + 1,
      year:                date.getFullYear(),
      presentDays:         0,
      halfDays:            0,
      absentDays:          0,
      totalWorkingMinutes: 0
    });
  }

  summary.totalWorkingMinutes += attendance.activeMinutes || 0;

  if (attendance.status === "present") {

    summary.presentDays += 1;

  } else if (attendance.status === "half_day") {

    summary.halfDays    += 1;
    summary.presentDays += 0.5;

    const onLeave = await hasApprovedLeave(attendance.employee, attendance.date);
    if (!onLeave) {
      const lb = await LeaveBalance.findOne({ employee: new mongoose.Types.ObjectId(attendance.employee) });
      if (lb) {
        lb.lwp = Number(((lb.lwp || 0) + 0.5).toFixed(2));
        await lb.save();
      }
    }

  } else if (attendance.status === "absent") {
    
    summary.absentDays += 1;

    const onLeave = await hasApprovedLeave(attendance.employee, attendance.date);
    if (!onLeave) {
      const lb = await LeaveBalance.findOne({ employee: new mongoose.Types.ObjectId(attendance.employee) });
      if (lb) {
        lb.lwp = Number(((lb.lwp || 0) + 1).toFixed(2));
        await lb.save();
      }
    }
  }

  await summary.save();
};

module.exports = { calculateStatus, updateSummary };