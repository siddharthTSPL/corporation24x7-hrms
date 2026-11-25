// IST-based period keys (the rest of the HRMS runs on IST, see Istdate.utils).
const { getISTDateParts, toISTKey, startOfISTDay } = require("../Istdate.utils");

const pad = (n) => String(n).padStart(2, "0");

// ISO-8601 week number for an IST calendar date.
const isoWeek = (date = new Date()) => {
  const { year, month, day } = getISTDateParts(date);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
};

const periodKeys = (date = new Date()) => {
  const { year, month } = getISTDateParts(date);
  const w = isoWeek(date);
  return { day: toISTKey(date), week: `${w.year}-W${pad(w.week)}`, month: `${year}-${pad(month)}` };
};

// "2026-11-04" -> previous / next calendar key
const shiftDayKey = (key, delta) => {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

const diffDays = (a, b) => {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

// Start of the IST week (Monday) / month for range queries.
const weekRange = (date = new Date()) => {
  const start = startOfISTDay(date);
  const { weekday } = getISTDateParts(date);
  const back = (weekday + 6) % 7;
  const from = new Date(start.getTime() - back * 86400000);
  return { from, to: new Date(from.getTime() + 7 * 86400000) };
};

const monthRange = (date = new Date()) => {
  const { year, month } = getISTDateParts(date);
  const { istDateFromYMD } = require("../Istdate.utils");
  const from = istDateFromYMD(year, month, 1);
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  return { from, to: istDateFromYMD(ny, nm, 1) };
};

module.exports = { periodKeys, shiftDayKey, diffDays, weekRange, monthRange, isoWeek, toISTKey };
