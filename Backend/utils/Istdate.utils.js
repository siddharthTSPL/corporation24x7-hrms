const IST_OFFSET_MINUTES = 5 * 60 + 30; // +05:30
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

/**
 * Returns a Date representing the start (00:00:00.000) of the IST calendar day
 * that `date` falls in. The returned Date is a normal UTC-based Date object
 * whose instant corresponds to IST midnight, so it can be safely stored/compared
 * against other Date values in MongoDB.
 */
function startOfISTDay(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

/**
 * Returns a Date representing the end (23:59:59.999) of the IST calendar day
 * that `date` falls in.
 */
function endOfISTDay(date = new Date()) {
  const start = startOfISTDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Returns { year, month (1-12), day, weekday (0=Sun..6=Sat) } for the IST
 * calendar day that `date` falls in. Use this instead of getFullYear() /
 * getMonth() / getDate() / getDay() directly on a Date - those read the
 * SERVER PROCESS's local timezone, which is only IST if someone remembered
 * to set TZ=Asia/Kolkata on that particular host. This is independent of
 * that entirely.
 */
function getISTDateParts(date = new Date()) {
  const shifted = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/**
 * Inverse of getISTDateParts: builds the UTC instant corresponding to IST
 * midnight of the given IST calendar Y/M/D. e.g. istDateFromYMD(2026,7,15)
 * -> 2026-07-14T18:30:00.000Z, matching how records are actually stored
 * (see startOfISTDay). Use this instead of `new Date(year, month-1, day)`
 * whenever the result will be compared against or stored as a `date` field.
 */
function istDateFromYMD(year, month, day) {
  const utcAsIST = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  return new Date(utcAsIST - IST_OFFSET_MS);
}

/** "YYYY-MM-DD" for the IST calendar day `date` falls in. */
function toISTKey(date = new Date()) {
  const { year, month, day } = getISTDateParts(date);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** IST weekday name ("sunday".."saturday") for the day `date` falls in. */
function dayNameIST(date = new Date()) {
  return DAY_NAMES[getISTDateParts(date).weekday];
}

module.exports = {
  startOfISTDay,
  endOfISTDay,
  getISTDateParts,
  istDateFromYMD,
  toISTKey,
  dayNameIST,
  IST_OFFSET_MINUTES,
  IST_OFFSET_MS,
};