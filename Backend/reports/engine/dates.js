const {
  startOfISTDay,
  endOfISTDay,
  getISTDateParts,
  istDateFromYMD,
  parseISTDateOnly,
  IST_OFFSET_MINUTES,
} = require("../../utils/Istdate.utils");
const { httpError } = require("./errors");

const IST_MS = IST_OFFSET_MINUTES * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n) => String(n).padStart(2, "0");

/** Strict "YYYY-MM-DD" -> IST midnight. Throws 400 on anything else. */
function parseDateStrict(value, label = "date") {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) throw httpError(400, `${label} must be in YYYY-MM-DD format.`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    throw httpError(400, `${label} is not a valid calendar date.`);
  }
  return parseISTDateOnly(`${m[1]}-${m[2]}-${m[3]}`);
}

/** Strict "YYYY-MM" -> { year, month }. */
function parseMonthStrict(value, label = "month") {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
  if (!m) throw httpError(400, `${label} must be in YYYY-MM format.`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    throw httpError(400, `${label} is not a valid month.`);
  }
  return { year, month };
}

/** Inclusive IST day range [from 00:00, to 23:59:59.999]. */
function istRange(fromStr, toStr, { maxDays, labelFrom = "From date", labelTo = "To date" } = {}) {
  const from = startOfISTDay(parseDateStrict(fromStr, labelFrom));
  const to = endOfISTDay(parseDateStrict(toStr, labelTo));
  if (from > to) throw httpError(400, `${labelFrom} cannot be after ${labelTo}.`);
  const days = Math.round((startOfISTDay(to).getTime() - from.getTime()) / DAY_MS) + 1;
  if (maxDays && days > maxDays) {
    throw httpError(400, `Date range is too large (${days} days). Maximum allowed is ${maxDays} days.`);
  }
  return { from, to, days };
}

/** Every {year, month} from `a` to `b` inclusive (max 24 months). */
function monthsBetween(a, b, max = 24) {
  const out = [];
  let y = a.year;
  let m = a.month;
  while (y < b.year || (y === b.year && m <= b.month)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    if (out.length > max) throw httpError(400, `Period range is too large. Maximum ${max} months.`);
  }
  if (!out.length) throw httpError(400, "Period 'from' cannot be after 'to'.");
  return out;
}

// ---- formatting (all IST) -------------------------------------------------
function fmtDate(d) {
  if (!d) return "";
  const p = getISTDateParts(new Date(d));
  return `${pad2(p.day)}-${MONTHS[p.month - 1]}-${p.year}`;
}
function fmtTime(d) {
  if (!d) return "";
  const s = new Date(new Date(d).getTime() + IST_MS);
  return `${pad2(s.getUTCHours())}:${pad2(s.getUTCMinutes())}`;
}
function fmtDateTime(d) {
  return d ? `${fmtDate(d)} ${fmtTime(d)} IST` : "";
}
function fmtPeriod(year, month) {
  return `${MONTHS[month - 1]} ${year}`;
}
/** Excel has no time zones: shift so the cell SHOWS the IST wall-clock time. */
function toExcelDate(d) {
  return d ? new Date(new Date(d).getTime() + IST_MS) : null;
}

module.exports = {
  DAY_MS, IST_MS, startOfISTDay, endOfISTDay, getISTDateParts, istDateFromYMD,
  parseDateStrict, parseMonthStrict, istRange, monthsBetween,
  fmtDate, fmtTime, fmtDateTime, fmtPeriod, toExcelDate,
};
