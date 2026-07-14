const mongoose = require("mongoose");
const LeaveBalance = require("../Models/leavebalance.model");
require("dotenv").config();

const recalculateCurrentYearEntitlement = async () => {
  const currentYear = new Date().getFullYear();

  const balances = await LeaveBalance.find({}).lean();
  const thisYearBalances = balances.filter(
    (b) => new Date(b.createdAt).getFullYear() === currentYear
  );

  console.log(`Found ${thisYearBalances.length} leave balance document(s) created in ${currentYear}\n`);

  let updated = 0;

  for (const balance of thisYearBalances) {
    const joinMonth = new Date(balance.createdAt).getMonth();
    const remainingMonths = 12 - joinMonth;

    const yearlyEL = balance.EL?.yearlyEntitled ?? balance.EL?.entitled ?? 0;
    const yearlySL = balance.SL?.yearlyEntitled ?? balance.SL?.entitled ?? 0;

    const proratedEL = Number(((yearlyEL / 12) * remainingMonths).toFixed(2));
    const proratedSL = Number(((yearlySL / 12) * remainingMonths).toFixed(2));

    const $set = {
      "EL.entitled": proratedEL,
      "EL.yearlyEntitled": yearlyEL,
      "SL.entitled": proratedSL,
      "SL.yearlyEntitled": yearlySL,
    };

    if ((balance.EL?.availed || 0) > proratedEL) {
      console.log(`  ⚠️  Employee ${balance.employee}: EL availed (${balance.EL.availed}) exceeds new prorated entitled (${proratedEL}) — skipping EL for this one, review manually`);
      delete $set["EL.entitled"];
    }

    if ((balance.SL?.availed || 0) > proratedSL) {
      console.log(`  ⚠️  Employee ${balance.employee}: SL availed (${balance.SL.availed}) exceeds new prorated entitled (${proratedSL}) — skipping SL for this one, review manually`);
      delete $set["SL.entitled"];
    }

    await LeaveBalance.findByIdAndUpdate(balance._id, { $set });
    console.log(`Employee ${balance.employee}: joined month ${joinMonth + 1}, remainingMonths ${remainingMonths} → EL ${balance.EL?.entitled} → ${$set["EL.entitled"] ?? "(unchanged)"}, SL ${balance.SL?.entitled} → ${$set["SL.entitled"] ?? "(unchanged)"}`);
    updated += 1;
  }

  console.log(`\nDone. ${updated} document(s) processed.`);
};

mongoose.connect(process.env.LINK)
  .then(async () => {
    await recalculateCurrentYearEntitlement();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });