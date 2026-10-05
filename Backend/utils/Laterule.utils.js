const Attendance = require("../Models/attendance.model");
const SuperAdmin = require("../Models/superadmin.model");
const { getISTDateParts, istDateFromYMD } = require("./Istdate.utils");

const DEFAULT_ALLOWED_LATE_PER_MONTH = 3;

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
const computeLateStanding = async ({ organisation_id, employee, role, date, isLate }) => {
  if (!isLate) return { lateCountInMonth: 0, latePenalty: false };

  const rule = await getLateRule(organisation_id);
  const { year, month } = getISTDateParts(date);
  const monthStart = istDateFromYMD(year, month, 1);
  const nextMonthStart = month === 12 ? istDateFromYMD(year + 1, 1, 1) : istDateFromYMD(year, month + 1, 1);

  const earlierLates = await Attendance.countDocuments({
    organisation_id,
    employee,
    role,
    isLate: true,
    date: { $gte: monthStart, $lt: nextMonthStart, $ne: date },
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

module.exports = {
  shapeLateRule,
  getLateRule,
  computeLateStanding,
  applyLatePenaltyToStatus,
  DEFAULT_ALLOWED_LATE_PER_MONTH,
};