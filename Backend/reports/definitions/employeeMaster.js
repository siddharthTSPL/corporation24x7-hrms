const { loadPeople, resolveNames } = require("../engine/people");
const { parseDateStrict, endOfISTDay, startOfISTDay } = require("../engine/dates");
const { batches, employmentStatus, F, periodText } = require("./_shared");

module.exports = {
  key: "employee-master",
  name: "Employee Master Report",
  category: "hr",
  sensitive: true, // run + export are written to the audit log
  description: "Employee ID, name, department, designation, joining date, employment status, manager and work location.",
  filters: [
    F.department,
    F.designation,
    { key: "status", label: "Employment Status", type: "select", default: "all",
      options: [{ value: "all", label: "All" }, { value: "working", label: "Working" }, { value: "exited", label: "Resigned / Fired / Terminated" }] },
    { key: "manager", label: "Reporting Manager", type: "employee", lookup: "managers" },
    F.employees,
    { key: "joinedFrom", label: "Joined From", type: "date" },
    { key: "joinedTo", label: "Joined To", type: "date" },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "designation", header: "Designation", type: "text", width: 22 },
    { key: "joiningDate", header: "Joining Date", type: "date", width: 14 },
    { key: "employmentStatus", header: "Employment Status", type: "text", width: 18 },
    { key: "role", header: "Role", type: "text", width: 14 },
    { key: "manager", header: "Reporting Manager", type: "text", width: 24 },
    { key: "location", header: "Work Location", type: "text", width: 20 },
  ],
  notes: [
    "Joining date falls back to the record creation date when no joining date was entered.",
    "Personal identifiers (Aadhaar, PAN, date of birth) and bank details are intentionally excluded.",
  ],
  period: (f) => periodText(f.joinedFrom, f.joinedTo) === "All dates" ? "All employees" : `Joined ${periodText(f.joinedFrom, f.joinedTo)}`,
  validate(f) {
    if (f.joinedFrom && f.joinedTo && f.joinedFrom > f.joinedTo) {
      const err = new Error("'Joined From' cannot be after 'Joined To'.");
      err.statusCode = 400;
      throw err;
    }
  },
  extraSummary() {
    const byStatus = {};
    return {
      add: (r) => { byStatus[r.employmentStatus] = (byStatus[r.employmentStatus] || 0) + 1; },
      items: () => Object.entries(byStatus).map(([k, v]) => ({ label: k, value: v, type: "integer" })),
    };
  },
  async *rows(ctx, f) {
    let people = await loadPeople(ctx, {
      department: f.department,
      designation: f.designation,
      status: f.status && f.status !== "all" ? f.status : undefined,
      employeeIds: f.employees,
      managerId: f.manager?.[0],
    });
    if (f.joinedFrom) { const from = startOfISTDay(parseDateStrict(f.joinedFrom)); people = people.filter((p) => p.joiningDate && new Date(p.joiningDate) >= from); }
    if (f.joinedTo) { const to = endOfISTDay(parseDateStrict(f.joinedTo)); people = people.filter((p) => p.joiningDate && new Date(p.joiningDate) <= to); }

    const names = await resolveNames(ctx, people.map((p) => ({ id: p.managerId, model: p.managerModel })));
    for (const group of batches(people)) {
      yield group.map((p) => ({
        uid: p.uid,
        name: p.name,
        department: p.department,
        designation: p.designation,
        joiningDate: p.joiningDate,
        employmentStatus: employmentStatus(p),
        role: p.roleLabel,
        manager: (p.managerId && names.get(`${p.managerModel}:${p.managerId}`)) || "",
        location: p.location,
      }));
    }
  },
};
