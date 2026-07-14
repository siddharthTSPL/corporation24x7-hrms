const cron = require("node-cron");
const LeaveBalance = require("../Models/leavebalance.model");
const { autoCheckoutAll } = require("../controllers/attendance.controller");

cron.schedule("0 0 1 * *", async () => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
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

      const elYearly = balance.EL.yearlyEntitled ?? balance.EL.entitled;
      let elEntitled = balance.EL.entitled;
      let elAccrued = balance.EL.accrued;

      if (isJanuary) {
        elAccrued = Number(((balance.EL.accrued - balance.EL.availed) * 0.5).toFixed(2));
        elEntitled = elYearly;
        $set["EL.availed"] = 0;
        $set["EL.entitled"] = elEntitled;
      }

      if (elAccrued < elEntitled) {
        elAccrued = Math.min(
          Number((elAccrued + elYearly / 12).toFixed(2)),
          elEntitled
        );
      }
      $set["EL.accrued"] = elAccrued;

      if (isJanuary) {
        const slYearly = balance.SL.yearlyEntitled ?? balance.SL.entitled;
        $set["SL.entitled"] = slYearly;
        $set["SL.availed"] = 0;
      }

      return { updateOne: { filter: { _id: balance._id }, update: { $set } } };
    });

    if (ops.length) await LeaveBalance.bulkWrite(ops, { ordered: false });
    console.log(
      isJanuary
        ? "Yearly EL carry-forward + January accrual done"
        : "Monthly PBC + EL accrual done"
    );
  } catch (error) {
    console.error("Monthly cron error:", error.message);
  }
});

cron.schedule("0 19 * * *", () => {
  autoCheckoutAll();
});