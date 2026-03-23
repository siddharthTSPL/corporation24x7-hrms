const Holidays = require("date-holidays");
const hd = new Holidays("IN", "DL");

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date) {
  return !!hd.isHoliday(date);
}

function isOffDay(date) {
  return isWeekend(date) || isHoliday(date);
}

function isSameDate(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isSandwichLeave(startDate, endDate, nextLeaveDate) {
  if (!nextLeaveDate) return false;

  const end = new Date(endDate);
  const nextLeave = new Date(nextLeaveDate);

  let check = new Date(end);
  check.setDate(check.getDate() + 1);

  let foundOffDay = false;

  while (isOffDay(check)) {
    foundOffDay = true;
    check.setDate(check.getDate() + 1);
  }
  if (foundOffDay && isSameDate(check, nextLeave)) {
    return true;
  }

  return false;
}

module.exports = { isSandwichLeave };