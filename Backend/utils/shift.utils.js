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

// Face-attendance-only status rule. Manual/System flow keeps using
// getShiftThresholds + calculateStatus (fixed absentBelowMinutes /
// halfDayBelowMinutes from the shift doc) - UNCHANGED, untouched.
//
// Face has no activity-ping tracking, so instead of fixed minute
// thresholds, worked time (raw checkin->checkout gap) is judged as a
// PERCENTAGE of that shift's own total length:
//   < 50% of shift length      -> absent
//   50% - 85% of shift length  -> half_day
//   >= 85% of shift length     -> present
const FACE_ABSENT_RATIO = 0.5;
const FACE_PRESENT_RATIO = 0.85;

const calculateFaceStatus = (workedMinutes, shift) => {
  const shiftMinutes = getShiftDurationMinutes(shift);
  const absentBelow = shiftMinutes * FACE_ABSENT_RATIO;
  const presentAtOrAbove = shiftMinutes * FACE_PRESENT_RATIO;

  if (workedMinutes < absentBelow) return "absent";
  if (workedMinutes < presentAtOrAbove) return "half_day";
  return "present";
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
  // Outside-shift buffer: check-in stays open from (shift start - earlyBuffer)
  // all the way through the shift and up to this many minutes AFTER shift
  // END. Anyone inside that whole range can check in (marked late if past
  // grace); only outside it is check-in blocked as "outside shift".
  const lateCutoff = shift.lateCheckinCutoffMinutes ?? 60;

  let windowStart = start - earlyBuffer;
  let windowEnd = overnight ? end + 1440 + lateCutoff : end + lateCutoff;
  let effectiveNow = nowMinutes;

  // Shift starts late at night and crosses midnight (e.g. 23:00-07:00): if
  // "now" is in the early-morning hours, it's really a continuation of
  // yesterday's shift-start window, so shift it forward a day to compare.
  if (overnight && nowMinutes <= end) effectiveNow = nowMinutes + 1440;

  if (windowStart < 0) {
    windowStart += 1440;
    windowEnd += 1440;
    if (effectiveNow < windowStart) effectiveNow += 1440;
  }

  // Late checkin is no longer hard-blocked. `allowed` only enforces the
  // early-buffer lower bound now; `tooLate` is kept purely as an
  // informational flag (past lateCheckinCutoffMinutes) so controllers can
  // show a "you're quite late, but welcome" message instead of a 403.
  const allowed = effectiveNow >= windowStart;
  const tooLate = effectiveNow > windowEnd;
  const lateEdge = start + grace;
  const isLate = effectiveNow > lateEdge;
  const lateMinutes = isLate ? effectiveNow - lateEdge : 0;

  return { allowed, isLate, lateMinutes, tooLate, windowStart, windowEnd };
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
  calculateFaceStatus,
  evaluateCheckinWindow,
  evaluateCheckoutWindow,
  getForceCheckoutInstant,
  ensureDefaultShift,
  resolveEmployeeShift,
};