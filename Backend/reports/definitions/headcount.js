const Fnf = require("../../Models/Fnf.model");
const { loadPeople, OID } = require("../engine/people");
const { parseDateStrict, startOfISTDay, getISTDateParts, fmtDate } = require("../engine/dates");
const { F, batches } = require("./_shared");

const todayKey = () => {
  const p = getISTDateParts(new Date());
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

/**
 * PURE (unit-tested). Was this person on the books on `asOfDay`?
 *   returns "active" | "inactive" | "unknown" | "not_joined"
 * "unknown" = left the company but we hold no last-working-day anywhere, so we
 * cannot say whether they had already left on a PAST date. It is reported
 * separately instead of silently guessed.
 */
function statusAsOf(p, exitDate, asOfDay, todayDay) {
  const joined = p.joiningDate ? startOfISTDay(new Date(p.joiningDate)) : null;
  if (!joined || joined > asOfDay) return "not_joined";
  const exitDay = exitDate ? startOfISTDay(new Date(exitDate)) : null;
  if (exitDay) return exitDay < asOfDay ? "inactive" : "active"; // on the last working day itself: still counted
  if (p.workingStatus === "working") return "active";
  return asOfDay >= todayDay ? "inactive" : "unknown";
}

module.exports = {
  key: "headcount-summary",
  name: "Headcount Summary",
  category: "hr",
  sensitive: false,
  description: "Active, inactive and department-wise employee counts as of a selected date.",
  filters: [
    { key: "asOf", label: "As Of Date", type: "date", required: true, default: todayKey },
    F.department,
  ],
  columns: [
    { key: "department", header: "Department", type: "text", width: 24 },
    { key: "active", header: "Active", type: "integer", width: 12, total: true },
    { key: "inactive", header: "Inactive (Exited)", type: "integer", width: 16, total: true },
    { key: "unknown", header: "Exit Date Unknown", type: "integer", width: 18, total: true },
    { key: "total", header: "Total Joined", type: "integer", width: 14, total: true },
    { key: "activeEmployees", header: "Active Employees", type: "integer", width: 16, total: true },
    { key: "activeManagers", header: "Active Managers", type: "integer", width: 16, total: true },
    { key: "activeAdmins", header: "Active Admins", type: "integer", width: 14, total: true },
  ],
  notes: [
    "Department is each person's CURRENT department - department history is not stored, so past dates use today's department.",
    "Exit date = notice-period last working day, falling back to the Full & Final 'date of leaving'. People who left with neither date are shown under 'Exit Date Unknown' for past dates.",
    "The organisation owner (Super Admin) is counted under Active Admins.",
  ],
  period: (f) => `As of ${fmtDate(parseDateStrict(f.asOf))}`,
  statusAsOf,
  async *rows(ctx, f) {
    const asOfDay = startOfISTDay(parseDateStrict(f.asOf));
    const todayDay = startOfISTDay(new Date());
    const people = await loadPeople(ctx, { department: f.department });

    // Fall back to the F&F record for leavers with no notice-period last working day.
    const needFnf = people.filter((p) => p.workingStatus !== "working" && !p.lastWorkingDay);
    const fnfDate = new Map();
    if (needFnf.length) {
      const docs = await Fnf.find({ organisation_id: ctx.orgId, employee: { $in: needFnf.map((p) => OID(p.id)) } })
        .select("employee dateOfLeaving").lean();
      for (const d of docs) if (d.dateOfLeaving) fnfDate.set(String(d.employee), d.dateOfLeaving);
    }

    const byDept = new Map();
    for (const p of people) {
      const s = statusAsOf(p, p.lastWorkingDay || fnfDate.get(p.id) || null, asOfDay, todayDay);
      if (s === "not_joined") continue;
      const dept = p.department || "(Unassigned)";
      const row = byDept.get(dept) || { department: dept, active: 0, inactive: 0, unknown: 0, total: 0, activeEmployees: 0, activeManagers: 0, activeAdmins: 0 };
      row.total += 1;
      row[s] += 1;
      if (s === "active") {
        if (p.roleKey === "employee") row.activeEmployees += 1;
        else if (p.roleKey === "manager") row.activeManagers += 1;
        else row.activeAdmins += 1; // admin + super admin
      }
      byDept.set(dept, row);
    }
    const rows = [...byDept.values()].sort((a, b) => a.department.localeCompare(b.department));
    for (const g of batches(rows)) yield g;
  },
};
