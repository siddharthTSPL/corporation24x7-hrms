const Attendance = require("../Models/attendance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const { classifyNonWorkingDay, startOfDay } = require("./weekoffcalendar");

const LEAVE_TYPE_MAP = {
  el: "el",
  half_day_el: "el",
  sl: "sl",
  half_day_sl: "sl",
  ml: "ml",
  pl: "pl",
};

function getLeaveModel(role) {
  if (role === "manager") return { Model: ManagerLeave, employeeField: "manager" };
  if (role === "admin") return { Model: AdminLeave, employeeField: "admin" };
  return { Model: Leave, employeeField: "employee" };
}

function getOnModel(role) {
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin";
  return "User";
}

/**
 * Builds a full day-by-day report for one employee, one month.
 *
 * Priority per day (highest wins):
 *   1. Admin holiday (from Holiday collection)
 *   2. Approved leave that day (sl / el / ml / pl / half_day variants)
 *   3. Week-off (per HolidayPolicy / WeeklyOffSchedule / individual override)
 *   4. Attendance record status (present / half_day / absent)
 *   5. No record and not off/holiday/leave -> "absent"
 *
 * If a rotational week was never configured by the admin, that day is
 * marked "unconfigured" instead of silently guessing, and surfaced in
 * `warnings` so the admin can fix the schedule before trusting the report.
 */
async function generateMonthlyReport({ organisation_id, employee, role, month, year }) {
  const onModel = getOnModel(role);
  const { Model: LeaveModel, employeeField } = getLeaveModel(role);

  const monthStart = startOfDay(new Date(year, month - 1, 1));
  const monthEnd = startOfDay(new Date(year, month, 0)); // last day of month
  const daysInMonth = monthEnd.getDate();

  const [attendanceDocs, leaveDocs] = await Promise.all([
    Attendance.find({
      organisation_id,
      employee,
      onModel,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean(),
    LeaveModel.find({
      organisation_id,
      [employeeField]: employee,
      status: { $in: ["approved_manager", "approved_reporting_manager", "approved_admin", "approved_superadmin"] },
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart },
    }).lean(),
  ]);

  const attendanceByDate = new Map();
  for (const a of attendanceDocs) {
    attendanceByDate.set(startOfDay(a.date).getTime(), a);
  }

  const days = [];
  const totals = {
    present: 0,
    halfDay: 0,
    absent: 0,
    sl: 0,
    el: 0,
    ml: 0,
    pl: 0,
    weekOff: 0,
    holiday: 0,
    unconfigured: 0,
  };
  const warnings = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = startOfDay(new Date(year, month - 1, d));
    const dayEntry = { date: date.toISOString().slice(0, 10) };

    // 1 & 3 combined check (holiday takes priority inside classifyNonWorkingDay)
    const nonWorking = await classifyNonWorkingDay(date, organisation_id, employee, onModel);

    // 2. Leave that covers this date (checked regardless, since a leave
    // taken on what would otherwise be a working day still needs to show)
    const leaveToday = leaveDocs.find(
      (l) => new Date(l.startDate) <= date && new Date(l.endDate) >= date
    );

    if (nonWorking.type === "holiday") {
      dayEntry.status = "holiday";
      dayEntry.name = nonWorking.name;
      totals.holiday += 1;
    } else if (leaveToday) {
      const kind = LEAVE_TYPE_MAP[leaveToday.leaveType] || "lwp";
      dayEntry.status = kind;
      totals[kind] = (totals[kind] || 0) + (leaveToday.leaveType.startsWith("half_day") ? 0.5 : 1);
    } else if (nonWorking.type === "unconfigured") {
      dayEntry.status = "unconfigured";
      totals.unconfigured += 1;
      warnings.push(`Week of ${date.toISOString().slice(0, 10)} has no rotational week-off set by admin.`);
    } else if (nonWorking.type === "week_off") {
      dayEntry.status = "week_off";
      totals.weekOff += 1;
    } else {
      const attendance = attendanceByDate.get(date.getTime());
      if (!attendance) {
        dayEntry.status = "absent";
        totals.absent += 1;
      } else if (attendance.status === "present") {
        dayEntry.status = "present";
        totals.present += 1;
      } else if (attendance.status === "half_day") {
        dayEntry.status = "half_day";
        totals.halfDay += 1;
      } else {
        dayEntry.status = "absent";
        totals.absent += 1;
      }
    }

    days.push(dayEntry);
  }

  return {
    organisation_id,
    employee,
    role,
    month,
    year,
    daysInMonth,
    totals,
    days,
    warnings, // non-empty means admin needs to fix rotational schedule for that report to be trusted
  };
}

module.exports = { generateMonthlyReport };
