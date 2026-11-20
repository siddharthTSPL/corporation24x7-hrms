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
  // ---- Phase 2 ----
  require("./definitions/joiningExit"),
  require("./definitions/attendanceExceptions"),
  require("./definitions/leaveUtilization"),
  require("./definitions/payrollStatus"),
  require("./definitions/recruitmentFunnel"),
  require("./definitions/offerJoining"),
  require("./definitions/reviewCompletion"),
  require("./definitions/timesheetApproval"),
  require("./definitions/expenseApproval"),
  // ---- Phase 3: analytics (each carries a `chart` spec rendered from the same rows) ----
  require("./definitions/workforceTrends"),
  require("./definitions/payrollCostTrends"),
  require("./definitions/recruitmentEfficiency"),
  require("./definitions/ratingDistribution"),
  require("./definitions/projectBillable"),
  require("./definitions/expenseTrends"),
  require("./definitions/managementOverview"),
];

const CATEGORIES = [
  { key: "hr", label: "Employee & HR" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "timesheet", label: "Timesheet" },
  { key: "expense", label: "Expense" },
  { key: "recruitment", label: "Recruitment" },
  { key: "performance", label: "Performance" },
  { key: "management", label: "Management Overview" },
];

const map = new Map();
for (const d of defs) {
  if (map.has(d.key)) throw new Error(`Duplicate report key: ${d.key}`);
  map.set(d.key, d);
}

module.exports = { get: (key) => map.get(String(key)), all: () => defs, CATEGORIES };
