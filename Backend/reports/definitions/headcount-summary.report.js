const { z } = require("zod");
const {
  getEmployeesAsOf,
  asOfSchema,
} = require("../helpers/employment.helper");

const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const GROUP_BY = ["department", "designation", "status", "office_location"];

const filterSchema = z.object({
  asOf: asOfSchema,
  group_by: z.enum(GROUP_BY).default("department"),
  department: z.string().trim().min(1).optional(),
  designation: z.string().trim().min(1).optional(),
  office_location: z.string().trim().min(1).optional(),
  status: z.enum(["working", "on_notice"]).optional(),
});

module.exports = {
  key: "headcount-summary",
  title: "Headcount Summary",
  description:
    "Employees on payroll on the reporting date, grouped by the chosen field",
  permission: "reports.employee.view",
  filterSchema,

  filterFields: [
    { name: "asOf", label: "As of date", type: "date" },
    { name: "group_by", label: "Group by", type: "select", options: GROUP_BY },
    { name: "department", label: "Department", type: "text" },
    { name: "designation", label: "Designation", type: "text" },
    { name: "office_location", label: "Work location", type: "text" },
    {
      name: "status",
      label: "Employment status",
      type: "select",
      options: ["working", "on_notice"],
    },
  ],

  columns: [
    { key: "group", label: "Group", type: "string", width: 28 },
    { key: "headcount", label: "Headcount", type: "number" },
    { key: "working", label: "Working", type: "number" },
    { key: "onNotice", label: "On notice", type: "number" },
    { key: "share", label: "% of total", type: "percent" },
  ],

  // Only people employed on the reporting date: not joined yet and already exited are excluded
  fetchData(filters, ctx) {
    return getEmployeesAsOf(ctx, { ...filters, includeExited: false });
  },

  calculate(rows, filters) {
    const key = filters.group_by || "department";
    const groups = new Map();

    for (const u of rows) {
      const label = u[key] || "Unassigned";
      const g = groups.get(label) || { headcount: 0, working: 0, onNotice: 0 };
      g.headcount++;
      if (u.status === "on_notice") g.onNotice++;
      else g.working++;
      groups.set(label, g);
    }

    const total = rows.length;
    const out = Array.from(groups, ([group, g]) => ({
      group,
      ...g,
      share: total ? Math.round((g.headcount / total) * 1000) / 10 : 0,
    })).sort((a, b) => b.headcount - a.headcount);

    return {
      rows: out,
      summary: {
        "As of date": dateOnly(filters.asOf || new Date()),
        "Grouped by": key,
        "Total headcount": total,
        Working: out.reduce((s, r) => s + r.working, 0),
        "On notice": out.reduce((s, r) => s + r.onNotice, 0),
      },
    };
  },
};
