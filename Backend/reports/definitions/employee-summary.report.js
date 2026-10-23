const { z } = require("zod");
const User = require("../../Models/user.model");
const { companyScope, dateRange } = require("../report.helpers");

const filterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  department: z.string().trim().min(1).optional(),
  working_status: z
    .enum(["working", "resigned", "fired", "terminated"])
    .optional(),
});

module.exports = {
  key: "employee-summary",
  title: "Employee Summary",
  description:
    "Employees grouped by department, with working and exited counts",
  permission: "reports.employee.view",
  filterSchema,

  // The React page uses this to draw the filter form
  filterFields: [
    { name: "from", label: "Joined from", type: "date" },
    { name: "to", label: "Joined to", type: "date" },
    { name: "department", label: "Department", type: "text" },
    {
      name: "working_status",
      label: "Working status",
      type: "select",
      options: ["working", "resigned", "fired", "terminated"],
    },
  ],

  columns: [
    { key: "department", label: "Department", type: "string", width: 24 },
    { key: "total", label: "Total", type: "number" },
    { key: "working", label: "Working", type: "number" },
    { key: "exited", label: "Exited", type: "number" },
    { key: "workingPercent", label: "Working %", type: "percent" },
  ],

  async fetchData(filters, ctx) {
    const match = companyScope(ctx); // organisation filter is always applied
    if (filters.department) match.department = filters.department;
    if (filters.working_status) match.working_status = filters.working_status;
    const range = dateRange(filters.from, filters.to);
    if (range) match.date_of_joining = range;

    return User.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$department",
          total: { $sum: 1 },
          working: {
            $sum: { $cond: [{ $eq: ["$working_status", "working"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  },

  calculate(rows) {
    const out = rows.map((g) => ({
      department: g._id || "Unassigned",
      total: g.total,
      working: g.working,
      exited: g.total - g.working,
      workingPercent: g.total
        ? Math.round((g.working / g.total) * 1000) / 10
        : 0,
    }));
    return {
      rows: out,
      summary: {
        "Total employees": out.reduce((s, r) => s + r.total, 0),
        "Total departments": out.length,
      },
    };
  },
};
