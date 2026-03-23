const LeaveBalance = require("../Models/leavebalance.model");
const { isSandwichLeave } = require("./sandwitchleave");
const mongoose = require("mongoose");

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

async function processLeaveDeduction(leave) {
  const leaveBalance = await LeaveBalance.findOne({
    employee: new mongoose.Types.ObjectId(leave.employee),
  });

  if (!leaveBalance) throw new Error("Leave balance not found");

  const days = leave.days || calculateLeaveDays(leave.startDate, leave.endDate);

  if (isSandwichLeave(leave.startDate, leave.endDate)) {
    leaveBalance.lwp += days;
    await leaveBalance.save();
    return leaveBalance;
  }

  switch (leave.leaveType) {
    case "el": {
      const available = Math.max(
        0,
        leaveBalance.EL.accrued - leaveBalance.EL.availed,
      );
      const deductable = Math.min(available, days);

      leaveBalance.EL.availed = Number(
        (leaveBalance.EL.availed + deductable).toFixed(2),
      );
      leaveBalance.pbc = Number(
        ((leaveBalance.pbc || 0) + deductable).toFixed(2),
      );

      if (days > deductable) {
        leaveBalance.lwp += days - deductable;
      }

      break;
    }

    case "sl": {
      const available = leaveBalance.SL.entitled - leaveBalance.SL.availed;
      const deductable = Math.min(available, days);

      leaveBalance.SL.availed += deductable;
      leaveBalance.pbc = (leaveBalance.pbc || 0) + deductable;

      if (days > deductable) {
        leaveBalance.lwp += days - deductable;
      }

      break;
    }

    case "ml": {
      const available = leaveBalance.ML;
      const deductable = Math.min(available, days);

      leaveBalance.ML -= deductable;
      leaveBalance.pbc = (leaveBalance.pbc || 0) + deductable;

      if (days > deductable) {
        leaveBalance.lwp += days - deductable;
      }

      break;
    }

    case "pl": {
      const available = leaveBalance.PL;
      const deductable = Math.min(available, days);

      leaveBalance.PL -= deductable;
      leaveBalance.pbc = (leaveBalance.pbc || 0) + deductable;

      if (days > deductable) {
        leaveBalance.lwp += days - deductable;
      }

      break;
    }

    case "half_day_el": {
      const days = 0.5;

      const available = Math.max(
        0,
        Number((leaveBalance.EL.accrued - leaveBalance.EL.availed).toFixed(2)),
      );

      const deductable = Math.min(available, days);

      leaveBalance.EL.availed = Number(
        (leaveBalance.EL.availed + deductable).toFixed(2),
      );

      leaveBalance.pbc = Number(
        ((leaveBalance.pbc || 0) + deductable).toFixed(2),
      );

      if (days > deductable) {
        leaveBalance.lwp = Number(
          ((leaveBalance.lwp || 0) + (days - deductable)).toFixed(2),
        );
      }

      break;
    }

    case "half_day_sl": {
      const days = 0.5;

      const available = Number(
        (leaveBalance.SL.entitled - leaveBalance.SL.availed).toFixed(2),
      );

      const deductable = Math.min(available, days);

      leaveBalance.SL.availed = Number(
        (leaveBalance.SL.availed + deductable).toFixed(2),
      );

      leaveBalance.pbc = Number(
        ((leaveBalance.pbc || 0) + deductable).toFixed(2),
      );

      if (days > deductable) {
        leaveBalance.lwp = Number(
          ((leaveBalance.lwp || 0) + (days - deductable)).toFixed(2),
        );
      }

      break;
    }

    default:
      leaveBalance.lwp += days;
  }

  await leaveBalance.save();
  return leaveBalance;
}

module.exports = { processLeaveDeduction, calculateLeaveDays };

