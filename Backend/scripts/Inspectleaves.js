const mongoose = require("mongoose");
require("dotenv").config();
const Leave = require("../Models/leave.model");
const User = require("../Models/user.model");
const { toISTKey } = require("../utils/Istdate.utils");

const APPROVED = ["approved_manager", "approved_reporting_manager", "approved_admin"];
const ids = process.argv.slice(2);

const run = async () => {
  if (!ids.length) return console.log("Usage: node scripts/Inspectleaves.js <employeeId> [<employeeId> ...]");
  for (const id of ids) {
    const u = await User.findById(id).select("f_name l_name").lean();
    console.log(`\n== ${u ? u.f_name + " " + u.l_name : id} ==`);
    const leaves = await Leave.find({ employee: id }).sort({ startDate: -1 }).limit(15).lean();
    if (!leaves.length) { console.log("Koi leave record nahi mila."); continue; }
    console.table(leaves.map((l) => ({
      from: toISTKey(l.startDate),
      to: toISTKey(l.endDate),
      type: l.leaveType,
      days: l.days,
      lwpDays: l.lwpDays,
      status: l.status,
      countsAsLeave: APPROVED.includes(l.status),
      applied: l.createdAt && toISTKey(l.createdAt),
      reason: (l.reason || "").slice(0, 25),
      remarks: (l.remarks || "").slice(0, 25),
      deleteAt: l.deleteAt ? toISTKey(l.deleteAt) : null,
    })));
  }
};

mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });