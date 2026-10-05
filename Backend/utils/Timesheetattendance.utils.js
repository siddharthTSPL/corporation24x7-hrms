const TimeLog = require("../Models/Timelog.model");
const Timesheet = require("../Models/Timesheet.model");
const Holiday = require("../Models/holiday.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const { getWeekOffMapForRange } = require("../automatic/weekoffcalendar");
const { isDateInLwpPortion } = require("./Leavelwpday.utils");
const { istDateFromYMD, toISTKey, startOfISTDay } = require("./Istdate.utils");
const { shapeSyncConfig } = require("./Timesheetovertime.utils");

const FULL_DAY_PERCENT = 85;
const HALF_DAY_PERCENT = 50;
const TIMESHEET_MODELS = ["User", "Manager", "Admin"];

const LEAVE_CONFIG = {
  User: { Model: Leave, field: "employee", statuses: ["approved_manager", "approved_admin"] },
  Manager: { Model: ManagerLeave, field: "manager", statuses: ["approved_reporting_manager", "approved_admin"] },
  Admin: { Model: AdminLeave, field: "admin", statuses: ["approved_superadmin"] },
};

const isTimesheetBasis = (structure, employeeModel, month, year) => {
  if (structure?.attendanceBasis !== "timesheet" || !TIMESHEET_MODELS.includes(employeeModel)) return false;
  const from = structure.timesheetBasisFrom;
  if (!from?.month || !from?.year || !month || !year) return true;
  return Number(year) * 12 + Number(month) >= from.year * 12 + from.month;
};

const classifyDay = (regularMinutes, standardMinutes) => {
  if (standardMinutes <= 0) return "full";
  const percent = (regularMinutes / standardMinutes) * 100;
  if (percent >= FULL_DAY_PERCENT) return "full";
  if (percent >= HALF_DAY_PERCENT) return "half";
  return "absent";
};

const getTimesheetAttendanceByEmployee = async ({ organisation_id, employeeModel, employees, month, year, policy }) => {
  const result = new Map();
  if (!TIMESHEET_MODELS.includes(employeeModel) || !employees?.length) return result;

  const m = Number(month);
  const y = Number(year);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthStart = istDateFromYMD(y, m, 1);
  const monthEnd = istDateFromYMD(y, m, lastDay);
  const nextMonthStart = m === 12 ? istDateFromYMD(y + 1, 1, 1) : istDateFromYMD(y, m + 1, 1);
  const todayStart = startOfISTDay(new Date());
  const standardMinutes = shapeSyncConfig(policy).standardHoursPerDay * 60;
  const employeeIds = employees.map((e) => e.id);

  const [logs, holidays, leaves] = await Promise.all([
    TimeLog.find({
      organisation_id,
      logged_by: { $in: employeeIds },
      logged_by_model: employeeModel,
      log_date: { $gte: monthStart, $lt: nextMonthStart },
      regular_minutes: { $gt: 0 },
    })
      .select("logged_by log_date regular_minutes timesheet")
      .lean(),
    Holiday.find({ organisation_id, date: { $gte: monthStart, $lt: nextMonthStart } }).select("date").lean(),
    (async () => {
      const cfg = LEAVE_CONFIG[employeeModel];
      return cfg.Model.find({
        [cfg.field]: { $in: employeeIds },
        status: { $in: cfg.statuses },
        leaveType: { $ne: "lwp" },
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      })
        .select(`${cfg.field} startDate endDate lwpDays leaveType`)
        .lean();
    })(),
  ]);

  const timesheetIds = [...new Set(logs.filter((l) => l.timesheet).map((l) => String(l.timesheet)))];
  const approved = timesheetIds.length
    ? await Timesheet.find({ _id: { $in: timesheetIds }, organisation_id, status: "approved" }).select("_id").lean()
    : [];
  const approvedSet = new Set(approved.map((t) => String(t._id)));

  const minutesByEmployeeDay = new Map();
  for (const log of logs) {
    if (!log.timesheet || !approvedSet.has(String(log.timesheet))) continue;
    const key = `${String(log.logged_by)}|${toISTKey(log.log_date)}`;
    minutesByEmployeeDay.set(key, (minutesByEmployeeDay.get(key) || 0) + (log.regular_minutes || 0));
  }

  const holidayKeys = new Set(holidays.map((h) => toISTKey(h.date)));
  const leaveField = LEAVE_CONFIG[employeeModel].field;
  const leavesByEmployee = new Map();
  for (const leave of leaves) {
    const id = String(leave[leaveField]);
    if (!leavesByEmployee.has(id)) leavesByEmployee.set(id, []);
    leavesByEmployee.get(id).push(leave);
  }

  for (const emp of employees) {
    const id = String(emp.id);
    const weekOffMap = await getWeekOffMapForRange(monthStart, monthEnd, organisation_id, emp.id, employeeModel);
    const empLeaves = leavesByEmployee.get(id) || [];
    const joinStart = emp.joinDate ? startOfISTDay(new Date(emp.joinDate)) : null;

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    const days = [];

    for (let d = 1; d <= lastDay; d += 1) {
      const date = istDateFromYMD(y, m, d);
      const key = toISTKey(date);
      if (joinStart && date < joinStart) {
        days.push({ date: key, result: "before_joining" });
        continue;
      }
      if (date >= todayStart) {
        days.push({ date: key, result: "not_counted_today_or_future" });
        continue;
      }

      if (holidayKeys.has(key)) {
        days.push({ date: key, result: "holiday_paid" });
        continue;
      }
      if (weekOffMap.get(key)?.isOff) {
        days.push({ date: key, result: "weekoff_paid" });
        continue;
      }

      const leave = empLeaves.find(
        (l) => date >= startOfISTDay(new Date(l.startDate)) && date <= startOfISTDay(new Date(l.endDate)) && !isDateInLwpPortion(l, date)
      );
      if (leave) {
        if (leave.leaveType === "comp_off") presentDays += 1;
        days.push({ date: key, result: leave.leaveType === "comp_off" ? "comp_off_present" : "paid_leave" });
        continue;
      }

      const dayMinutes = minutesByEmployeeDay.get(`${id}|${key}`) || 0;
      const status = classifyDay(dayMinutes, standardMinutes);
      days.push({
        date: key,
        approvedRegularMinutes: dayMinutes,
        standardMinutes,
        percent: standardMinutes > 0 ? Math.round((dayMinutes / standardMinutes) * 1000) / 10 : 0,
        result: status === "full" ? "full_day" : status === "half" ? "half_day" : "absent_lop",
      });
      if (status === "full") presentDays += 1;
      else if (status === "half") {
        presentDays += 0.5;
        halfDays += 1;
      } else absentDays += 1;
    }

    result.set(id, { presentDays, halfDays, absentDays, basis: "timesheet", days });
  }

  return result;
};

module.exports = {
  isTimesheetBasis,
  getTimesheetAttendanceByEmployee,
  TIMESHEET_MODELS,
  classifyDay,
  FULL_DAY_PERCENT,
  HALF_DAY_PERCENT,
};