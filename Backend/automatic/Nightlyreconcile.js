const cron = require("node-cron");
const { recomputeSummaries } = require("../scripts/Reconcileattendancesummaryleaveaware");
const { recomputeLatePenalties } = require("../utils/Laterule.utils");
const { getLookbackWindow } = require("../utils/Attendancewindow.utils");

// Runs every night at 2 AM IST, 45 minutes after markNoShowAbsences() (see
// Marknoshowabsent.js, 1:15 AM IST) so that job has already finished writing
// its $inc's for "yesterday" before this does its full $set rebuild.
//
// ROLLING 45-DAY RE-SCAN (was: current + previous month only).
// Leaves are often approved/rejected days or weeks later, and timesheets are
// filled late, so every night the whole look-back window is re-checked for ALL
// employees/managers/admins:
//   - window = last 45 days (ATTENDANCE_LOOKBACK_DAYS env var overrides)
//   - expanded to whole IST months, because AttendanceSummary is a monthly
//     bucket and the late rule counts lates month-wise (see
//     utils/Attendancewindow.utils.js).
// The same logic can be run on demand with scripts/Rescanlastdays.js.
const runRollingReconcile = async ({ apply = true, days = null } = {}) => {
  const win = getLookbackWindow(days);
  console.log(`[Cron] Rolling ${win.days}-day attendance re-scan: months ${win.months.join(", ")}`);

  try {
    // 1) Self-heal the monthly late rule (first N lates free, then Half Day)
    //    BEFORE summaries are rebuilt.
    await recomputeLatePenalties({
      rangeStart: win.rangeStart,
      rangeEndExclusive: win.rangeEndExclusive,
      apply,
    });
  } catch (err) {
    console.error("[Cron] late-rule self-heal failed:", err.message);
  }

  // 2) Rebuild AttendanceSummary (also re-applies approved/rejected leaves,
  //    half-day SL/EL, comp-off) for every month the window touches.
  try {
    await recomputeSummaries(apply, null, { months: win.months });
  } catch (err) {
    console.error("[Cron] nightlyReconcile failed:", err.message);
  }
};

cron.schedule("0 2 * * *", () => runRollingReconcile({ apply: true }), { timezone: "Asia/Kolkata" });

module.exports = { recomputeSummaries, runRollingReconcile };