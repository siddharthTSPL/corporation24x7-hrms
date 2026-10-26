// Adding a Phase 2/3 report = one new definition file + one line here.
const defs = [
  require("./definitions/employeeMaster"),
  require("./definitions/headcount"),
  require("./definitions/dailyAttendance"),
  require("./definitions/monthlyAttendance"),
  require("./definitions/leaveBalance"),
  require("./definitions/leaveTransactions"),
  require("./definitions/payrollRegister"),
  require("./definitions/payrollComponents"),
  require("./definitions/timesheetSummary"),
  require("./definitions/expenseRegister"),
];

const CATEGORIES = [
  { key: "hr", label: "Employee & HR" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "timesheet", label: "Timesheet" },
  { key: "expense", label: "Expense" },
];

const map = new Map();
for (const d of defs) {
  if (map.has(d.key)) throw new Error(`Duplicate report key: ${d.key}`);
  map.set(d.key, d);
}

module.exports = { get: (key) => map.get(String(key)), all: () => defs, CATEGORIES };
