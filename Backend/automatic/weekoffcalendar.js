const HolidayPolicy = require("../Models/holidaypolicy.model");
const WeeklyOffSchedule = require("../Models/weeklyoffschedule.model");
const Holiday = require("../Models/holiday.model");
const EmployeeWeekOffOverride = require("../Models/employeeweekoffoverride.model");
const WeekOffGroup = require("../Models/weekoffgroup.model");

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function dayName(date) {
  return DAY_NAMES[new Date(date).getDay()];
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00:00 of the week that `date` falls in. */
function getWeekStart(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

/**
 * Returns { isOff: boolean, reason: string, unconfigured?: boolean }
 * reason is one of: "sunday", "sat_sun", "rotational", "override", "unconfigured", "working"
 *
 * IMPORTANT: for "rotational" org policy, if no WeeklyOffSchedule entry
 * exists for that week, this does NOT guess. It returns
 * { isOff: false, reason: "unconfigured", unconfigured: true } so the
 * caller (report generator) can flag it for the admin instead of
 * silently producing a wrong report.
 */
async function isWeekOff(date, organisation_id, employee = null, employeeModel = null) {
  const checkDate = startOfDay(date);
  const dName = dayName(checkDate);

  // 1. Individual override always wins
  if (employee) {
    const override = await EmployeeWeekOffOverride.findOne({
      organisation_id,
      employee,
      employeeModel,
      isActive: true,
    }).lean();

    if (override) {
      if (override.weekOffType === "sunday") {
        return { isOff: dName === "sunday", reason: "override" };
      }
      if (override.weekOffType === "sat_sun") {
        return { isOff: dName === "saturday" || dName === "sunday", reason: "override" };
      }
      if (override.weekOffType === "custom_fixed_days") {
        return {
          isOff: (override.fixedOffDays || []).includes(dName),
          reason: "override",
        };
      }
      // override says "rotational" -> fall through to org rotational schedule below
    }
  }

  // 2. Org-level policy
  const policy = await HolidayPolicy.findOne({ organisation_id }).lean();
  const weekOffType = policy?.weekOffType || "sunday"; // safe default if never configured

  if (weekOffType === "sunday") {
    return { isOff: dName === "sunday", reason: "sunday" };
  }

  if (weekOffType === "sat_sun") {
    return { isOff: dName === "saturday" || dName === "sunday", reason: "sat_sun" };
  }

  // 3. Rotational -> must be explicitly set for this week, per group
  const weekStart = getWeekStart(checkDate);

  let groupId = null;
  if (employee) {
    const group = await WeekOffGroup.findOne({
      organisation_id,
      isActive: true,
      members: { $elemMatch: { employee, employeeModel } },
    })
      .select("_id")
      .lean();
    groupId = group ? group._id : null;
  }

  // Try the employee's specific group first, fall back to the
  // ungrouped/default entry (group: null) if they're not in a named group
  // or that group has no entry for this week.
  let schedule = await WeeklyOffSchedule.findOne({
    organisation_id,
    weekStartDate: weekStart,
    group: groupId,
  }).lean();

  if (!schedule && groupId) {
    schedule = await WeeklyOffSchedule.findOne({
      organisation_id,
      weekStartDate: weekStart,
      group: null,
    }).lean();
  }

  if (!schedule) {
    return { isOff: false, reason: "unconfigured", unconfigured: true };
  }

  return {
    isOff: schedule.offDays.includes(dName),
    reason: "rotational",
  };
}

/** Returns { isHoliday: boolean, name?: string } */
async function isHoliday(date, organisation_id) {
  const checkDate = startOfDay(date);
  const holiday = await Holiday.findOne({
    organisation_id,
    date: checkDate,
  }).lean();

  return holiday ? { isHoliday: true, name: holiday.name } : { isHoliday: false };
}

/**
 * Combined single-day classification used by the report generator.
 * Returns one of: "holiday" | "week_off" | "unconfigured" | null (working day)
 */
async function classifyNonWorkingDay(date, organisation_id, employee = null, employeeModel = null) {
  const holiday = await isHoliday(date, organisation_id);
  if (holiday.isHoliday) return { type: "holiday", name: holiday.name };

  const weekOff = await isWeekOff(date, organisation_id, employee, employeeModel);
  if (weekOff.unconfigured) return { type: "unconfigured" };
  if (weekOff.isOff) return { type: "week_off", reason: weekOff.reason };

  return { type: null };
}

/**
 * Ensures a WeeklyOffSchedule entry exists for the given week when the
 * org policy is "rotational". Admin panel calls this before letting the
 * admin move on to a different week/month, so the report never has gaps.
 */
async function hasRotationalScheduleForWeek(organisation_id, date) {
  const weekStart = getWeekStart(date);
  const exists = await WeeklyOffSchedule.exists({ organisation_id, weekStartDate: weekStart });
  return !!exists;
}

module.exports = {
  isWeekOff,
  isHoliday,
  classifyNonWorkingDay,
  hasRotationalScheduleForWeek,
  getWeekStart,
  getWeekEnd,
  startOfDay,
  dayName,
};
