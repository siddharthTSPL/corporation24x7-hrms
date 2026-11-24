require("dotenv").config();
const mongoose = require("mongoose");
const PayrollPolicy = require("../Models/payrollpolicy.model");

(async () => {
  await mongoose.connect(process.env.LINK);
  const ceiling = await PayrollPolicy.updateMany(
    { "pf.wageCeiling": { $lt: 25000 } },
    { $set: { "pf.wageCeiling": 25000 } }
  );
  const overtime = await PayrollPolicy.updateMany(
    { "timesheetSync.overtimeMultiplier": { $lt: 2 } },
    { $set: { "timesheetSync.overtimeMultiplier": 2 } }
  );
  console.log("pf.wageCeiling updated:", ceiling.modifiedCount);
  console.log("overtimeMultiplier updated:", overtime.modifiedCount);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
