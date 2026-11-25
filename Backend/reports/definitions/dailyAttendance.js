const { loadPeople } = require("../engine/people");
const { istRange, startOfISTDay, fmtDate, parseDateStrict } = require("../engine/dates");
const { dayRowsByPerson } = require("./_attendanceSource");
const { F, periodText } = require("./_shared");

const STATUS = [
  { value: "present", label: "Present" },
  { value: "half_day", label: "Half Day" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "On Leave" },
  { value: "holiday", label: "Holiday" },
  { value: "week_off", label: "Week Off" },
];
const LABEL = Object.fromEntries(STATUS.map((s) => [s.value, s.label]));
const LEAVE_NAME = { el: "Earned Leave", sl: "Sick Leave", ml: "Maternity Leave", pl: "Paternity Leave", half_day_el: "Half Day EL", half_day_sl: "Half Day SL", lwp: "Leave Without Pay", comp_off: "Comp Off" };
const MAX_DAYS = 31;
const MAX_PERSON_DAYS = 150000;

const remarkFor = (d) => {
  const bits = [];
  if (d.status === "holiday" && d.holidayName) bits.push(d.holidayName);
  if (d.leaveType) bits.push(`${LEAVE_NAME[d.leaveType] || d.leaveType}${d.isLwpDay && d.leaveType !== "lwp" ? " (unpaid portion)" : ""}`);
  if (d.isLate && d.lateMinutes) bits.push(`Late by ${d.lateMinutes} min`);
  if (d.source === "timesheet") bits.push("Derived from approved timesheet");
  return bits.join("; ");
};

module.exports = {
  key: "daily-attendance-register",
  name: "Daily Attendance Register",
  category: "attendance",
  sensitive: false,
  description: "Employee, date, check-in, check-out and attendance status for a date range.",
  filters: [
    { key: "from", label: "From Date", type: "date", required: true },
    { key: "to", label: "To Date", type: "date", required: true },
    F.department,
    F.employees,
    { key: "statuses", label: "Attendance Status", type: "multiselect", options: STATUS },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "date", header: "Date", type: "date", width: 14 },
    { key: "checkIn", header: "Check-In (IST)", type: "time", width: 14 },
    { key: "checkOut", header: "Check-Out (IST)", type: "time", width: 14 },
    { key: "status", header: "Attendance Status", type: "text", width: 18 },
    { key: "remarks", header: "Remarks", type: "text", width: 36 },
  ],
  notes: [
    `Maximum ${MAX_DAYS} days per report. Days after today are not shown.`,
    "Status is derived exactly as in Attendance History: approved leave outranks check-ins; holidays and week-offs come from the organisation's holiday policy and week-off schedule.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: MAX_DAYS }); },
  extraSummary() {
    const c = {};
    return {
      add: (r) => { c[r.status] = (c[r.status] || 0) + 1; },
      items: () => STATUS.filter((s) => c[s.label]).map((s) => ({ label: `${s.label} (person-days)`, value: c[s.label], type: "integer" })),
    };
  },
  async *rows(ctx, f) {
    const { from, to, days } = istRange(f.from, f.to, { maxDays: MAX_DAYS });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    if (people.length * days > MAX_PERSON_DAYS) {
      const err = new Error(`Too many employee-days (${(people.length * days).toLocaleString("en-IN")}). Narrow the date range, department or employees.`);
      err.statusCode = 422;
      throw err;
    }
    const wanted = f.statuses?.length ? new Set(f.statuses) : null;
    const rangeStart = startOfISTDay(from);
    const rangeEnd = startOfISTDay(to);
    for await (const { person, days: dayRows } of dayRowsByPerson(ctx, people, rangeStart, rangeEnd)) {
      const out = [];
      for (const d of dayRows) {
        if (wanted && !wanted.has(d.status)) continue;
        out.push({
          uid: person.uid,
          name: person.name,
          department: person.department,
          date: d.date,
          checkIn: d.checkIn || null,
          checkOut: d.checkOut || null,
          status: LABEL[d.status] || d.status,
          remarks: remarkFor(d),
        });
      }
      if (out.length) yield out;
    }
  },
  _remarkFor: remarkFor,
};
