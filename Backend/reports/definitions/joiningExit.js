const { loadPeople } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict, startOfISTDay } = require("../engine/dates");
const { loadExitDates, daysBetween } = require("./_phase2");
const { F, batches, periodText, round2 } = require("./_shared");

const EXIT_LABEL = { resigned: "Resigned", fired: "Fired", terminated: "Terminated" };

module.exports = {
  key: "joining-exit-report",
  name: "Employee Joining & Exit Report",
  category: "hr",
  sensitive: true,
  description: "Who joined and who left in a period, with exit type and tenure.",
  filters: [
    { key: "from", label: "From Date", type: "date", required: true },
    { key: "to", label: "To Date", type: "date", required: true },
    { key: "event", label: "Event", type: "select", default: "all",
      options: [{ value: "all", label: "Joined and Exited" }, { value: "joined", label: "Joined only" }, { value: "exited", label: "Exited only" }] },
    F.department,
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "designation", header: "Designation", type: "text", width: 22 },
    { key: "event", header: "Event", type: "text", width: 10 },
    { key: "eventDate", header: "Event Date", type: "date", width: 14 },
    { key: "exitType", header: "Exit Type", type: "text", width: 14 },
    { key: "joiningDate", header: "Joining Date", type: "date", width: 14 },
    { key: "tenureYears", header: "Tenure at Exit (Years)", type: "number", width: 20 },
  ],
  notes: [
    "Exit date = notice-period last working day, falling back to the Full & Final 'date of leaving'. Leavers with neither date cannot be placed in a period, so they are not listed.",
    "Joining date falls back to the record creation date when none was entered. Someone who joined and left inside the period appears twice (once per event).",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  extraSummary() {
    const c = { Joined: 0, Exit: 0 };
    return { add: (r) => { c[r.event] += 1; }, items: () => [{ label: "Joiners", value: c.Joined, type: "integer" }, { label: "Exits", value: c.Exit, type: "integer" }] };
  },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department });
    const exits = await loadExitDates(ctx, people);
    const inRange = (d) => d && new Date(d) >= from && new Date(d) <= to;
    const rows = [];
    for (const p of people) {
      const base = { uid: p.uid, name: p.name, department: p.department, designation: p.designation, joiningDate: p.joiningDate };
      if (f.event !== "exited" && inRange(p.joiningDate)) rows.push({ ...base, event: "Joined", eventDate: p.joiningDate, exitType: "", tenureYears: null });
      if (f.event !== "joined" && p.workingStatus !== "working") {
        const ex = exits.get(p.id);
        if (!ex) continue;
        if (inRange(ex)) {
          rows.push({ ...base, event: "Exit", eventDate: ex, exitType: EXIT_LABEL[p.workingStatus] || p.workingStatus,
            tenureYears: p.joiningDate ? round2(daysBetween(startOfISTDay(new Date(p.joiningDate)), ex) / 365) : null });
        }
      }
    }
    rows.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate) || a.name.localeCompare(b.name));
    for (const g of batches(rows)) yield g;
  },
};
