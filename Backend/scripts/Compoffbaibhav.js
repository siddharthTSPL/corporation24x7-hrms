const mongoose = require("mongoose");
require("dotenv").config();
const Leave = require("../Models/leave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const User = require("../Models/user.model");
const { processLeaveDeduction } = require("../automatic/calculateleave");
const { recomputeSummaries } = require("./Reconcileattendancesummaryleaveaware");
const { parseISTDateOnly } = require("../utils/Istdate.utils");

const EMPLOYEE_ID = "6a4f817eaefa81a0f12f7543";
const COMP_OFF_DATE = "2026-09-29";
const APPLY = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(process.env.LINK);

  const user = await User.findById(EMPLOYEE_ID).select("f_name l_name work_email organisation_id Under_manager").lean();
  if (!user) throw new Error("Employee not found");
  if (!user.Under_manager) throw new Error("Employee has no Under_manager");

  const start = parseISTDateOnly(COMP_OFF_DATE);
  const end = parseISTDateOnly(COMP_OFF_DATE);

  const overlap = await Leave.findOne({
    employee: user._id,
    startDate: { $lte: end },
    endDate: { $gte: start },
    status: { $in: ["pending_manager", "approved_manager", "approved_admin", "forwarded_admin", "pending_admin"] },
  }).lean();
  if (overlap) {
    console.log(`Already a leave on this date: _id=${overlap._id} type=${overlap.leaveType} status=${overlap.status}. Aborting.`);
    await mongoose.disconnect();
    return;
  }

  const balance = await LeaveBalance.findOne({ employee: user._id }).lean();
  if (!balance) throw new Error("Leave balance not found");

  console.log(`Employee: ${user.f_name} ${user.l_name || ""} (${user._id})`);
  console.log(`Comp off date: ${COMP_OFF_DATE} -> ${start.toISOString()}`);
  console.log(`pbc before: ${balance.pbc || 0}`);

  if (!APPLY) {
    console.log("\nDRY RUN - kuch change nahi hua. --apply ke saath dobara run karo.");
    await recomputeSummaries(false, null, { employeeId: String(user._id) });
    await mongoose.disconnect();
    return;
  }

  const leave = await Leave.create({
    organisation_id: user.organisation_id,
    employee: user._id,
    manager: user.Under_manager,
    applicantName: `${user.f_name} ${user.l_name || ""}`.trim(),
    applicantEmail: user.work_email,
    applicantRole: "Employee",
    leaveType: "comp_off",
    startDate: start,
    endDate: end,
    days: 1,
    reason: "Compensatory off for 29 September",
    status: "approved_manager",
    approvedBy: user.Under_manager,
    approvedByModel: "Manager",
    remarks: "Approved manually",
  });

  const updatedBalance = await processLeaveDeduction(leave);
  console.log(`Comp off created: ${leave._id}, pbc after: ${updatedBalance?.pbc}`);

  await recomputeSummaries(true, null, { employeeId: String(user._id) });

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});