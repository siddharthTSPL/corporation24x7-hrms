/**
 * One-time migration: remove the legacy GLOBAL unique index on `uid`
 * (uid_1) from users / managers / admins.
 *
 * UIDs are generated per organisation (see automatic/uidgeneration.js) and the
 * schemas declare a compound unique index { uid, organisation_id }, so a
 * single-field unique index on `uid` is stale and wrongly blocks onboarding
 * when another organisation already has the same uid.
 *
 * Usage:
 *   node scripts/FixUidIndex.js          -> dry run (only prints)
 *   node scripts/FixUidIndex.js --apply  -> actually drops the stale index
 */
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");

const APPLY = process.argv.includes("--apply");

// A stale index = unique index whose key is ONLY { uid: 1 }
const isStaleUidIndex = (idx) => {
  const keys = Object.keys(idx.key || {});
  return idx.unique === true && keys.length === 1 && keys[0] === "uid";
};

const run = async () => {
  for (const Model of [User, Manager, Admin]) {
    const name = `${Model.modelName} (${Model.collection.collectionName})`;
    const indexes = await Model.collection.indexes();
    const stale = indexes.filter(isStaleUidIndex);

    console.log(`\n== ${name} ==`);
    indexes.forEach((i) =>
      console.log(`  ${i.name}  ${JSON.stringify(i.key)}  unique=${!!i.unique}`)
    );

    if (!stale.length) {
      console.log("  -> OK, no stale uid index.");
    }

    for (const idx of stale) {
      if (APPLY) {
        await Model.collection.dropIndex(idx.name);
        console.log(`  -> DROPPED ${idx.name}`);
      } else {
        console.log(`  -> would DROP ${idx.name} (run with --apply)`);
      }
    }

    // make sure the correct compound index exists
    if (APPLY) {
      await Model.createIndexes();
      console.log("  -> compound indexes ensured.");
    }
  }
};

mongoose
  .connect(process.env.LINK)
  .then(async () => {
    await run();
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });