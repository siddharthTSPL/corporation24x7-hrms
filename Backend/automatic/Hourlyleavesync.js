const cron = require("node-cron");
const { syncLeaveStatuses } = require("../utils/Leavestatussync.utils");
const { recomputeSummaries } = require("../scripts/Reconcileattendancesummaryleaveaware");
const { getISTDateParts } = require("../utils/Istdate.utils");

// Runs every hour (IST) and re-applies APPROVED LEAVES on attendance, so
// whenever a leave gets approved - before, during or after the person checked
// in/out - the day counts as that leave, not as Present:
//   1) Attendance.status of every day inside an approved leave (last 45 days)
//      is corrected (utils/Leavestatussync.utils.js)
//   2) AttendanceSummary is rebuilt, leave-aware, for the current month plus
//      any older month where step 1 changed something.
//
// Hours 01:xx and 02:xx IST are skipped on purpose: markNoShowAbsences()
// ($inc at 1:15) and the nightly full rebuild (2:00) own that window, and a
// $set rebuild in between would let the 1:15 $inc double count.
let running = false;

const runHourlyLeaveSync = async ({ apply = true } = {}) => {
  if (running) return console.log("[Cron] hourly leave sync skipped - previous run still going");
  running = true;
  try {
    const { scanned, corrected, months } = await syncLeaveStatuses({ apply });
    const now = getISTDateParts(new Date());
    const toRebuild = new Set([`${now.year}-${now.month}`, ...months]);
    await recomputeSummaries(apply, null, { months: [...toRebuild] });
    console.log(`[Cron] hourly leave sync: scanned ${scanned}, corrected ${corrected}, rebuilt months ${[...toRebuild].join(", ")}`);
  } catch (err) {
    console.error("[Cron] hourly leave sync failed:", err.message);
  } finally {
    running = false;
  }
};

cron.schedule("10 0,3-23 * * *", () => runHourlyLeaveSync({ apply: true }), { timezone: "Asia/Kolkata" });

module.exports = { runHourlyLeaveSync };