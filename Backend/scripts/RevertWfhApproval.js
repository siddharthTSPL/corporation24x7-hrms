// Reverts a WFH request that a manager approved by mistake back to "pending", so the manager can
// open Pending WFH in the panel and Forward / Approve / Reject it again from the UI.
//   approved_manager            -> pending_manager
//   approved_reporting_manager  -> pending_reporting_manager
// Only touches a request that is still in one of those states AND was approved by its current handler.
// A backup of the original document is saved first (collection: wfhs_backup_before_forward).
//
// Usage (dry run): node scripts/RevertWfhApproval.js <wfhId>
//       (apply)  : node scripts/RevertWfhApproval.js <wfhId> --apply
// Example        : node scripts/RevertWfhApproval.js 6b030dae09677bf4133d79c3 --apply
//
// Works from the backend root (node scripts/...) and from inside scripts/ (node RevertWfhApproval.js ...).
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const WFH = require("../Models/wfh.model");

const APPLY = process.argv.includes("--apply");
const [wfhId] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const REVERT_TO = {
  approved_manager: "pending_manager",
  approved_reporting_manager: "pending_reporting_manager",
};

const brief = (w) => ({
  _id: String(w._id),
  requester: String(w.requester),
  requesterModel: w.requesterModel,
  startDate: w.startDate,
  endDate: w.endDate,
  days: w.days,
  status: w.status,
  approvedBy: w.approvedBy ? String(w.approvedBy) : null,
  currentHandler: w.currentHandler ? String(w.currentHandler) : null,
  currentHandlerModel: w.currentHandlerModel,
  handlerChain: (w.handlerChain || []).map(String),
});

const run = async () => {
  if (!wfhId || !mongoose.isValidObjectId(wfhId)) return console.log("Usage: see top of file");

  console.log("Database:", mongoose.connection.name, APPLY ? "(APPLY mode)" : "(dry run - nothing will be changed)");

  const wfh = await WFH.findById(wfhId).lean();
  if (!wfh) return console.log("WFH request not found in this database. Check that .env LINK points to the right DB.");

  console.log("Before:", brief(wfh));

  const target = REVERT_TO[wfh.status];
  if (!target) return console.log(`Status is "${wfh.status}" - only approved_manager / approved_reporting_manager can be reverted. Nothing done.`);
  if (!wfh.approvedBy || String(wfh.approvedBy) !== String(wfh.currentHandler))
    return console.log("approvedBy is not the current handler - not the simple mistaken-approval case. Nothing done.");

  console.log(`Will change: status ${wfh.status} -> ${target}, approvedBy -> null`);
  if (!APPLY) return console.log("Dry run only. Add --apply to make the change.");

  await mongoose.connection
    .collection("wfhs_backup_before_forward")
    .replaceOne({ _id: wfh._id }, wfh, { upsert: true });
  console.log("Backup saved in collection wfhs_backup_before_forward");

  const res = await WFH.updateOne(
    { _id: wfh._id, status: wfh.status, approvedBy: wfh.approvedBy }, // guard: only if unchanged meanwhile
    { $set: { status: target, approvedBy: null, remarks: "" } }
  );
  console.log("modifiedCount:", res.modifiedCount);

  const after = await WFH.findById(wfhId).lean();
  console.log("After:", brief(after));
  console.log(
    res.modifiedCount === 1
      ? "Done. Open Pending WFH in the manager panel and Forward it."
      : "Not changed - the request was modified by someone else just now."
  );
};

mongoose
  .connect(process.env.LINK)
  .then(run)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });