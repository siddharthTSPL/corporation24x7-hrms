const mongoose = require("mongoose");

// Ledger of no-show-absent days already applied to AttendanceSummary.
//
// markNoShowAbsences() has no other reliable way to tell "have I already
// counted this employee/day?" — a genuine no-show day never gains an
// Attendance record (that's the whole point of it), so the "does an
// Attendance record already exist" check that normally prevents re-entry
// never flips to true for these days. Without this ledger, re-invoking
// markNoShowAbsences() for the same date — which happens by design every
// time catchUpMissedRuns() sweeps the last few days on server boot, on top
// of the nightly cron already having covered the same day — would $inc
// absentDays / weekOffHolidayDays again on every single re-run.
const noShowLogSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

// The unique index is the actual guard: markNoShowAbsences() tries to
// insert a log row before incrementing anything, and treats the resulting
// duplicate-key error as "already processed, skip" rather than a real
// failure.
noShowLogSchema.index({ employee: 1, role: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("NoShowLog", noShowLogSchema);