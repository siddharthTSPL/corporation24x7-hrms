const Shift = require("../Models/shift.model");

const DEFAULT_SHIFT_NAME = "General Shift";
const DEFAULT_START = "10:00";
const DEFAULT_END = "19:00";

// Shift times (startTime/endTime) are always entered in IST. The server's
// OS clock may be in any timezone (UTC on most hosts), so .getHours()/
// .getMinutes() on a Date object cannot be trusted - they reflect whatever
// timezone the machine is set to, not IST. Deriving IST from UTC + a fixed
// +5:30 offset works correctly no matter what timezone the server runs in.
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const getISTMinutesOfDay = (date) => {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MINUTES) % 1440;
};

// Converts "HH:mm" -> minutes since midnight
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Handles overnight shifts (e.g. 22:00 -> 06:00)
const getShiftDurationMinutes = (shift) => {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  return end > start ? end - start : 1440 - start + end;
};

const getShiftThresholds = (shift) => {
  const duration = getShiftDurationMinutes(shift);
  return {
    durationMinutes: duration,
    absentBelowMinutes: shift.absentBelowMinutes ?? 120,
    halfDayBelowMinutes: shift.halfDayBelowMinutes ?? 180,
  };
};


const evaluateCheckinWindow = (shift, now = new Date()) => {
  const nowMinutes = getISTMinutesOfDay(now);
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const overnight = end <= start;

  const earlyBuffer = shift.earlyBufferMinutes ?? 60;
  const grace = shift.graceMinutes ?? 15;

  let windowStart = start - earlyBuffer;
  let windowEnd = end;
  let effectiveNow = nowMinutes;

  if (overnight) {
    if (nowMinutes <= end) effectiveNow = nowMinutes + 1440;
    windowEnd = end + 1440;
  }
  if (windowStart < 0) {
    windowStart += 1440;
    if (effectiveNow < windowStart) effectiveNow += 1440;
  }

  const allowed = effectiveNow >= windowStart && effectiveNow <= windowEnd;
  const isLate = effectiveNow > start + grace;

  return { allowed, isLate, windowStart, windowEnd };
};


// Same idea as evaluateCheckinWindow but for the checkout scan:
//   before shift end            -> "early_checkout"
//   end .. end+graceMinutes     -> "on_time"
//   after end+graceMinutes      -> "overtime" (+ how many minutes over)
// graceMinutes is reused for both edges (e.g. 10 min grace on a 10:00-19:00
// shift means checkin window 10:00-10:10 and checkout on-time window
// 19:00-19:10), which is what the kiosk flow asks for.
const evaluateCheckoutWindow = (shift, now = new Date()) => {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const overnight = end <= start;
  const grace = shift.graceMinutes ?? 15;

  let nowMinutes = getISTMinutesOfDay(now);
  let effectiveEnd = end;
  if (overnight) {
    if (nowMinutes <= end) nowMinutes += 1440;
    effectiveEnd += 1440;
  }

  const diffMinutes = nowMinutes - effectiveEnd;

  if (diffMinutes < 0) {
    return {
      remark: "early_checkout",
      isOvertime: false,
      overtimeMinutes: 0,
      earlyMinutes: Math.abs(diffMinutes),
      onTimeWindowEnd: effectiveEnd + grace,
    };
  }
  if (diffMinutes <= grace) {
    return {
      remark: "on_time",
      isOvertime: false,
      overtimeMinutes: 0,
      earlyMinutes: 0,
      onTimeWindowEnd: effectiveEnd + grace,
    };
  }
  return {
    remark: "overtime",
    isOvertime: true,
    overtimeMinutes: diffMinutes - grace,
    earlyMinutes: 0,
    onTimeWindowEnd: effectiveEnd + grace,
  };
};

const ensureDefaultShift = async (organisation_id) => {
  let defaultShift = await Shift.findOne({ organisation_id, isDefault: true });
  if (defaultShift) return defaultShift;

  defaultShift = await Shift.create({
    organisation_id,
    name: DEFAULT_SHIFT_NAME,
    startTime: DEFAULT_START,
    endTime: DEFAULT_END,
    isDefault: true,
  });
  return defaultShift;
};


const resolveEmployeeShift = async (userDoc, organisation_id) => {
  if (userDoc?.shift) {
    const assigned = await Shift.findOne({
      _id: userDoc.shift,
      organisation_id,
      isActive: true,
    }).lean();
    if (assigned) return assigned;
  }
  const fallback = await ensureDefaultShift(organisation_id);
  return fallback.toObject ? fallback.toObject() : fallback;
};

module.exports = {
  toMinutes,
  getShiftDurationMinutes,
  getShiftThresholds,
  evaluateCheckinWindow,
  evaluateCheckoutWindow,
  ensureDefaultShift,
  resolveEmployeeShift,
};