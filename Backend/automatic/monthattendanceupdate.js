const AttendanceSummary = require("../Models/attendancesummary.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const mongoose = require("mongoose");

function calculateStatus(activeMinutes, thresholds) {
  const { absentBelowMinutes, halfDayBelowMinutes } = thresholds;
  if (activeMinutes < absentBelowMinutes) return "absent";
  if (activeMinutes < halfDayBelowMinutes) return "half_day";
  return "present";
}

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

  const isUnpaidCandidate = attendance.status === "half_day" || attendance.status === "absent";

  // Same rule that decides LWP must also decide whether this day counts as
  // an unpaid absent/half-day in AttendanceSummary — payroll reads
  // AttendanceSummary directly, so if this check only gated LWP, an
  // employee on approved (and available) EL/SL would still get their
  // salary docked for a day that correctly has zero LWP.
  const onLeave = isUnpaidCandidate
    ? await hasApprovedLeave(attendance.employee, attendance.date, attendance.role)
    : false;

  const summaryInc = { totalWorkingMinutes: attendance.activeMinutes || 0 };

  if (attendance.status === "present") {
    summaryInc.presentDays = 1;
  } else if (attendance.status === "half_day") {
    summaryInc.presentDays = 0.5;
    if (!onLeave) summaryInc.halfDays = 1;
  } else if (attendance.status === "absent") {
    if (!onLeave) summaryInc.absentDays = 1;
  }

  await AttendanceSummary.findOneAndUpdate(
    {
      employee: attendance.employee,
      role:     attendance.role,
      month:    date.getMonth() + 1,
      year:     date.getFullYear(),
    },
    { $inc: summaryInc },
    { upsert: true, new: true }
  );

  if (isUnpaidCandidate && !onLeave) {
    const lwpAmount = attendance.status === "half_day" ? 0.5 : 1;
    await LeaveBalance.findOneAndUpdate(
      { employee: empId },
      { $inc: { lwp: lwpAmount } }
    );
  }
};

module.exports = { calculateStatus, updateSummary };