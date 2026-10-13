const Attendance = require("../Models/attendance.model");
const SuperAdmin = require("../Models/superadmin.model");
const { getISTDateParts, istDateFromYMD } = require("./Istdate.utils");

const DEFAULT_ALLOWED_LATE_PER_MONTH = 3;

// A late check-in only qualifies as one of the month's FREE lates when it is
// at most this many minutes past the shift's grace edge ("late by X min" as
// shown at check-in). Later than this -> Half Day straight away, and it does
// NOT use up one of the free slots. Applies to System (manual) and Face alike.
const MAX_FREE_LATE_MINUTES = 60;
const isWithinFreeLateLimit = (lateMinutes) => (Number(lateMinutes) || 0) <= MAX_FREE_LATE_MINUTES;

// Normalises the org's stored lateRule (missing on old orgs -> disabled).
const shapeLateRule = (org) => {
  const r = org?.attendanceSettings?.lateRule || {};
  const allowed = Number(r.allowedLatePerMonth);
  return {
    enabled: r.enabled === true,
    allowedLatePerMonth:
      Number.isInteger(allowed) && allowed >= 0 ? allowed : DEFAULT_ALLOWED_LATE_PER_MONTH,
  };
};

const getLateRule = async (organisation_id) => {
  const org = await SuperAdmin.findById(organisation_id).select("attendanceSettings").lean();
  return shapeLateRule(org);
};

// Called at check-in. Works out which late check-in of the IST month this is
// (counting earlier days only - `date` itself is excluded so a re-run for the
// same day never double-counts) and whether it crosses the org's free limit.
// Returns { lateCountInMonth, latePenalty }.
const computeLateStanding = async ({ organisation_id, employee, role, date, isLate, lateMinutes = 0 }) => {
  if (!isLate) return { lateCountInMonth: 0, latePenalty: false };

  const rule = await getLateRule(organisation_id);

  // More than MAX_FREE_LATE_MINUTES late: never free -> Half Day right away
  // (count stays 0 because it doesn't consume a free slot).
  if (!isWithinFreeLateLimit(lateMinutes)) {
    return { lateCountInMonth: 0, latePenalty: !!rule.enabled, overLimit: true, rule };
  }
  const { year, month } = getISTDateParts(date);
  const monthStart = istDateFromYMD(year, month, 1);
  const nextMonthStart = month === 12 ? istDateFromYMD(year + 1, 1, 1) : istDateFromYMD(year, month + 1, 1);

  const earlierLates = await Attendance.countDocuments({
    organisation_id,
    employee,
    role,
    isLate: true,
    lateMinutes: { $lte: MAX_FREE_LATE_MINUTES }, // only lates that used a free slot
    // Only strictly-earlier days of the SAME IST month (resets every month).
    date: { $gte: monthStart, $lt: date < nextMonthStart ? date : nextMonthStart },
  });

  const lateCountInMonth = earlierLates + 1;
  const latePenalty = rule.enabled && lateCountInMonth > rule.allowedLatePerMonth;
  return { lateCountInMonth, latePenalty, rule };
};

// Called wherever a day's final status is decided. A late-penalty day that
// would otherwise be "present" becomes "half_day". absent / half_day stay as
// they are - the penalty is never stacked on a day that is already docked.
const applyLatePenaltyToStatus = (attendance, status) =>
  attendance?.latePenalty && status === "present" ? "half_day" : status;

// Fresh, authoritative late standing for an attendance record, worked out at
// the moment the day's final status is decided (checkout / auto-checkout).
// Never trusts what was stamped at check-in, so a wrong/old stamp (rule
// switched on later, limit changed, record created by an old build) can't
// push a day into Half Day. Counts only EARLIER lates of the same IST month.
// Returns { lateCountInMonth, latePenalty } and mutates `attendance` if it is
// a Mongoose document / plain object being saved by the caller.
const refreshLateStanding = async (attendance) => {
  if (!attendance?.isLate) {
    if (attendance) { attendance.lateCountInMonth = 0; attendance.latePenalty = false; }
    return { lateCountInMonth: 0, latePenalty: false };
  }
  const { lateCountInMonth, latePenalty, rule } = await computeLateStanding({
    organisation_id: attendance.organisation_id,
    employee: attendance.employee,
    role: attendance.role,
    date: attendance.date,
    isLate: true,
    lateMinutes: attendance.lateMinutes || 0,
  });
  attendance.lateCountInMonth = lateCountInMonth;
  attendance.latePenalty = !!latePenalty;
  // freeLate: one of the month's allowed (free) lates - lateness must not
  // cost the person anything, not even through the working-hours rule.
  return { lateCountInMonth, latePenalty: !!latePenalty, freeLate: !!rule?.enabled && !latePenalty };
};

