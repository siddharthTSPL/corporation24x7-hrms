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
  ensureDefaultShift,
  resolveEmployeeShift,
};