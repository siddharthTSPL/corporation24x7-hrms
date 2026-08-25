const cron = require("node-cron");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const AssetModel = require("../Models/asset.model");
const { decrementActiveUserCount } = require("../utils/Licensecheck");
const { endOfISTDay } = require("../utils/Istdate.utils");
const { autoGenerateFnFForExit } = require("../controllers/Fnf.controller");

const MODEL_MAP = { User: User, Manager: Manager, Admin: Admin };

// For someone whose notice period lastWorkingDay has arrived: block the
// auto-exit if assets are still assigned to them, same rule the manual
// working-status endpoints enforce, so the notice period simply carries
// over to the next day's run until the admin revokes those assets.
const hasPendingAssets = async (organisation_id, employeeId, employeeModel) => {
  const count = await AssetModel.countDocuments({
    organisation_id,
    assignments: { $elemMatch: { assigned_to: employeeId, assigned_to_model: employeeModel, is_returned: false } },
  });
  return count > 0;
};

const processModel = async (Model, employeeModel, cutoff) => {
  const dueList = await Model.find({
    "noticePeriod.active": true,
    "noticePeriod.lastWorkingDay": { $lte: cutoff },
  })
    .select("_id organisation_id noticePeriod")
    .lean();

  let exited = 0;
  let blocked = 0;

  for (const person of dueList) {
    const { organisation_id, noticePeriod } = person;
    const exitType = noticePeriod.exitType;
    if (!exitType) continue;

    const blockedByAssets = await hasPendingAssets(organisation_id, person._id, employeeModel);
    if (blockedByAssets) {
      blocked += 1;
      console.warn(`[Notice Period Auto Exit] ${employeeModel} ${person._id} due but has pending assets. Skipped, will retry next run.`);
      continue;
    }

    await Model.updateOne(
      { _id: person._id },
      {
        $set: {
          working_status: exitType,
          status: "inactive",
          "noticePeriod.active": false,
        },
      }
    );
    await decrementActiveUserCount(organisation_id);

    try {
      await autoGenerateFnFForExit({
        organisation_id,
        employee: person._id,
        employeeModel,
        exitType,
        dateOfResignation: noticePeriod.initiatedOn || new Date(),
        lastWorkingDay: noticePeriod.lastWorkingDay,
      });
    } catch (e) {
      console.error(`[Notice Period Auto Exit] FnF auto-generation failed for ${employeeModel} ${person._id}:`, e.message);
    }

    exited += 1;
  }

  return { exited, blocked };
};

const runNoticePeriodAutoExit = async () => {
  try {
    const cutoff = endOfISTDay(new Date());

    const [userResult, managerResult, adminResult] = await Promise.all([
      processModel(User, "User", cutoff),
      processModel(Manager, "Manager", cutoff),
      processModel(Admin, "Admin", cutoff),
    ]);

    const totalExited = userResult.exited + managerResult.exited + adminResult.exited;
    const totalBlocked = userResult.blocked + managerResult.blocked + adminResult.blocked;
    if (totalExited || totalBlocked) {
      console.log(`[Notice Period Auto Exit] Exited ${totalExited}, blocked (pending assets) ${totalBlocked}`);
    }
  } catch (error) {
    console.error("[Notice Period Auto Exit] Error:", error.message);
  }
};

// Runs once a day, same slot family as the other nightly jobs. `timezone`
// is explicit for the same reason as Marknoshowabsent.js: node-cron reads
// the SERVER PROCESS's local timezone otherwise, not IST.
cron.schedule("15 0 * * *", runNoticePeriodAutoExit, { timezone: "Asia/Kolkata" });

module.exports = { runNoticePeriodAutoExit };