// Minutes to add back to worked time when judging present / half_day for a
// FREE late day: the whole delay from shift start (grace + minutes past
// grace). Late #1..#N of the month then count as a full day as long as the
// person otherwise completes the shift; late #N+1 onward gets no forgiveness
// (and is a Half Day anyway). 0 when the rule is off or the day isn't late.
const lateForgiveMinutes = (attendance, shift, standing) =>
  standing?.freeLate && attendance?.isLate
    ? Math.max(0, (attendance.lateMinutes || 0) + (shift?.graceMinutes ?? 15))
    : 0;

// Re-derives lateCountInMonth / latePenalty (and the present <-> half_day
// effect of the penalty) for every late day in [rangeStart, rangeEndExclusive).
// Month by month, oldest late first: 1st..Nth late of the month are free, the
// (N+1)th onward is a Half Day. Used by the nightly job (self-healing) and by
// scripts/Fixlatehalfdayhistory.js (history backfill).
const recomputeLatePenalties = async ({
  rangeStart, rangeEndExclusive, apply = true, organisation_id = null, employee = null,
  allowedOverride = null, force = false, log = console.log,
}) => {
  const Shift = require("../Models/shift.model");
  const { getShiftThresholds, calculateFaceStatus } = require("./shift.utils");
  const { calculateStatus } = require("../automatic/monthattendanceupdate");

  const orgs = await SuperAdmin.find(organisation_id ? { _id: organisation_id } : {})
    .select("attendanceSettings organisation_name").lean();

  const shiftCache = new Map();
  const getShift = async (id) => {
    if (!id) return null;
    const k = String(id);
    if (!shiftCache.has(k)) shiftCache.set(k, await Shift.findById(id).lean());
    return shiftCache.get(k);
  };

  const totals = { countFixes: 0, toHalf: 0, reverted: 0 };

  for (const org of orgs) {
    const rule = shapeLateRule(org);
    if (!rule.enabled && !force) {
      log(`[late] SKIP ${org.organisation_name || org._id}: late rule is OFF`);
      continue;
    }
    const allowed = allowedOverride !== null ? allowedOverride : rule.allowedLatePerMonth;

    const q = { organisation_id: org._id, isLate: true, date: { $gte: rangeStart, $lt: rangeEndExclusive } };
    if (employee) q.employee = employee;

    const lates = await Attendance.find(q)
      .select("employee role date status latePenalty lateCountInMonth lateMinutes checkIn checkOut source activeMinutes shift checkoutRemark")
      .sort({ date: 1 }).lean();

    const groups = new Map();
    for (const a of lates) {
      const { year, month } = getISTDateParts(a.date);
      const key = `${a.employee}_${a.role}_${year}_${month}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }

    const ops = [];
    let countFixes = 0, toHalf = 0, reverted = 0;

    for (const list of groups.values()) {
      let used = 0; // free slots used so far this month
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const withinLimit = isWithinFreeLateLimit(a.lateMinutes);
        const n = withinLimit ? ++used : 0;
        const penalty = !withinLimit || n > allowed;
        const $set = {};
        if ((a.lateCountInMonth || 0) !== n) $set.lateCountInMonth = n;
        if (!!a.latePenalty !== penalty) $set.latePenalty = penalty;
        if (Object.keys($set).length) countFixes++;

        if (penalty && a.status === "present") { $set.status = "half_day"; toHalf++; }

        // Free late day (or wrongly penalised earlier): lateness must not cost
        // anything, so judge hours with the late time added back.
        if (!penalty && a.status === "half_day" && a.checkOut && a.checkoutRemark !== "missed_checkout") {
          const shift = await getShift(a.shift);
          if (shift) {
            const forgive = Math.max(0, (a.lateMinutes || 0) + (shift.graceMinutes ?? 15));
            const base = a.source === "face"
              ? calculateFaceStatus((new Date(a.checkOut) - new Date(a.checkIn)) / 60000 + forgive, shift)
              : calculateStatus((a.activeMinutes || 0) + forgive, getShiftThresholds(shift));
            if (base === "present") { $set.status = "present"; reverted++; }
          }
        }
        if (Object.keys($set).length) ops.push({ updateOne: { filter: { _id: a._id }, update: { $set } } });
      }
    }

    log(`[late] ${org.organisation_name || org._id}: limit ${allowed}/month | late days ${lates.length} | counter fixes ${countFixes} | present->half_day ${toHalf} | half_day->present ${reverted}`);
    totals.countFixes += countFixes; totals.toHalf += toHalf; totals.reverted += reverted;
    if (apply && ops.length) await Attendance.bulkWrite(ops, { ordered: false });
  }
  return totals;
};

module.exports = {
  MAX_FREE_LATE_MINUTES,
  isWithinFreeLateLimit,
  refreshLateStanding,
  lateForgiveMinutes,
  recomputeLatePenalties,
  shapeLateRule,
  getLateRule,
  computeLateStanding,
  applyLatePenaltyToStatus,
  DEFAULT_ALLOWED_LATE_PER_MONTH,
};