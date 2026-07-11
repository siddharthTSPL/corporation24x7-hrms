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

module.exports = { startOfISTDay, endOfISTDay, IST_OFFSET_MINUTES };