const { loadPeople } = require("../engine/people");
const { istRange, startOfISTDay, fmtDate, parseDateStrict } = require("../engine/dates");
const { dayRowsByPerson } = require("./_attendanceSource");
const { F, periodText } = require("./_shared");

const TYPES = ["Late Check-in", "Half Day", "Absent", "Missing Check-out"].map((v) => ({ value: v, label: v }));
const MAX_DAYS = 31;
const MAX_PERSON_DAYS = 150000;

/** PURE (unit-tested): which exceptions does this classified day carry? Approved leave, holidays and week-offs never are exceptions. */
function exceptionsOf(d, todayStart) {
  if (d.status === "leave" || d.status === "holiday" || d.status === "week_off") return [];
  const out = [];
  if (d.isLate && d.status !== "absent") out.push("Late Check-in");
  if (d.status === "half_day") out.push("Half Day");
  if (d.status === "absent") out.push("Absent");
  if (d.checkIn && !d.checkOut && new Date(d.date) < todayStart && d.status !== "absent") out.push("Missing Check-out");
  return out;
}

module.exports = {
  key: "attendance-exceptions",
  name: "Attendance Exceptions Report",
  category: "attendance",
  sensitive: false,
  description: "Late check-ins, half days, absences and missing check-outs for a date range.",
  filters: [
    { key: "from", label: "From Date", type: "date", required: true },
    { key: "to", label: "To Date", type: "date", required: true },
    F.department,
    F.employees,
    { key: "types", label: "Exception Type", type: "multiselect", options: TYPES },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "date", header: "Date", type: "date", width: 14 },
    { key: "checkIn", header: "Check-In (IST)", type: "time", width: 14 },
    { key: "checkOut", header: "Check-Out (IST)", type: "time", width: 14 },
    { key: "lateMinutes", header: "Late By (min)", type: "integer", width: 14, total: true },
    { key: "exceptions", header: "Exceptions", type: "text", width: 34 },
  ],
  notes: [
    `Maximum ${MAX_DAYS} days. Day status comes from the same rules as Attendance History, so approved leave, holidays and week-offs are never flagged.`,
    "A 'Missing Check-out' is a past day with a check-in but no check-out.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: MAX_DAYS }); },
  exceptionsOf,
  extraSummary() {
    const c = {};
    return { add: (r) => { for (const e of r.exceptions.split(", ")) c[e] = (c[e] || 0) + 1; }, items: () => Object.entries(c).map(([k, v]) => ({ label: k, value: v, type: "integer" })) };
  },
  async *rows(ctx, f) {
    const { from, to, days } = istRange(f.from, f.to, { maxDays: MAX_DAYS });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    if (people.length * days > MAX_PERSON_DAYS) {
      const err = new Error(`Too many employee-days (${(people.length * days).toLocaleString("en-IN")}). Narrow the date range, department or employees.`);
      err.statusCode = 422;
      throw err;
    }
    const wanted = f.types?.length ? new Set(f.types) : null;
    const todayStart = startOfISTDay(new Date());
    for await (const { person, days: dayRows } of dayRowsByPerson(ctx, people, startOfISTDay(from), startOfISTDay(to))) {
      const out = [];
      for (const d of dayRows) {
        let ex = exceptionsOf(d, todayStart);
        if (wanted) ex = ex.filter((e) => wanted.has(e));
        if (!ex.length) continue;
        out.push({ uid: person.uid, name: person.name, department: person.department, date: d.date, checkIn: d.checkIn || null, checkOut: d.checkOut || null, lateMinutes: d.lateMinutes || 0, exceptions: ex.join(", ") });
      }
      if (out.length) yield out;
    }
  },
};
