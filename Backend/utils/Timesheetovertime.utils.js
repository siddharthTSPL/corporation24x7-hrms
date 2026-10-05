const TimeLog = require("../Models/Timelog.model");
const Timesheet = require("../Models/Timesheet.model");
const { istDateFromYMD } = require("./Istdate.utils");
const { round2 } = require("./payroll.utils");

const DEFAULT_MULTIPLIER = 1.5;
const DEFAULT_STANDARD_HOURS_PER_DAY = 9;

// Payroll's employeeModel -> Timesheet / TimeLog owner model. The org owner
// (SuperAdmin) has no timesheets, so there is nothing to sync for them.
const OWNER_MODELS = ["User", "Manager", "Admin"];

const shapeSyncConfig = (policy) => {
  const s = policy?.timesheetSync || {};
  const multiplier = Number(s.overtimeMultiplier);
  const hours = Number(s.standardHoursPerDay);
  return {
    enabled: s.enabled === true,
    overtimeMultiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : DEFAULT_MULTIPLIER,
    standardHoursPerDay: Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_STANDARD_HOURS_PER_DAY,
  };
};

// For ONE payroll month (IST calendar month) and a set of employees of one
// model, sums overtime minutes from time logs, split into:
//   approvedMinutes - logs whose timesheet is fully APPROVED  (these get paid)
//   pendingMinutes  - overtime logged but timesheet not approved yet (draft /
//                     pending / rejected) - never paid, only reported so the
//                     admin knows something is still waiting.
// Month membership is decided per LOG by log_date, not per timesheet week, so
// a week that straddles two months is split correctly between them.
// Returns Map<employeeIdString, { approvedMinutes, pendingMinutes, timesheetIds[] }>
const getTimesheetOvertimeByEmployee = async ({ organisation_id, employeeModel, employeeIds, month, year }) => {
  const result = new Map();
  if (!OWNER_MODELS.includes(employeeModel) || !employeeIds?.length) return result;

  const start = istDateFromYMD(Number(year), Number(month), 1);
  const end = Number(month) === 12
    ? istDateFromYMD(Number(year) + 1, 1, 1)
    : istDateFromYMD(Number(year), Number(month) + 1, 1);

  const logs = await TimeLog.find({
    organisation_id,
    logged_by: { $in: employeeIds },
    logged_by_model: employeeModel,
    log_date: { $gte: start, $lt: end },
    overtime_minutes: { $gt: 0 },
  })
    .select("logged_by overtime_minutes timesheet")
    .lean();
  if (!logs.length) return result;

  const timesheetIds = [...new Set(logs.filter((l) => l.timesheet).map((l) => String(l.timesheet)))];
  const approved = timesheetIds.length
    ? await Timesheet.find({ _id: { $in: timesheetIds }, organisation_id, status: "approved" }).select("_id").lean()
    : [];
  const approvedSet = new Set(approved.map((t) => String(t._id)));

  for (const log of logs) {
    const key = String(log.logged_by);
    if (!result.has(key)) result.set(key, { approvedMinutes: 0, pendingMinutes: 0, timesheetIds: new Set() });
    const entry = result.get(key);
    if (log.timesheet && approvedSet.has(String(log.timesheet))) {
      entry.approvedMinutes += log.overtime_minutes || 0;
      entry.timesheetIds.add(String(log.timesheet));
    } else {
      entry.pendingMinutes += log.overtime_minutes || 0;
    }
  }

  for (const entry of result.values()) entry.timesheetIds = [...entry.timesheetIds];
  return result;
};

// Decides the overtime amount for one payroll row.
//   - Sync off                -> only whatever the admin typed (manual).
//   - Sync on, admin typed a non-zero overtime -> the typed value wins
//     (explicit override; prevents paying the same hours twice).
//   - Sync on, nothing typed  -> approved timesheet overtime x hourly rate x multiplier.
// hourlyRate = monthlyGross / (org's fixed "No. of Working Days" x standard hours/day),
// i.e. the same fixed denominator payroll already uses for its per-day rate.
const buildOvertime = ({ policy, structure, overtimeEntry, manualOvertime, forceEnabled = false }) => {
  const manual = round2(Number(manualOvertime) || 0);
  const cfg = shapeSyncConfig(policy);
  if (forceEnabled) cfg.enabled = true;
  const approvedMinutes = overtimeEntry?.approvedMinutes || 0;
  const pendingMinutes = overtimeEntry?.pendingMinutes || 0;

  const base = {
    source: "none",
    minutes: 0,
    hours: 0,
    hourlyRate: 0,
    multiplier: cfg.overtimeMultiplier,
    amount: 0,
    timesheetIds: [],
    pendingMinutes: cfg.enabled ? pendingMinutes : 0,
  };

  if (manual > 0) {
    return { amount: manual, detail: { ...base, source: "manual", amount: manual } };
  }
  if (!cfg.enabled || approvedMinutes <= 0) {
    return { amount: 0, detail: base };
  }

  const monthlyGross = structure?.breakup?.monthlyGross || 0;
  const noOfWorkingDays = policy?.paySchedule?.noOfWorkingDays || 30;
  const hourlyRate = monthlyGross > 0 ? monthlyGross / (noOfWorkingDays * cfg.standardHoursPerDay) : 0;
  const hours = approvedMinutes / 60;
  const amount = round2(hours * hourlyRate * cfg.overtimeMultiplier);

  return {
    amount,
    detail: {
      ...base,
      source: "timesheet",
      minutes: approvedMinutes,
      hours: round2(hours),
      hourlyRate: round2(hourlyRate),
      amount,
      timesheetIds: overtimeEntry.timesheetIds,
    },
  };
};

module.exports = { shapeSyncConfig, getTimesheetOvertimeByEmployee, buildOvertime };