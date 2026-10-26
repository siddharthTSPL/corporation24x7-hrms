const { parseMonthStrict, monthsBetween, istDateFromYMD, endOfISTDay, startOfISTDay, getISTDateParts, fmtPeriod } = require("../engine/dates");
const { F } = require("./_shared");

/** "YYYY-MM" offset months from the current IST month (negative = past). */
const monthOffset = (n) => () => {
  const p = getISTDateParts(new Date());
  const d = new Date(Date.UTC(p.year, p.month - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// Frontend reads `defaultOffsetMonths` (functions do not survive JSON).
const TREND_FILTERS = [
  { key: "fromMonth", label: "From Month", type: "month", required: true, default: monthOffset(-5), defaultOffsetMonths: -5 },
  { key: "toMonth", label: "To Month", type: "month", required: true, default: monthOffset(0), defaultOffsetMonths: 0 },
  F.department,
];

function monthSpan(f, max = 24) {
  const from = parseMonthStrict(f.fromMonth);
  const to = parseMonthStrict(f.toMonth || f.fromMonth);
  return monthsBetween(from, to, max).map(({ year, month }) => {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      year, month, key: `${year}-${String(month).padStart(2, "0")}`, label: fmtPeriod(year, month),
      start: startOfISTDay(istDateFromYMD(year, month, 1)), end: endOfISTDay(istDateFromYMD(year, month, last)),
    };
  });
}
const rangeText = (f) => {
  const m = monthSpan(f);
  return m.length === 1 ? m[0].label : `${m[0].label} to ${m[m.length - 1].label}`;
};

module.exports = { TREND_FILTERS, monthSpan, rangeText, monthOffset };
