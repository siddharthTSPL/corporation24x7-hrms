const Overtime = require("../Models/overtime.model");
const { round2 } = require("./payroll.utils");

// A standard shift is 9 hours. Per-hour salary = per-day salary / 9.
const OVERTIME_SHIFT_HOURS = 9;
const OWNER_MODELS = ["User", "Manager", "Admin"];

// Multiplier applied on the plain hourly rate for approved overtime requests.
// 1 = paid at the normal hourly rate (hours x per-hour salary). An org can
// raise it via policy.overtimeRequests.multiplier (e.g. 1.5 for time-and-half).
const getRequestMultiplier = (policy) => {
  const m = Number(policy?.overtimeRequests?.multiplier);
  return Number.isFinite(m) && m > 0 ? m : 1;
};

// Per-day salary is derived automatically from the employee's monthly gross
// and the org's fixed "No. of Working Days" (same denominator payroll already
// uses for LOP), then per-hour = per-day / 9.
const getOvertimeRates = ({ structure, policy, month, year }) => {
  const monthlyGross = Number(structure?.breakup?.monthlyGross) || 0;
  const calendarDays = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const workingDays = policy?.paySchedule?.noOfWorkingDays || calendarDays || 30;
  const perDaySalary = monthlyGross > 0 ? monthlyGross / workingDays : 0;
  const perHourSalary = perDaySalary / OVERTIME_SHIFT_HOURS;
  return {
    perDaySalary: round2(perDaySalary),
    perHourSalary: round2(perHourSalary),
    rawPerHour: perHourSalary,
    workingDays,
    shiftHours: OVERTIME_SHIFT_HOURS,
  };
};

// For ONE payroll month and a set of employees of one model:
// Map<employeeId, { approvedMinutes, pendingMinutes, requestIds[] }>
const getOvertimeRequestsByEmployee = async ({ organisation_id, employeeModel, employeeIds, month, year }) => {
  const result = new Map();
  if (!OWNER_MODELS.includes(employeeModel) || !employeeIds?.length) return result;

  const rows = await Overtime.find({
    organisation_id,
    requesterModel: employeeModel,
    requester: { $in: employeeIds },
    month: Number(month),
    year: Number(year),
    status: { $in: ["approved", "pending"] },
  })
    .select("requester minutes status")
    .lean();

  for (const row of rows) {
    const key = String(row.requester);
    if (!result.has(key)) result.set(key, { approvedMinutes: 0, pendingMinutes: 0, requestIds: [] });
    const entry = result.get(key);
    if (row.status === "approved") {
      entry.approvedMinutes += row.minutes || 0;
      entry.requestIds.push(row._id);
    } else {
      entry.pendingMinutes += row.minutes || 0;
    }
  }
  return result;
};

// Amount payable for approved overtime requests of one employee-month.
const buildRequestOvertime = ({ policy, structure, requestEntry, month, year }) => {
  const approvedMinutes = requestEntry?.approvedMinutes || 0;
  const pendingMinutes = requestEntry?.pendingMinutes || 0;
  const multiplier = getRequestMultiplier(policy);
  const rates = getOvertimeRates({ structure, policy, month, year });
  const hours = approvedMinutes / 60;
  const amount = approvedMinutes > 0 ? round2(hours * rates.rawPerHour * multiplier) : 0;

  return {
    amount,
    detail: {
      minutes: approvedMinutes,
      hours: round2(hours),
      pendingMinutes,
      perDaySalary: rates.perDaySalary,
      perHourSalary: rates.perHourSalary,
      shiftHours: rates.shiftHours,
      multiplier,
      amount,
      requestIds: requestEntry?.requestIds || [],
    },
  };
};

// After payroll rows are saved, stamp the approved requests with the payroll
// document that paid them (so HR / the employee can see "Added to payroll").
// Clears the stamp first for that employee-month so a regenerate that no
// longer includes a request (e.g. it was rejected later) stays accurate.
const linkRequestsToPayroll = async ({ employee, employeeModel, month, year, payrollId, requestIds }) => {
  try {
    await Overtime.updateMany(
      { requester: employee, requesterModel: employeeModel, month: Number(month), year: Number(year) },
      { $set: { payroll: null } }
    );
    if (payrollId && requestIds?.length) {
      await Overtime.updateMany({ _id: { $in: requestIds } }, { $set: { payroll: payrollId } });
    }
  } catch (err) {
    console.error("[overtime] linkRequestsToPayroll failed:", err.message);
  }
};

module.exports = {
  OVERTIME_SHIFT_HOURS,
  getOvertimeRates,
  getOvertimeRequestsByEmployee,
  buildRequestOvertime,
  linkRequestsToPayroll,
};