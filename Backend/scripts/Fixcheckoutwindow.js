const mongoose = require("mongoose");
const Shift = require("../Models/shift.model");
require("dotenv").config();

// Sets minMinutesBeforeCheckout = 10 on every shift whose value is
// currently something else (e.g. 15). Run with node scripts/FixCheckoutWindow.js
//
// Pass an org id as the first CLI arg to limit it to one organisation,
// e.g.  node scripts/FixCheckoutWindow.js 6a4d34617113a285bf08dd96
// Leave it blank to fix shifts across ALL organisations.
const TARGET_MINUTES = 10;
const ORG_ID = process.argv[2] || null;

const run = async () => {
  const filter = {
    minMinutesBeforeCheckout: { $ne: TARGET_MINUTES },
    ...(ORG_ID ? { organisation_id: ORG_ID } : {}),
  };

  const before = await Shift.find(filter)
    .select("name organisation_id minMinutesBeforeCheckout")
    .lean();

  if (!before.length) {
    console.log(`Nothing to fix — all shifts already have minMinutesBeforeCheckout = ${TARGET_MINUTES}.`);
    return;
  }

  console.log(`Updating ${before.length} shift(s):`);
  before.forEach((s) =>
    console.log(`  ${s.name}  (org: ${s.organisation_id})  ${s.minMinutesBeforeCheckout} -> ${TARGET_MINUTES}`)
  );

  const result = await Shift.updateMany(filter, { $set: { minMinutesBeforeCheckout: TARGET_MINUTES } });
  console.log(`\nDone. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
};

mongoose
  .connect(process.env.LINK)
  .then(async () => {
    await run();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });