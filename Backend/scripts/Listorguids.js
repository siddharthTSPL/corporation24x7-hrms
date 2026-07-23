const mongoose = require("mongoose");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
require("dotenv").config();

// Paste the organisation_id you already saw printed by DiagnoseWeekoffMismatch.js
const ORG_ID = "6a4d34617113a285bf08dd96";

const run = async () => {
  const [users, managers, admins] = await Promise.all([
    User.find({ organisation_id: ORG_ID }).select("uid name working_status").lean(),
    Manager.find({ organisation_id: ORG_ID }).select("uid name working_status").lean(),
    Admin.find({ organisation_id: ORG_ID }).select("uid name working_status").lean(),
  ]);

  console.log("\n-- Employees (User) --");
  users.forEach((u) => console.log(`  ${u.uid}  ${u.name}  (${u.working_status})`));

  console.log("\n-- Managers --");
  managers.forEach((u) => console.log(`  ${u.uid}  ${u.name}  (${u.working_status})`));

  console.log("\n-- Admins --");
  admins.forEach((u) => console.log(`  ${u.uid}  ${u.name}  (${u.working_status})`));
};

mongoose.connect(process.env.LINK)
  .then(async () => {
    await run();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });