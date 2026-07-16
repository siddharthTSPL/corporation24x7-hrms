const mongoose = require("mongoose");
const Attendance = require("../Models/attendance.model");
const { startOfISTDay, toISTKey } = require("../utils/Istdate.utils");
require("dotenv").config();

const APPLY = process.argv.includes("--apply");
const SOURCE_RANK = { manual: 3, face: 2, agent: 1 };

const pickSurvivor = (docs) => {
  const withCheckout = docs.filter((d) => d.checkOut);
  const pool = withCheckout.length ? withCheckout : docs;
  return pool.sort(
    (a, b) => (SOURCE_RANK[b.source] || 0) - (SOURCE_RANK[a.source] || 0)
  )[0];
};

const mergeDuplicateAttendance = async () => {
  const all = await Attendance.find({}).lean();
  console.log(`Scanning ${all.length} attendance document(s)\n`);

  const groups = new Map();
  all.forEach((doc) => {
    if (!doc.date || !doc.employee) return;
    const key = `${doc.employee}_${toISTKey(new Date(doc.date))}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  });

  let dupGroups = 0;
  let docsToDelete = 0;
  let dateFixes = 0;

  for (const [key, docs] of groups.entries()) {
    const survivor = pickSurvivor(docs);
    const correctDate = startOfISTDay(new Date(survivor.date));
    const toDelete = docs.filter((d) => d._id.toString() !== survivor._id.toString());

    if (toDelete.length > 0) {
      dupGroups++;
      docsToDelete += toDelete.length;
      console.log(
        `[DUPLICATE] key=${key} keeping=${survivor._id} (source=${survivor.source}, status=${survivor.status}, checkOut=${!!survivor.checkOut}) deleting=[${toDelete.map((d) => d._id).join(", ")}]`
      );
      const lwpRisk = toDelete.filter((d) => d.checkOut && (d.status === "absent" || d.status === "half_day"));
      if (lwpRisk.length > 0) {
        console.log(
          `  ⚠️  LWP RISK: ${lwpRisk.length} of the deleted doc(s) had a real checkout with status absent/half_day — ` +
          `employee ${lwpRisk[0].employee} may have had LWP double-counted for this day. Review LeaveBalance manually.`
        );
      }
      if (APPLY) {
        await Attendance.deleteMany({ _id: { $in: toDelete.map((d) => d._id) } });
      }
    }

    if (new Date(survivor.date).getTime() !== correctDate.getTime()) {
      dateFixes++;
      console.log(`[DATE-FIX] ${survivor._id}: ${survivor.date} → ${correctDate.toISOString()}`);
      if (APPLY) {
        await Attendance.findByIdAndUpdate(survivor._id, { $set: { date: correctDate } });
      }
    }
  }

  console.log(`\n${dupGroups} duplicate group(s) found, ${docsToDelete} document(s) ${APPLY ? "deleted" : "would be deleted"}.`);
  console.log(`${dateFixes} document(s) ${APPLY ? "had their date field corrected" : "would have their date field corrected"}.`);
  if (!APPLY) {
    console.log("\nDRY RUN — nothing was changed. Re-run with --apply to actually delete/fix.");
    console.log("Note: this script only merges duplicate Attendance documents.");
    console.log("It does NOT touch AttendanceSummary or LeaveBalance (LWP) — review those manually for affected employees/months before/after applying.");
  }
};

mongoose.connect(process.env.LINK)
  .then(async () => {
    await mergeDuplicateAttendance();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });