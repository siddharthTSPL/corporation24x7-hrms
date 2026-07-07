const Shift = require("../Models/shift.model");

const DEFAULT_SHIFT_NAME = "General Shift";
const DEFAULT_START = "10:00";
const DEFAULT_END = "19:00";

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
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
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


// Same idea as evaluateCheckinWindow but for the checkout scan.
//   allowed:  now is within `checkoutBufferMinutes` of shift end,
//             OR at least `minHoursBeforeCheckout` have passed since checkin.
//             (guards against an accidental double-scan seconds after
//             checkin being treated as a real checkout)
//   remark:   before shift end            -> "early_checkout"
//             end .. end+graceMinutes      -> "on_time"
//             after end+graceMinutes       -> "overtime" (+ how many minutes over)
const evaluateCheckoutWindow = (shift, now = new Date(), checkinTime = null) => {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const overnight = end <= start;
  const grace = shift.graceMinutes ?? 15;
  const checkoutBuffer = shift.checkoutBufferMinutes ?? 10;
  const minMinutesSinceCheckin = (shift.minHoursBeforeCheckout ?? 3) * 60;

  let nowMinutes = now.getHours() * 60 + now.getMinutes();
  let effectiveEnd = end;
  if (overnight) {
    if (nowMinutes <= end) nowMinutes += 1440;
    effectiveEnd += 1440;
  }

  const diffMinutes = nowMinutes - effectiveEnd;

  const elapsedSinceCheckin = checkinTime
    ? (now.getTime() - checkinTime.getTime()) / 60000
    : Infinity;
  const nearShiftEnd = nowMinutes >= effectiveEnd - checkoutBuffer;
  const allowed = nearShiftEnd || elapsedSinceCheckin >= minMinutesSinceCheckin;

  const minutesUntilAllowed = allowed
    ? 0
    : Math.min(
        effectiveEnd - checkoutBuffer - nowMinutes,
        minMinutesSinceCheckin - elapsedSinceCheckin
      );

  if (diffMinutes < 0) {
    return {
      allowed,
      minutesUntilAllowed,
      remark: "early_checkout",
      isOvertime: false,
      overtimeMinutes: 0,
      earlyMinutes: Math.abs(diffMinutes),
      onTimeWindowEnd: effectiveEnd + grace,
    };
  }
  if (diffMinutes <= grace) {
    return {
      allowed,
      minutesUntilAllowed,
      remark: "on_time",
      isOvertime: false,
      overtimeMinutes: 0,
      earlyMinutes: 0,
      onTimeWindowEnd: effectiveEnd + grace,
    };
  }
  return {
    allowed,
    minutesUntilAllowed,
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