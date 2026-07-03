const mongoose = require("mongoose");
const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const ManagerModel = require("../Models/manager.model");
const UserModel = require("../Models/user.model");

const syncActiveUserCounts = async () => {
  const orgs = await SuperAdminModel.find({}).select("_id organisation_name active_user_count").lean();

  console.log(`Found ${orgs.length} organisation(s)\n`);

  for (const org of orgs) {
    const [admins, managers, employees] = await Promise.all([
      AdminModel.countDocuments({ organisation_id: org._id, working_status: "working" }),
      ManagerModel.countDocuments({ organisation_id: org._id, working_status: "working" }),
      UserModel.countDocuments({ organisation_id: org._id, working_status: "working" }),
    ]);

    const realCount = Math.max(0, admins + managers + employees);
    const storedCount = org.active_user_count ?? 0;

    console.log(`Org: ${org.organisation_name} (${org._id})`);
    console.log(`  Stored active_user_count : ${storedCount}`);
    console.log(`  Real count (admins: ${admins} + managers: ${managers} + employees: ${employees}) = ${realCount}`);

    if (storedCount < 0) {
      console.log(`  ⚠️  Stored count was negative (${storedCount}) — this indicates an unguarded $inc decrement somewhere in the app.`);
    }

    if (realCount !== storedCount) {
      await SuperAdminModel.findByIdAndUpdate(org._id, { active_user_count: realCount });
      console.log(`  ✅ Synced: ${storedCount} → ${realCount}`);
    } else {
      console.log(`  ✓ Already in sync`);
    }

    console.log("");
  }

  console.log("Done.");
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await syncActiveUserCounts();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });