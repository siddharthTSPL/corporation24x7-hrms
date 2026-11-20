// Attendance consistency streak. Holidays, week-offs and approved leave never break it.
const mongoose = require("mongoose");
const { diffDays, shiftDayKey } = require("./periods");
const { istDateFromYMD } = require("../Istdate.utils");
const { STREAK_MILESTONES } = require("./catalog/milestones");

// Which events keep which streak alive.
const STREAK_EVENTS = { attendance_checkin: "attendance" };
const STREAK_LABELS = { attendance: "Attendance consistency" };

const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return istDateFromYMD(y, m, d);
};

const MAX_GAP_CHECK = 10;

const isNonWorkingDay = async (profile, dayKey) => {
  try {
    const date = keyToDate(dayKey);
    const { isHoliday, isWeekOff } = require("../../automatic/weekoffcalendar");
    const org = profile.organisation_id;
    const hol = await isHoliday(date, org);
    if (hol && hol.isHoliday) return true;
    const off = await isWeekOff(date, org, profile.person, profile.personModel);
    if (off && off.isOff) return true;

    const models = { User: ["Leave", "employee"], Manager: ["ManagerLeave", "manager"], Admin: ["AdminLeave", "admin"] };
    const [modelName, field] = models[profile.personModel] || [];
    if (!modelName) return false;
    if (!mongoose.models[modelName]) {
      try { require({ Leave: "../../Models/leave.model", ManagerLeave: "../../Models/maleave.model", AdminLeave: "../../Models/adleave.model" }[modelName]); } catch (_) { /* treat as no leave */ }
    }
    const Model = mongoose.models[modelName];
    if (!Model) return false;
    const leave = await Model.exists({ [field]: profile.person, status: /^approved_/, startDate: { $lte: new Date(date.getTime() + 86399999) }, endDate: { $gte: date } });
    return !!leave;
  } catch (_) {
    return false;
  }
};

// Can the streak survive the days between lastKey and todayKey?
const gapBridged = async (profile, lastKey, todayKey) => {
  const gap = diffDays(lastKey, todayKey) - 1;
  if (gap <= 0) return true;
  if (gap > MAX_GAP_CHECK) return false;
  for (let i = 1; i <= gap; i++) if (!(await isNonWorkingDay(profile, shiftDayKey(lastKey, i)))) return false;
  return true;
};

const advanceStreak = async (profile, name, todayKey) => {
  const prev = (profile.streaks && profile.streaks[name]) || { current: 0, longest: 0, lastKey: "", startKey: "" };
  if (prev.lastKey === todayKey) return { streak: prev, changed: false, milestone: null };

  let current = 1;
  let startKey = todayKey;
  if (prev.lastKey) {
    const gap = diffDays(prev.lastKey, todayKey);
    if (gap === 1 || (gap > 1 && (await gapBridged(profile, prev.lastKey, todayKey)))) {
      current = prev.current + 1;
      startKey = prev.startKey || prev.lastKey;
    }
  }
  const streak = { current, longest: Math.max(prev.longest || 0, current), lastKey: todayKey, startKey };
  const milestone = STREAK_MILESTONES.find((m) => m.days === current) || null;
  return { streak, changed: true, milestone };
};

// Read-time view: a streak whose last activity is too old is shown as 0,
// one that is alive but not yet extended today is flagged "atRisk".
const viewStreak = async (profile, name, todayKey) => {
  const s = (profile.streaks && profile.streaks[name]) || null;
  const base = { name, label: STREAK_LABELS[name], current: 0, longest: 0, atRisk: false, doneToday: false };
  if (!s || !s.lastKey) return base;
  if (s.lastKey === todayKey) return { ...base, current: s.current, longest: s.longest, doneToday: true };
  const gap = diffDays(s.lastKey, todayKey);
  const alive = gap === 1 || (gap > 1 && (await gapBridged(profile, s.lastKey, todayKey)));
  return { ...base, current: alive ? s.current : 0, longest: s.longest, atRisk: alive };
};

module.exports = { STREAK_EVENTS, STREAK_LABELS, advanceStreak, viewStreak, isNonWorkingDay };
