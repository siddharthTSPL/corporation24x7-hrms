const { z } = require("zod");
const {
  getEmployeesAsOf,
  asOfSchema,
  STATUS_VALUES,
} = require("../helpers/employment.helper");

const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const filterSchema = z.object({
  asOf: asOfSchema,
  department: z.string().trim().min(1).optional(),
  designation: z.string().trim().min(1).optional(),
  office_location: z.string().trim().min(1).optional(),
  status: z.enum(STATUS_VALUES).optional(),
});

module.exports = {
  key: "employee-master",
  title: "Employee Master",
  description:
    "Employee details as of a reporting date, with their effective employment status",
  permission: "reports.employee.view",
  filterSchema,

  filterFields: [
    { name: "asOf", label: "As of date", type: "date" },
    { name: "department", label: "Department", type: "text" },
    { name: "designation", label: "Designation", type: "text" },
    { name: "office_location", label: "Work location", type: "text" },
    {
      name: "status",
      label: "Employment status",
      type: "select",
      options: STATUS_VALUES,
    },
  ],

  columns: [
    { key: "empid", label: "Employee ID", type: "string", width: 16 },
    { key: "name", label: "Name", type: "string", width: 26 },
    { key: "department", label: "Department", type: "string", width: 20 },
    { key: "designation", label: "Designation", type: "string", width: 22 },
    { key: "joiningDate", label: "Joining date", type: "date", width: 14 },
    { key: "status", label: "Employment status", type: "string", width: 18 },
    {
      key: "exitDate",
      label: "Exit / last working day",
      type: "date",
      width: 20,
    },
    { key: "manager", label: "Manager", type: "string", width: 24 },
    { key: "location", label: "Work location", type: "string", width: 20 },
  ],

  // Master report lists everyone who had joined by the date, exited people included
  fetchData(filters, ctx) {
    return getEmployeesAsOf(ctx, { ...filters, includeExited: true });
  },

  calculate(rows, filters) {
    const out = rows
      .map((u) => ({
        empid: u.empid,
        name: `${u.f_name || ""} ${u.l_name || ""}`.trim(),
        department: u.department || "",
        designation: u.designation || "",
        joiningDate: dateOnly(u.joinDate),
        status: u.status,
        exitDate: dateOnly(u.exitDate),
        manager: u.Under_manager
          ? `${u.Under_manager.f_name || ""} ${u.Under_manager.l_name || ""}`.trim()
          : "",
        location: u.office_location || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      rows: out,
      summary: {
        "As of date": dateOnly(filters.asOf || new Date()),
        "Total records": out.length,
      },
    };
  },
};
