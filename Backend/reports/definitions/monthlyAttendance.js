const { loadPeople } = require("../engine/people");
const { parseMonthStrict, startOfISTDay, istDateFromYMD, getISTDateParts } = require("../engine/dates");
const { dayRowsByPerson, dayPaidValue } = require("./_attendanceSource");
const { F, round2, monthText } = require("./_shared");

const curMonth = () => { const p = getISTDateParts(new Date()); return `${p.year}-${String(p.month).padStart(2, "0")}`; };
const MAX_PEOPLE = 5000;

/**
 * PURE (unit-tested): fold one person's classified days into the monthly row.
 *   days: [{status, leaveType, isLwpDay}]
 * working days = days covered - week-offs - holidays
 * attendance %  = (present + 0.5*half + paid-leave) / working days
 */
function summarizeDays(days) {
  let present = 0, half = 0, absent = 0, paidLeave = 0, unpaidLeave = 0, offDays = 0, paid = 0;
  for (const d of days) {
    paid += dayPaidValue(d);
    const lwp = d.leaveType === "lwp" || d.isLwpDay;
    switch (d.status) {
      case "present": present += 1; break;
      case "half_day": half += 1; break;
      case "absent": absent += 1; break;
      case "leave": (lwp ? (unpaidLeave += 1) : (paidLeave += d.leaveType?.startsWith("half_day") ? 0.5 : 1)); break;
      case "holiday":
      case "week_off": offDays += 1; break;
      default: break;
    }
  }
  const covered = days.length;
  const workingDays = covered - offDays;
  const credited = present + half * 0.5 + paidLeave;
  return {
    daysCovered: covered,
    workingDays,
    presentDays: present,
    halfDays: half,
    paidLeaveDays: paidLeave,
    unpaidLeaveDays: unpaidLeave,
    absentDays: absent,
    weekOffHolidayDays: offDays,
    paidDays: round2(paid),
    attendancePct: workingDays > 0 ? round2((credited / workingDays) * 100) : null,
  };
}

module.exports = {
  key: "monthly-attendance-summary",
  name: "Monthly Attendance Summary",
  category: "attendance",
  sensitive: false,
  description: "Working days, present, absent, approved leave days and attendance percentage per employee for a month.",
  filters: [
    { key: "month", label: "Month", type: "month", required: true, default: curMonth },
    F.department,
    F.employees,
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "daysCovered", header: "Days Covered", type: "number", width: 13 },
    { key: "workingDays", header: "Working Days", type: "number", width: 13, total: true },
    { key: "presentDays", header: "Present Days", type: "number", width: 13, total: true },
    { key: "halfDays", header: "Half Days", type: "number", width: 11, total: true },
    { key: "paidLeaveDays", header: "Approved Leave (Paid)", type: "number", width: 20, total: true },
    { key: "unpaidLeaveDays", header: "Leave Without Pay", type: "number", width: 18, total: true },
    { key: "absentDays", header: "Absent Days", type: "number", width: 13, total: true },
    { key: "weekOffHolidayDays", header: "Week-Off / Holiday", type: "number", width: 17, total: true },
    { key: "paidDays", header: "Paid Days", type: "number", width: 11, total: true },
    { key: "attendancePct", header: "Attendance %", type: "percent", width: 14 },
  ],
  notes: [
    "Working Days = days covered minus week-offs and holidays. For the current month only days up to today are covered; employees who joined mid-month are counted from their joining date.",
    "Attendance % = (present + 0.5 x half days + paid leave) / working days. Paid Days follows the same rule as the Attendance History 'Total Paid Days' (week-offs, holidays and paid leave count as paid).",
    "Payroll uses the organisation's fixed 'No. of Working Days' as its denominator, so Payroll paid days can differ from this report by design.",
  ],
  period: (f) => monthText(f.month),
  summarizeDays,
  async *rows(ctx, f) {
    const { year, month } = parseMonthStrict(f.month);
    const first = istDateFromYMD(year, month, 1);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const last = istDateFromYMD(year, month, lastDay);
    const people = (await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false }));
    if (people.length > MAX_PEOPLE) {
      const err = new Error(`Too many employees (${people.length}). Filter by department first.`);
      err.statusCode = 422;
      throw err;
    }
    for await (const { person, days } of dayRowsByPerson(ctx, people, startOfISTDay(first), startOfISTDay(last))) {
      yield [{ uid: person.uid, name: person.name, department: person.department, ...summarizeDays(days) }];
    }
  },
};
