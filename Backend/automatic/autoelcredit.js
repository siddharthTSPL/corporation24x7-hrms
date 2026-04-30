const cron = require("node-cron");
const LeaveBalance = require("../Models/leavebalance.model");
const { autoCheckoutAll } = require("../controllers/attendance.controller");


cron.schedule("0 0 1 * *", async () => {
  try {

    const today = new Date();
    const balances = await LeaveBalance.find();

    for (let balance of balances) {

      if (
        balance.mlStartDate &&
        balance.mlEndDate &&
        today >= balance.mlStartDate &&
        today <= balance.mlEndDate
      ) {

        const year = today.getFullYear();
        const month = today.getMonth();

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const start = new Date(balance.mlStartDate);
        const end = new Date(balance.mlEndDate);

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month, daysInMonth);

        const actualStart = start > monthStart ? start : monthStart;
        const actualEnd = end < monthEnd ? end : monthEnd;

        const diff =
          Math.floor((actualEnd - actualStart) / (1000 * 60 * 60 * 24)) + 1;

        balance.pbc = diff;

        await balance.save();
        continue;
      }

      balance.pbc = 0;
      await balance.save();
    }

    console.log("Monthly PBC calculation done");

  } catch (error) {
    console.error("PBC cron error:", error.message);
  }
});

cron.schedule("0 0 1 * *", async () => {
  try {
    const leaves = await LeaveBalance.find();
    console.log(leaves);
    for (let leave of leaves) {
      const monthlyEL = leave.EL.entitled / 12;
      const maxEL = leave.EL.entitled;
      if (leave.EL.accrued < maxEL) {
        leave.EL.accrued = Number((leave.EL.accrued + monthlyEL).toFixed(2));

        if (leave.EL.accrued > maxEL) {
          leave.EL.accrued = maxEL;
        }
        await leave.save();
      }
    }

    console.log("Monthly EL credited successfully");
  } catch (error) {
    console.error("Monthly EL credit error:", error.message);
  }
});

cron.schedule("0 0 1 1 *", async () => {
  try {
    const leaves = await LeaveBalance.find();

    for (let leave of leaves) {
      const remaining = leave.EL.accrued - leave.EL.availed;

      const carryForward = Number((remaining * 0.5).toFixed(2));

      leave.EL.accrued = carryForward;
      leave.EL.availed = 0;

      await leave.save();
    }

    console.log("Yearly EL carry forward applied successfully");
  } catch (error) {
    console.error("Yearly carry forward error:", error.message);
  }
});

cron.schedule("0 19 * * *", () => {
  console.log("[Cron] 7 PM auto checkout running...");
  autoCheckoutAll();
});