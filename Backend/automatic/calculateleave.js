const LeaveBalance = require("../Models/leavebalance.model");
const { isSandwichLeave } = require("./sandwitchleave");
const mongoose = require("mongoose");

function calculateLeaveDays(startDate, endDate) {
  return Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
}

// Persists how many of this leave's days couldn't be covered by balance and
// were auto-converted to LWP, onto the Leave/ManagerLeave/AdminLeave
// document itself - in addition to the existing cumulative
// LeaveBalance.lwp $inc below, which only tracks a running total and can't
// answer "which specific calendar days inside THIS application were LWP".
// `leave` here is always a real Mongoose document (every caller does
// Model.findOne(...) before calling processLeaveDeduction), so .save() is
// safe. See the `lwpDays` field comment on Models/leave.model.js for the
// "last N days of the range" convention this pairs with.
async function persistLwpDays(leave, lwpDays) {
  leave.lwpDays = Number((lwpDays || 0).toFixed(2));
  await leave.save();
}

async function processLeaveDeduction(leave) {
  const empId = new mongoose.Types.ObjectId(leave.employee || leave.manager || leave.admin);

  const balance = await LeaveBalance.findOne({ employee: empId }).lean();
  if (!balance) throw new Error("Leave balance not found");

  const days = leave.days || calculateLeaveDays(leave.startDate, leave.endDate);

  const employeeModel = leave.manager ? "Manager" : leave.admin ? "Admin" : "User";

  const sandwich = await isSandwichLeave(
    leave.startDate,
    leave.endDate,
    leave.organisation_id,
    empId,
    employeeModel,
    leave.nextLeaveDate
  );

  if (sandwich) {
    // Sandwich rule: the whole span (including the sandwiched off-days)
    // becomes LWP, so every day in [startDate, endDate] is LWP here.
    await persistLwpDays(leave, days);
    return LeaveBalance.findOneAndUpdate(
      { employee: empId },
      { $inc: { lwp: days } },
      { new: true }
    ).lean();
  }

  const $set = {};
  const $inc = {};
  let lwpDays = 0;

  switch (leave.leaveType) {
    case "el":
    case "half_day_el": {
      const d = leave.leaveType === "half_day_el" ? 0.5 : days;
      const available = Math.max(0, Number((balance.EL.accrued - balance.EL.availed).toFixed(2)));
      const deductable = Math.min(available, d);
      $set["EL.availed"] = Number((balance.EL.availed + deductable).toFixed(2));
      $set.pbc = Number(((balance.pbc || 0) + deductable).toFixed(2));
      if (d > deductable) {
        lwpDays = Number((d - deductable).toFixed(2));
        $inc.lwp = lwpDays;
      }
      break;
    }

    case "sl":
    case "half_day_sl": {
      const d = leave.leaveType === "half_day_sl" ? 0.5 : days;
      const available = Math.max(0, Number((balance.SL.entitled - balance.SL.availed).toFixed(2)));
      const deductable = Math.min(available, d);
      $set["SL.availed"] = Number((balance.SL.availed + deductable).toFixed(2));
      $set.pbc = Number(((balance.pbc || 0) + deductable).toFixed(2));
      if (d > deductable) {
        lwpDays = Number((d - deductable).toFixed(2));
        $inc.lwp = lwpDays;
      }
      break;
    }

    case "ml": {
      const deductable = Math.min(balance.ML, days);
      $set.ML = balance.ML - deductable;
      $set.pbc = (balance.pbc || 0) + deductable;
      if (days > deductable) {
        lwpDays = days - deductable;
        $inc.lwp = lwpDays;
      }
      break;
    }

    case "pl": {
      const deductable = Math.min(balance.PL, days);
      $set.PL = balance.PL - deductable;
      $set.pbc = (balance.pbc || 0) + deductable;
      if (days > deductable) {
        lwpDays = days - deductable;
        $inc.lwp = lwpDays;
      }
      break;
    }

    default:
      // leaveType "lwp" (or anything unrecognised) - the whole application
      // is LWP. The leaveType field itself already excludes these from the
      // "paid leave" checks elsewhere; lwpDays is set too for consistency
      // so any code that reads lwpDays directly still sees the truth.
      lwpDays = days;
      $inc.lwp = days;
  }

  await persistLwpDays(leave, lwpDays);

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($inc).length) update.$inc = $inc;

  return LeaveBalance.findOneAndUpdate({ employee: empId }, update, { new: true }).lean();
}

module.exports = { processLeaveDeduction, calculateLeaveDays };