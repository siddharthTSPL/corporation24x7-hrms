/**
 * ORG-CE4C439F254A, 1 October 2026 ONLY.
 * Auto-checked-out day: enough hours -> present (1), short hours -> half_day (0.5)
 *
 *   node scripts/fixOct1.js          # dry run
 *   node scripts/fixOct1.js --apply  # save
 */
require("dotenv").config();
const mongoose = require("mongoose");
const SuperAdmin = require("../Models/superadmin.model");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");

const ORG_CODE = "ORG-CE4C439F254A";
const APPLY = process.argv.includes("--apply");
const MIN_FULL_DAY_HOURS = 8; // ASSUMPTION: set your real full-day hours

const IST_MS = (5 * 60 + 30) * 60 * 1000;
const FROM = new Date(Date.UTC(2026, 9, 1) - IST_MS); // 1 Oct 00:00 IST
const TO = new Date(Date.UTC(2026, 9, 2) - IST_MS);   // 2 Oct 00:00 IST

// ASSUMPTION: field names. The debug print below shows the real ones.
const hoursWorked = (r) => {
  const i = r.checkIn || r.checkInTime;
  const o = r.checkOut || r.checkOutTime;
  if (!i || !o) return 0;
  return (new Date(o) - new Date(i)) / 36e5;
};

(async () => {
  await mongoose.connect(process.env.LINK, { family: 4 });

  const org = await SuperAdmin.findOne({ organisation_id: ORG_CODE }).select("_id").lean();
  if (!org) throw new Error(`Org ${ORG_CODE} not found`);

  const all = await Attendance.find({
    organisation_id: org._id,
    date: { $gte: FROM, $lt: TO },
  }).lean();

  console.log(`Total records on 1 Oct: ${all.length}`);
  if (all[0]) console.log("Fields in a record:", Object.keys(all[0]).join(", "));
  all.forEach((r) =>
    console.log(` * ${r.employee} status=${r.status} auto=${r.autoCheckedOut} remark=${r.checkoutRemark} hours=${hoursWorked(r).toFixed(2)}`)
  );

  // Includes records the old script already changed (missed_checkout)
  const candidates = all.filter(
    (r) => r.autoCheckedOut === true || ["auto_overtime", "missed_checkout"].includes(r.checkoutRemark)
  );

  const changes = candidates
    .map((r) => ({ r, to: hoursWorked(r) >= MIN_FULL_DAY_HOURS ? "present" : "half_day" }))
    .filter(({ r, to }) => r.status !== to);

  console.log(`\n${changes.length} record(s) to change:`);
  changes.forEach(({ r, to }) => console.log(` - ${r.employee} ${r.status} -> ${to} (${hoursWorked(r).toFixed(2)}h)`));
  if (!APPLY) return console.log("\nDRY RUN - re-run with --apply to save.");

  let n = 0;
  for (const { r, to } of changes) {
    const res = await Attendance.updateOne({ _id: r._id, status: r.status }, { $set: { status: to } });
    if (!res.modifiedCount) continue;
    n++;

    let inc = null;
    if (r.status === "half_day" && to === "present") inc = { presentDays: 0.5, halfDays: -1 };
    else if (r.status === "present" && to === "half_day") inc = { presentDays: -0.5, halfDays: 1 };
    else if (r.status === "absent" && to === "present") inc = { absentDays: -1, presentDays: 1 };
    else if (r.status === "absent" && to === "half_day") inc = { absentDays: -1, presentDays: 0.5, halfDays: 1 };

    if (inc) await AttendanceSummary.updateOne({ employee: r.employee, role: r.role, month: 10, year: 2026 }, { $inc: inc });
  }
  console.log(`Done. ${n} record(s) updated.`);
})()
  .catch((e) => { console.error("FAILED:", e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());