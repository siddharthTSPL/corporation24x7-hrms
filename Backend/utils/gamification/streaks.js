const mongoose = require("mongoose");
const { diffDays, shiftDayKey } = require("./periods");
const { istDateFromYMD } = require("../Istdate.utils");
const { STREAK_MILESTONES } = require("./catalog/spin");

// Which events keep which streak alive.
const STREAK_EVENTS = {
  attendance_checkin: "attendance",
  daily_claim: "login",
  quiz_attempt: "quiz",
  kudos_given: "kudos",
};
const STREAK_LABELS = {
  attendance: "Attendance streak",
  login: "Daily reward streak",
  quiz: "Quiz streak",
  kudos: "Recognition streak",
};

const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return istDateFromYMD(y, m, d);
};

const MAX_GAP_CHECK = 10;

// Days that must NOT break an attendance streak: holidays, week-offs and
// approved leave. (Taking leave should never cost anyone their streak.)
const isNonWorkingDay = async (profile, dayKey) => {
  try {
    const date = keyToDate(dayKey);
    const { isHoliday, isWeekOff } = require("../../automatic/weekoffcalendar");
    const org = profile.organisation_id;
    const hol = await isHoliday(date, org);
    if (hol && hol.isHoliday) return true;
    const off = await isWeekOff(date, org, profile.person, profile.personModel);
    if (off && off.isOff) return true;

    const models = {
      User: ["Leave", "employee"],
      Manager: ["ManagerLeave", "manager"],
      Admin: ["AdminLeave", "admin"],
    };
    const [modelName, field] = models[profile.personModel] || [];
    if (!modelName) return false;
    if (!mongoose.models[modelName]) {
      try {
        require({ Leave: "../../Models/leave.model", ManagerLeave: "../../Models/maleave.model", AdminLeave: "../../Models/adleave.model" }[modelName]);
      } catch (_) { /* model not loadable - treat as no leave */ }
    }
    const Model = mongoose.models[modelName];
    if (!Model) return false;
    const leave = await Model.exists({
      [field]: profile.person,
      status: /^approved_/,
      startDate: { $lte: new Date(date.getTime() + 86399999) },
      endDate: { $gte: date },
    });
    return !!leave;
  } catch (_) {
    return false;
  }
};

const missedDays = (lastKey, todayKey) => {
  const gap = diffDays(lastKey, todayKey) - 1;
  const days = [];
  for (let i = 1; i <= Math.min(gap, MAX_GAP_CHECK); i++) days.push(shiftDayKey(lastKey, i));
  return { gap, days };
};

// Can the streak survive the days between lastKey and todayKey without a freeze?
const gapBridged = async (name, profile, lastKey, todayKey) => {
  const { gap, days } = missedDays(lastKey, todayKey);
  if (gap <= 0) return { ok: true, unbridged: 0 };
  if (gap > MAX_GAP_CHECK) return { ok: false, unbridged: gap };
  if (name !== "attendance") return { ok: false, unbridged: gap };
  let unbridged = 0;
  for (const d of days) if (!(await isNonWorkingDay(profile, d))) unbridged++;
  return { ok: unbridged === 0, unbridged };
};

// Compute the streak after activity today. Pure w.r.t. the DB except for the
// attendance bridging reads. Returns the new streak object + freezes used.
const advanceStreak = async (profile, name, todayKey) => {
  const prev = (profile.streaks && profile.streaks[name]) || { current: 0, longest: 0, lastKey: "", startKey: "" };
  if (prev.lastKey === todayKey) return { streak: prev, changed: false, freezesUsed: 0, milestone: null };

  let current = 1;
  let startKey = todayKey;
  let freezesUsed = 0;

  if (prev.lastKey) {
    const gap = diffDays(prev.lastKey, todayKey);
    if (gap === 1) {
      current = prev.current + 1;
      startKey = prev.startKey || prev.lastKey;
    } else if (gap > 1) {
      const bridge = await gapBridged(name, profile, prev.lastKey, todayKey);
      if (bridge.ok) {
        current = prev.current + 1;
        startKey = prev.startKey || prev.lastKey;
      } else if (bridge.unbridged <= 2 && (profile.freezes || 0) >= bridge.unbridged && bridge.unbridged > 0) {
        freezesUsed = bridge.unbridged;
        current = prev.current + 1;
        startKey = prev.startKey || prev.lastKey;
      }
    }
  }

  const streak = { current, longest: Math.max(prev.longest || 0, current), lastKey: todayKey, startKey };
  const milestone = STREAK_MILESTONES.find((m) => m.days === current) || null;
  return { streak, changed: true, freezesUsed, milestone };
};

// Read-time view: a streak whose last activity is too old is shown as 0,
// and one that is still alive but not yet extended today is flagged "at risk".
const viewStreak = async (profile, name, todayKey) => {
  const s = (profile.streaks && profile.streaks[name]) || null;
  if (!s || !s.lastKey) return { name, label: STREAK_LABELS[name], current: 0, longest: 0, atRisk: false, doneToday: false };
  if (s.lastKey === todayKey) return { name, label: STREAK_LABELS[name], current: s.current, longest: s.longest, atRisk: false, doneToday: true };
  const gap = diffDays(s.lastKey, todayKey);
  let alive = gap === 1;
  if (!alive && gap > 1) {
    const b = await gapBridged(name, profile, s.lastKey, todayKey);
    alive = b.ok || (b.unbridged > 0 && b.unbridged <= 2 && (profile.freezes || 0) >= b.unbridged);
  }
  return { name, label: STREAK_LABELS[name], current: alive ? s.current : 0, longest: s.longest, atRisk: alive, doneToday: false };
};

module.exports = { STREAK_EVENTS, STREAK_LABELS, advanceStreak, viewStreak, isNonWorkingDay };
