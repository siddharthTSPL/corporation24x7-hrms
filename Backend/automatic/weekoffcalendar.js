const HolidayPolicy = require("../Models/holidaypolicy.model");
const WeeklyOffSchedule = require("../Models/weeklyoffschedule.model");
const Holiday = require("../Models/holiday.model");
const EmployeeWeekOffOverride = require("../Models/employeeweekoffoverride.model");
const WeekOffGroup = require("../Models/weekoffgroup.model");
const { startOfISTDay, dayNameIST, toISTKey, IST_OFFSET_MS } = require("../utils/Istdate.utils");

// startOfDay/dayName used to call Date's local setHours(0,0,0,0)/getDay(),
// which read the SERVER PROCESS's OS timezone. On a dev machine set to IST
// that happened to be correct by accident; on a production host (which
// defaults to UTC on almost every cloud/Docker image) it silently computed
// "today" as up to ~5.5 hours into the wrong calendar day. Everything here
// now goes through the fixed +5:30 IST helpers in utils/Istdate.utils.js,
// so it gives the same answer no matter what timezone the box is set to.
function dayName(date) {
  return dayNameIST(date);
}

function startOfDay(date) {
  return startOfISTDay(date);
}

/** Monday 00:00:00 (IST) of the week that `date` falls in. */
function getWeekStart(date) {
  // Do the weekday arithmetic in the "IST-shifted-UTC" frame (UTC getters
  // on a time already offset by +5:30) so it's independent of the server's
  // local timezone, then shift back to a real UTC instant before returning.
  const istMidnight = startOfISTDay(date);
  const shifted = new Date(istMidnight.getTime() + IST_OFFSET_MS);
  const day = shifted.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  shifted.setUTCDate(shifted.getUTCDate() + diffToMonday);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

function getWeekEnd(weekStart) {
  return new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000);
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

/**
 * Batched version of isWeekOff() for an entire month. The per-day loop in
 * getCalendarMeta() used to call isWeekOff() once per day (28-31 sequential
 * DB round-trips, each re-fetching the SAME override/policy docs that don't
 * change day to day). This does the override/policy/group lookups ONCE and,
 * for rotational orgs, fetches all WeeklyOffSchedule docs touching the
 * month in a single query — so a full month resolves in a handful of
 * queries instead of ~30-150.
 *
 * Returns a Map<"YYYY-MM-DD", { isOff, reason, unconfigured? }> covering
 * every day from `monthStart` to `monthEnd` (inclusive, IST calendar days).
 */
async function getWeekOffMapForRange(monthStart, monthEnd, organisation_id, employee = null, employeeModel = null) {
  const days = [];
  for (let t = new Date(monthStart); t <= monthEnd; t = new Date(t.getTime() + 24 * 60 * 60 * 1000)) {
    days.push(startOfDay(t));
  }

  const override = employee
    ? await EmployeeWeekOffOverride.findOne({ organisation_id, employee, employeeModel, isActive: true }).lean()
    : null;

  const fixedResult = (dName) => {
    if (override) {
      if (override.weekOffType === "sunday") return { isOff: dName === "sunday", reason: "override" };
      if (override.weekOffType === "sat_sun") return { isOff: dName === "saturday" || dName === "sunday", reason: "override" };
      if (override.weekOffType === "custom_fixed_days") return { isOff: (override.fixedOffDays || []).includes(dName), reason: "override" };
    }
    return null;
  };

  // If the override fully decides every day (not "rotational"), we're done
  // without ever touching HolidayPolicy/WeekOffGroup/WeeklyOffSchedule.
  if (override && override.weekOffType !== "rotational") {
    const map = new Map();
    days.forEach((d) => {
      const key = toISTKey(d);
      map.set(key, fixedResult(dayName(d)));
    });
    return map;
  }

  const policy = await HolidayPolicy.findOne({ organisation_id }).lean();
  const weekOffType = policy?.weekOffType || "sunday";

  if (weekOffType === "sunday" || weekOffType === "sat_sun") {
    const map = new Map();
    days.forEach((d) => {
      const key = toISTKey(d);
      const dName = dayName(d);
      map.set(key, weekOffType === "sunday"
        ? { isOff: dName === "sunday", reason: "sunday" }
        : { isOff: dName === "saturday" || dName === "sunday", reason: "sat_sun" });
    });
    return map;
  }

  // Rotational: one group lookup, then one batched schedule fetch for every
  // week the month spans (instead of one WeeklyOffSchedule query per day).
  let groupId = null;
  if (employee) {
    const group = await WeekOffGroup.findOne({
      organisation_id, isActive: true,
      members: { $elemMatch: { employee, employeeModel } },
    }).select("_id").lean();
    groupId = group ? group._id : null;
  }

  const weekStarts = [...new Set(days.map((d) => getWeekStart(d).getTime()))].map((t) => new Date(t));
  const schedules = await WeeklyOffSchedule.find({
    organisation_id,
    weekStartDate: { $in: weekStarts },
    group: { $in: [groupId, null] },
  }).lean();

  const scheduleFor = (weekStartMs) => {
    const specific = schedules.find((s) => s.weekStartDate.getTime() === weekStartMs && String(s.group || "") === String(groupId || ""));
    if (specific) return specific;
    return schedules.find((s) => s.weekStartDate.getTime() === weekStartMs && !s.group) || null;
  };

  const map = new Map();
  days.forEach((d) => {
    const key = toISTKey(d);
    const dName = dayName(d);
    const schedule = scheduleFor(getWeekStart(d).getTime());
    if (!schedule) {
      map.set(key, { isOff: false, reason: "unconfigured", unconfigured: true });
    } else {
      map.set(key, { isOff: schedule.offDays.includes(dName), reason: "rotational" });
    }
  });
  return map;
}

module.exports = {
  isWeekOff,
  isHoliday,
  classifyNonWorkingDay,
  hasRotationalScheduleForWeek,
  getWeekOffMapForRange,
  getWeekStart,
  getWeekEnd,
  startOfDay,
  dayName,
};