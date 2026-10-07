/**
 * Re-scan attendance for the last N days (default 45) and fix everything that
 * changed after the fact: leaves approved/rejected late, late-rule half days,
 * half-day SL/EL, comp-off, no-show days, AttendanceSummary totals.
 *
 * This is the on-demand twin of the nightly job in automatic/Nightlyreconcile.js
 * - both use utils/Attendancewindow.utils.js, so they always cover the same
 * days.
 *
 * NOTE: AttendanceSummary is a monthly bucket, so the window is expanded to
 * WHOLE months (e.g. 45 days back from 7 Oct -> Aug, Sep, Oct are rebuilt
 * fully, Aug from 1 Aug).
 *
 * Usage (from project root, DRY RUN by default - nothing is written):
 *   node scripts/Rescanlastdays.js                 # preview, last 45 days
 *   node scripts/Rescanlastdays.js --apply         # actually update
 *   node scripts/Rescanlastdays.js --days=60 --apply
 *   node scripts/Rescanlastdays.js --apply --skip-late
 *   node scripts/Rescanlastdays.js --apply --org=<organisationId>
 *   node scripts/Rescanlastdays.js --apply --employee=<userId>   (employee role only)
 *
 * Flags:
 *   --apply            write changes (otherwise dry run)
 *   --days=N           look-back in days (default 45 / ATTENDANCE_LOOKBACK_DAYS)
 *   --org=<orgId>      limit BOTH steps (late rule + summary rebuild) to one organisation
 *   --employee=<id>    limit to one employee (employee role)
 *   --skip-late        skip the late-rule (3 free lates, then half day) step
 *
 * Take a DB backup first. Payroll already generated for the corrected months
 * is NOT regenerated automatically - regenerate it afterwards.
 */
const mongoose = require("mongoose");
require("dotenv").config();

const { recomputeLatePenalties } = require("../utils/Laterule.utils");
const { getLookbackWindow } = require("../utils/Attendancewindow.utils");
const { recomputeSummaries } = require("./Reconcileattendancesummaryleaveaware");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=")[1] : null;
};

const APPLY = flag("apply");
const SKIP_LATE = flag("skip-late");
const ORG = opt("org");
const EMPLOYEE = opt("employee");

(async () => {
  await mongoose.connect(process.env.LINK);

  const win = getLookbackWindow(opt("days"));
  console.log(
    `Re-scan last ${win.days} days (from ${win.windowStart.toISOString()}), ` +
    `months rebuilt: ${win.months.join(", ")}\n` +
    `Mode: ${APPLY ? "APPLY (writing changes)" : "DRY RUN (nothing written)"}\n`
  );

  if (!SKIP_LATE) {
    console.log("--- Step 1/2: late rule ---");
    await recomputeLatePenalties({
      rangeStart: win.rangeStart,
      rangeEndExclusive: win.rangeEndExclusive,
      apply: APPLY,
      organisation_id: ORG ? new mongoose.Types.ObjectId(ORG) : null,
      employee: EMPLOYEE ? new mongoose.Types.ObjectId(EMPLOYEE) : null,
    });
  }

  console.log("\n--- Step 2/2: leave-aware AttendanceSummary rebuild ---");
  await recomputeSummaries(
    APPLY,
    null,
    {
      months: win.months,
      ...(EMPLOYEE ? { employeeId: EMPLOYEE } : {}),
      ...(ORG ? { organisationId: ORG } : {}),
    }
  );

  console.log(APPLY ? "\nDone." : "\nDry run finished. Re-run with --apply to write.");
  process.exit(0);
})().catch((err) => {
  console.error("Rescan failed:", err);
  process.exit(1);
});