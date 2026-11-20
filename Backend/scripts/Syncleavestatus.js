/**
 * On-demand twin of automatic/Hourlyleavesync.js - fixes every day that sits
 * inside an approved leave (Present -> leave) and rebuilds AttendanceSummary.
 *
 *   node scripts/Syncleavestatus.js                  # dry run, last 45 days
 *   node scripts/Syncleavestatus.js --apply
 *   node scripts/Syncleavestatus.js --apply --days=90 --org=<organisationId>
 */
const mongoose = require("mongoose");
require("dotenv").config();
const { syncLeaveStatuses } = require("../utils/Leavestatussync.utils");
const { recomputeSummaries } = require("./Reconcileattendancesummaryleaveaware");
const { getISTDateParts } = require("../utils/Istdate.utils");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const opt = (n) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : null; };

(async () => {
  await mongoose.connect(process.env.LINK);
  const org = opt("org");
  const res = await syncLeaveStatuses({
    apply: APPLY,
    days: opt("days"),
    organisationId: org ? new mongoose.Types.ObjectId(org) : null,
  });
  console.log(`Scanned ${res.scanned}, ${APPLY ? "corrected" : "would correct"} ${res.corrected}`);
  const now = getISTDateParts(new Date());
  const months = [...new Set([`${now.year}-${now.month}`, ...res.months])];
  await recomputeSummaries(APPLY, null, { months, ...(org ? { organisationId: org } : {}) });
  console.log(APPLY ? "Done." : "Dry run - re-run with --apply.");
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });