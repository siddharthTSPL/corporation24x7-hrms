const AttendanceSummary = require("../Models/attendancesummary.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const { getISTDateParts } = require("../utils/Istdate.utils");
const { isDateInLwpPortion } = require("../utils/leaveLwpDay.utils");
const mongoose = require("mongoose");

function calculateStatus(activeMinutes, thresholds) {
  const { absentBelowMinutes, halfDayBelowMinutes } = thresholds;
  if (activeMinutes < absentBelowMinutes) return "absent";
  if (activeMinutes < halfDayBelowMinutes) return "half_day";
  return "present";
}

// excludeLwp=true restricts this to genuinely PAID leave (el/sl/ml/pl/
// half_day_*) — used when deciding whether to excuse a day from
// absentDays/halfDays, since an approved LWP leave is an unpaid day, not an
// excused one, and must still show up as absent.
// excludeLwp=false (default) matches ANY approved leave regardless of type —
// used when deciding whether a leave application exists for this day at
// all, so the automatic no-leave-filed LWP debit below isn't applied a
// second time on top of what processLeaveDeduction() already charged at
// approval time for an explicit LWP leave.
// excludeLwp=true additionally requires that `date` NOT fall inside the
// leave's own lwpDays shortfall portion (see isDateInLwpPortion /
// Models/leave.model.js's `lwpDays` comment). Without this, an "el"
// leave that ran out of balance partway through would still excuse its
// LWP-shortfall days just because leaveType !== "lwp" at the document
// level - even though those specific days were never actually paid.
const hasApprovedLeave = async (employeeId, date, role, { excludeLwp = false } = {}) => {
  const checkDate = new Date(date);
  const id = new mongoose.Types.ObjectId(employeeId);
  const leaveTypeFilter = excludeLwp ? { leaveType: { $ne: "lwp" } } : {};
  const selectFields = "_id startDate endDate lwpDays";

  let leave;
  if (role === "manager") {
    leave = await ManagerLeave.findOne({
      manager: id,
      status: { $in: ["approved_reporting_manager", "approved_admin"] },
      startDate: { $lte: checkDate },
      endDate:   { $gte: checkDate },
      ...leaveTypeFilter,
    }).select(selectFields).lean();
  } else if (role === "admin") {
    leave = await AdminLeave.findOne({
      admin: id,
      status: "approved_superadmin",
      startDate: { $lte: checkDate },
      endDate:   { $gte: checkDate },
      ...leaveTypeFilter,
    }).select(selectFields).lean();
  } else {
    leave = await Leave.findOne({
      employee: id,
      status: { $in: ["approved_manager", "approved_admin"] },
      startDate: { $lte: checkDate },
      endDate:   { $gte: checkDate },
      ...leaveTypeFilter,
    }).select(selectFields).lean();
  }

  if (!leave) return false;
  if (excludeLwp && isDateInLwpPortion(leave, checkDate)) return false;
  return true;
};

const updateSummary = async (attendance) => {
  const date  = new Date(attendance.date);
  const empId = new mongoose.Types.ObjectId(attendance.employee);

  const isUnpaidCandidate = attendance.status === "half_day" || attendance.status === "absent";

  // Two separate questions, deliberately checked separately:
  //  - onPaidLeave: is there approved EL/SL/ML/PL (etc, NOT lwp) covering
  //    this day? Only this excuses the day from absentDays/halfDays —
  //    payroll reads AttendanceSummary directly, so an employee on approved
  //    (and available) EL/SL must not still get docked for a day that
  //    correctly has zero LWP. An approved LWP leave does NOT excuse the
  //    day — it's an unpaid day by the employee's own choice, so it must
  //    still show up as absent/half-day.
  //  - onAnyApprovedLeave: is there ANY approved leave (including lwp)
  //    covering this day? If so, its LeaveBalance.lwp effect was already
  //    applied once, in full, by processLeaveDeduction() at approval time
  //    (see calculateleave.js) — the automatic "no leave filed" LWP debit
  //    below must not fire again on top of that.
  const [onPaidLeave, onAnyApprovedLeave] = isUnpaidCandidate
    ? await Promise.all([
        hasApprovedLeave(attendance.employee, attendance.date, attendance.role, { excludeLwp: true }),
        hasApprovedLeave(attendance.employee, attendance.date, attendance.role),
      ])
    : [false, false];

  const summaryInc = { totalWorkingMinutes: attendance.activeMinutes || 0 };

  if (attendance.status === "present") {
    summaryInc.presentDays = 1;
  } else if (attendance.status === "half_day") {
    summaryInc.presentDays = 0.5;
    if (!onPaidLeave) summaryInc.halfDays = 1;
  } else if (attendance.status === "absent") {
    if (!onPaidLeave) summaryInc.absentDays = 1;
  }

  // month/year must be the IST calendar month, not whatever the server
  // process's local timezone reads off `date` - see the identical fix in
  // Marknoshowabsent.js and the toISTKey comment in attendance.controller.js.
  // A record for IST midnight of the 1st is stored as ~18:30 UTC on the
  // last day of the PREVIOUS month, so date.getMonth()/getFullYear() bucket
  // month-boundary records into the wrong month on any non-IST host.
  const { month: istMonth, year: istYear } = getISTDateParts(date);

  await AttendanceSummary.findOneAndUpdate(
    {
      employee: attendance.employee,
      role:     attendance.role,
      month:    istMonth,
      year:     istYear,
    },
    { $inc: summaryInc },
    { upsert: true, new: true }
  );

  // Only auto-debit LWP here for a day with NO leave application at all
  // (genuine unauthorized short/absent day). A day already covered by an
  // approved leave — paid or lwp — had its LeaveBalance effect handled by
  // processLeaveDeduction() at approval time and must not be charged twice.
  if (isUnpaidCandidate && !onAnyApprovedLeave) {
    const lwpAmount = attendance.status === "half_day" ? 0.5 : 1;
    await LeaveBalance.findOneAndUpdate(
      { employee: empId },
      { $inc: { lwp: lwpAmount } }
    );
  }
};

module.exports = { calculateStatus, updateSummary };