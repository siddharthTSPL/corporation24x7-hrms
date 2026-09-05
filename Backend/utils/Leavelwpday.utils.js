const { startOfDay } = require("../automatic/weekoffcalendar");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// True if `date` falls inside the LWP-shortfall portion of `leave`
// (any object with startDate, endDate, lwpDays - a Leave/ManagerLeave/
// AdminLeave document, or a plain {startDate,endDate,lwpDays} range).
//
// Convention: balance is consumed chronologically from startDate, so the
// LAST `lwpDays` calendar days of [startDate, endDate] are the LWP ones -
// this matches how the days would land if the employee had applied for
// each day one at a time (paid days first, LWP once balance runs out).
// See the `lwpDays` field comment on Models/leave.model.js.
//
// A leave with lwpDays === 0 (fully covered by balance, or an explicit
// leaveType:"lwp" application - already excluded upstream wherever the
// leaveType !== "lwp" filter is used) always returns false here, i.e.
// every day of it is treated as paid/excused as before.
function isDateInLwpPortion(leave, date) {
  const lwpDays = leave.lwpDays || 0;
  if (lwpDays <= 0) return false;

  const start = startOfDay(leave.startDate);
  const end = startOfDay(leave.endDate);
  const d = startOfDay(date);
  if (d < start || d > end) return false;

  // Round up so a fractional lwpDays (e.g. 0.5 for a half-day shortfall)
  // still correctly marks the single day it falls on as LWP.
  const lwpSpanDays = Math.ceil(lwpDays);
  const lwpStart = new Date(end.getTime() - (lwpSpanDays - 1) * MS_PER_DAY);
  return d >= lwpStart;
}

// Decides what an approved leave says a given date's attendance SHOULD be,
// independent of whatever check-in/check-out/activeMinutes produced. This is
// the single rule for "an approved leave always outranks the checkin-based
// status": no matter how much someone actually worked that day (even a full
// present-worthy session before auto-checkout), once a leave is approved for
// that date, the leave's own type decides the day, not the clock.
//
//   - half_day_el / half_day_sl -> "half_day" (matches what the person
//     actually applied for - a half day, not a full day off)
//   - el / sl / ml / pl / lwp   -> "absent" (the attendance enum has no
//     dedicated "leave" value; a full day covered by leave is not a worked
//     day, so "absent" is the correct bucket - whether it's PAID or not is
//     answered separately by isPaidForThisDate)
//
// isPaidForThisDate is false for leaveType "lwp", and also false for any
// specific date that falls inside an otherwise-paid leave's lwpDays
// shortfall portion (see isDateInLwpPortion above) - i.e. it answers "is
// this exact calendar day excused/paid", not just "is this leave paid".
function resolveLeaveDayOverride(leave, date) {
  const isHalfDay = typeof leave.leaveType === "string" && leave.leaveType.startsWith("half_day");
  const isPaidForThisDate = leave.leaveType !== "lwp" && !isDateInLwpPortion(leave, date);
  return { status: isHalfDay ? "half_day" : "absent", isPaidForThisDate };
}

module.exports = { isDateInLwpPortion, resolveLeaveDayOverride };