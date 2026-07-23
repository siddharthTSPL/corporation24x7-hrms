const cron = require("node-cron");
const { recomputeSummaries } = require("../scripts/Reconcileattendancesummaryleaveaware");

// Runs every night, 45 minutes after markNoShowAbsences() (see
// Marknoshowabsent.js, 1:15 AM IST) so that job has already finished
// writing its $inc's for "yesterday" before this does its full $set
// rebuild for the same day.
//
// This exists because AttendanceSummary drift isn't a one-time historical
// problem - it's an ONGOING one as long as any client (old desktop-agent
// builds, retried requests, etc) can still create an Attendance record
// that isn't a real check-in (see the activity() weekoff/holiday guard and
// the source:"agent" exclusion added to markNoShowAbsences/reconcile).
// Rather than requiring someone to notice a mismatch on the dashboard and
// run scripts/Reconcileattendancesummaryleaveaware.js --apply by hand
// every time, this applies the same full recompute automatically every
// night for the whole organisation (all employees, all roles, in one
// pass - recomputeSummaries() already operates on Attendance.find({}),
// not per-employee), so numbers self-heal within 24 hours even if a new
// stray record slips through.
cron.schedule(
  "0 2 * * *",
  () => {
    recomputeSummaries(true).catch((err) =>
      console.error("[Cron] nightlyReconcile failed:", err.message)
    );
  },
  { timezone: "Asia/Kolkata" }
);

module.exports = { recomputeSummaries };