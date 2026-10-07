const { getISTDateParts, istDateFromYMD, startOfISTDay } = require("./Istdate.utils");

// Default rolling look-back for the attendance re-scan. Override with the
// ATTENDANCE_LOOKBACK_DAYS env var (e.g. ATTENDANCE_LOOKBACK_DAYS=60).
const DEFAULT_LOOKBACK_DAYS = 45;

const getLookbackDays = (override = null) => {
  const n = Number(override ?? process.env.ATTENDANCE_LOOKBACK_DAYS);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_LOOKBACK_DAYS;
};

// Works out which IST calendar months are touched by "today minus N days ..
// today". AttendanceSummary is a MONTHLY bucket that is always fully $set, and
// the monthly late rule (first N lates free, then half day) depends on every
// earlier late of that month - so a partial month can never be rebuilt safely.
// The window therefore expands to WHOLE months:
//   today = 7 Oct, N = 45  ->  window starts 23 Aug  ->  months Aug, Sep, Oct
//   (Aug is rebuilt from 1 Aug, not from 23 Aug).
//
// Returns:
//   days                 the look-back used
//   windowStart          IST midnight of (today - N days)
//   rangeStart           IST midnight of the 1st of the earliest touched month
//   rangeEndExclusive    IST midnight of the 1st of the month after today's
//   months               ["2026-8","2026-9","2026-10"]  (same "year-month"
//                        format recomputeSummaries() uses for opts.months)
const getLookbackWindow = (daysOverride = null, now = new Date()) => {
  const days = getLookbackDays(daysOverride);
  const windowStart = new Date(startOfISTDay(now).getTime() - days * 24 * 60 * 60 * 1000);

  const first = getISTDateParts(windowStart);
  const last = getISTDateParts(now);

  const months = [];
  let y = first.year;
  let m = first.month;
  while (y < last.year || (y === last.year && m <= last.month)) {
    months.push(`${y}-${m}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }

  const rangeStart = istDateFromYMD(first.year, first.month, 1);
  const rangeEndExclusive =
    last.month === 12 ? istDateFromYMD(last.year + 1, 1, 1) : istDateFromYMD(last.year, last.month + 1, 1);

  return { days, windowStart, rangeStart, rangeEndExclusive, months };
};

module.exports = { DEFAULT_LOOKBACK_DAYS, getLookbackDays, getLookbackWindow };