const Shift = require("../Models/shift.model");

const DEFAULT_SHIFT_NAME = "General Shift";
const DEFAULT_START = "10:00";
const DEFAULT_END = "19:00";

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const getISTMinutesOfDay = (date) => {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MINUTES) % 1440;
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

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

// Late is measured from (shift start + graceMinutes). Anyone inside the
// grace window is "on time"; lateMinutes is how far past the grace edge
// they are, not how far past the raw shift start.
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
  const lateEdge = start + grace;
  const isLate = effectiveNow > lateEdge;
  const lateMinutes = isLate ? effectiveNow - lateEdge : 0;

  return { allowed, isLate, lateMinutes, windowStart, windowEnd };
};

// checkInTime is required to gate the checkout scan: the scan is only
// accepted once minMinutesBeforeCheckout has passed since check-in. Once
// that gate is open, checkout is allowed at ANY time after — the remark
// below only describes when it happened relative to shift end, it never
// blocks the scan.
const evaluateCheckoutWindow = (shift, now = new Date(), checkInTime = null) => {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const overnight = end <= start;
  const grace = shift.graceMinutes ?? 15;
  const minMinutesBeforeCheckout = shift.minMinutesBeforeCheckout ?? 10;

  let nowMinutes = getISTMinutesOfDay(now);
  let effectiveEnd = end;
  if (overnight) {
    if (nowMinutes <= end) nowMinutes += 1440;
    effectiveEnd += 1440;
  }

  const diffMinutes = nowMinutes - effectiveEnd;

  const minutesSinceCheckin = checkInTime
    ? (now.getTime() - new Date(checkInTime).getTime()) / 60000
    : 0;

  const allowed = minutesSinceCheckin >= minMinutesBeforeCheckout;

  if (!allowed) {
    return {
      allowed,
      remark: null,
      isOvertime: false,
      overtimeMinutes: 0,
      earlyMinutes: 0,
      minutesUntilCheckoutOpens: Math.ceil(minMinutesBeforeCheckout - minutesSinceCheckin),
      onTimeWindowEnd: effectiveEnd + grace,
    };
  }

  if (diffMinutes < 0) {
    return {
      allowed,
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
      remark: "on_time",
      isOvertime: false,
      overtimeMinutes: 0,
      earlyMinutes: 0,
      onTimeWindowEnd: effectiveEnd + grace,
    };
  }
  return {
    allowed,
    remark: "overtime",
    isOvertime: true,
    overtimeMinutes: diffMinutes - grace,
    earlyMinutes: 0,
    onTimeWindowEnd: effectiveEnd + grace,
  };
};

// Returns the UTC instant at which an open session for this shift must be
// force-checked-out: shift end + maxOvertimeMinutes, on the IST calendar
// day the attendance record is dated. `attendanceDate` is expected to be
// an IST-midnight instant (i.e. produced by startOfISTDay, which is what
// every `date` field in this app is), so pure ms arithmetic on top of it
// is timezone-independent - no local Date getters/setters involved.
const getForceCheckoutInstant = (shift, attendanceDate) => {
  const start = toMinutes(shift.startTime);
  const end = toMinutes(shift.endTime);
  const overnight = end <= start;
  const maxOvertimeMinutes = shift.maxOvertimeMinutes ?? 60;

  // If the shift runs past midnight, shift end actually falls on the next
  // IST calendar day relative to the record's `date`.
  const endOffsetMinutes = overnight ? end + 1440 : end;
  const totalOffsetMinutes = endOffsetMinutes + maxOvertimeMinutes;

  return new Date(new Date(attendanceDate).getTime() + totalOffsetMinutes * 60000);
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
  getForceCheckoutInstant,
  ensureDefaultShift,
  resolveEmployeeShift,
};