const LeaveBalance = require("../Models/leavebalance.model");
const { isSandwichLeave } = require("./sandwitchleave");
const mongoose = require("mongoose");

function calculateLeaveDays(startDate, endDate) {
  return Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
}

async function processLeaveDeduction(leave) {
  const empId = new mongoose.Types.ObjectId(leave.employee);

  const balance = await LeaveBalance.findOne({ employee: empId }).lean();
  if (!balance) throw new Error("Leave balance not found");

  const days = leave.days || calculateLeaveDays(leave.startDate, leave.endDate);

  if (isSandwichLeave(leave.startDate, leave.endDate)) {
    return LeaveBalance.findOneAndUpdate(
      { employee: empId },
      { $inc: { lwp: days } },
      { new: true }
    ).lean();
  }

  const $set = {};
  const $inc = {};

  switch (leave.leaveType) {
    case "el":
    case "half_day_el": {
      const d = leave.leaveType === "half_day_el" ? 0.5 : days;
      const available = Math.max(0, Number((balance.EL.accrued - balance.EL.availed).toFixed(2)));
      const deductable = Math.min(available, d);
      $set["EL.availed"] = Number((balance.EL.availed + deductable).toFixed(2));
      $set.pbc = Number(((balance.pbc || 0) + deductable).toFixed(2));
      if (d > deductable) $inc.lwp = Number((d - deductable).toFixed(2));
      break;
    }

    case "sl":
    case "half_day_sl": {
      const d = leave.leaveType === "half_day_sl" ? 0.5 : days;
      const available = Number((balance.SL.entitled - balance.SL.availed).toFixed(2));
      const deductable = Math.min(available, d);
      $set["SL.availed"] = Number((balance.SL.availed + deductable).toFixed(2));
      $set.pbc = Number(((balance.pbc || 0) + deductable).toFixed(2));
      if (d > deductable) $inc.lwp = Number((d - deductable).toFixed(2));
      break;
    }

    case "ml": {
      const deductable = Math.min(balance.ML, days);
      $set.ML = balance.ML - deductable;
      $set.pbc = (balance.pbc || 0) + deductable;
      if (days > deductable) $inc.lwp = days - deductable;
      break;
    }

    case "pl": {
      const deductable = Math.min(balance.PL, days);
      $set.PL = balance.PL - deductable;
      $set.pbc = (balance.pbc || 0) + deductable;
      if (days > deductable) $inc.lwp = days - deductable;
      break;
    }

    default:
      $inc.lwp = days;
  }

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($inc).length) update.$inc = $inc;

  return LeaveBalance.findOneAndUpdate({ employee: empId }, update, { new: true }).lean();
}

module.exports = { processLeaveDeduction, calculateLeaveDays };