const { classifyNonWorkingDay } = require("./weekoffcalendar");

function isSameDate(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * NOTE: now async — uses the org's configured HolidayPolicy / WeeklyOffSchedule
 * / Holiday calendar (see automatic/weekoffcalendar.js) instead of a hardcoded
 * Sat+Sun rule and a third-party India holiday package.
 *
 * organisation_id, employee, employeeModel are required so overrides and
 * rotational schedules resolve correctly for this specific person.
 */
async function isSandwichLeave(startDate, endDate, organisation_id, employee, employeeModel, nextLeaveDate) {
  if (!nextLeaveDate) return false;

  const nextLeave = new Date(nextLeaveDate);
  const check = new Date(endDate);
  check.setDate(check.getDate() + 1);

  let foundOffDay = false;
  // safety cap so a misconfigured/missing schedule can't loop forever
  let guard = 0;

  while (guard < 60) {
    const classification = await classifyNonWorkingDay(check, organisation_id, employee, employeeModel);

    if (classification.type === "holiday" || classification.type === "week_off") {
      foundOffDay = true;
      check.setDate(check.getDate() + 1);
      guard += 1;
      continue;
    }

    // "unconfigured" (rotational week never set by admin) or a working day both stop the scan
    break;
  }

  return foundOffDay && isSameDate(check, nextLeave);
}

module.exports = { isSandwichLeave };
