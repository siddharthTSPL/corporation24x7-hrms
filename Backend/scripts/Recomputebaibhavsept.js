const mongoose = require("mongoose");
require("dotenv").config();
const { recomputeSummaries } = require("./Reconcileattendancesummaryleaveaware");

const EMPLOYEE_ID = "6a4f817eaefa81a0f12f7543";
const APPLY = process.argv.includes("--apply");

mongoose.connect(process.env.LINK)
  .then(async () => {
    await recomputeSummaries(APPLY, null, { employeeId: EMPLOYEE_ID, months: ["2026-9"] });
    await mongoose.disconnect();
  })
  .catch(async (err) => {
    console.error(err.message);
    await mongoose.disconnect();
    process.exit(1);
  });