const cron = require("node-cron");
const LeaveBalance = require("../Models/leavebalance.model");
const { autoCheckoutAll } = require("../controllers/attendance.controller");

// Runs on the 1st of every month, midnight. On January 1st specifically,
// this single handler does BOTH steps in a guaranteed order:
//   1. Yearly EL carry-forward (50% of Dec 31's leftover accrued-availed)
//   2. January's own monthly accrual, applied on top of the carried-forward
//      number.
// These used to be two separate cron.schedule() calls that both matched
// "Jan 1, 00:00" and could fire in either order — if the monthly accrual
// ran first, the carry-forward would wrongly include January's freshly
// accrued EL in its 50% cut. Merging them into one handler removes the
// race entirely.
cron.schedule("0 0 1 * *", async () => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0 = January
    const isJanuary = month === 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month, daysInMonth);

    const balances = await LeaveBalance.find().lean();
    const ops = balances.map((balance) => {
      const $set = {};

      if (
        balance.mlStartDate &&
        balance.mlEndDate &&
        today >= new Date(balance.mlStartDate) &&
        today <= new Date(balance.mlEndDate)
      ) {
        const actualStart = new Date(balance.mlStartDate) > monthStart ? new Date(balance.mlStartDate) : monthStart;
        const actualEnd = new Date(balance.mlEndDate) < monthEnd ? new Date(balance.mlEndDate) : monthEnd;
        $set.pbc = Math.floor((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        $set.pbc = 0;
      }

      // --- EL: carry-forward first (Jan only), then this month's accrual ---
      let elAccrued = balance.EL.accrued;

      if (isJanuary) {
        elAccrued = Number(((balance.EL.accrued - balance.EL.availed) * 0.5).toFixed(2));
        $set["EL.availed"] = 0;
      }

      if (elAccrued < balance.EL.entitled) {
        elAccrued = Math.min(
          Number((elAccrued + balance.EL.entitled / 12).toFixed(2)),
          balance.EL.entitled
        );
      }
      $set["EL.accrued"] = elAccrued;

      // --- SL: plain monthly accrual every month, no carry-forward ---
      if (balance.SL.accrued < balance.SL.entitled) {
        $set["SL.accrued"] = Math.min(
          Number((balance.SL.accrued + balance.SL.entitled / 12).toFixed(2)),
          balance.SL.entitled
        );
      }

      return { updateOne: { filter: { _id: balance._id }, update: { $set } } };
    });

    if (ops.length) await LeaveBalance.bulkWrite(ops, { ordered: false });
    console.log(
      isJanuary
        ? "Yearly EL carry-forward + January accrual done"
        : "Monthly PBC + EL/SL accrual done"
    );
  } catch (error) {
    console.error("Monthly cron error:", error.message);
  }
});

cron.schedule("0 19 * * *", () => {
  autoCheckoutAll();
});