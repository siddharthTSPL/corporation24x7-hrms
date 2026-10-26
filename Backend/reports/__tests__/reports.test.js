// Run: node --test reports/__tests__
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ExcelJS = require("exceljs");

const { evaluateAccess } = require("../engine/access");
const { normalizeFilters } = require("../engine/filters");
const { sanitizeText, streamWorkbook } = require("../engine/excelWriter");
const { makeAccumulator } = require("../engine/summary");
const { istRange, parseDateStrict, fmtDate } = require("../engine/dates");
const headcount = require("../definitions/headcount");
const monthly = require("../definitions/monthlyAttendance");
const leaveTx = require("../definitions/leaveTransactions");
const leaveBal = require("../definitions/leaveBalance");
const ts = require("../definitions/timesheetSummary");
const reg = require("../definitions/payrollRegister");
const comp = require("../definitions/payrollComponents");

const DEF = (category) => ({ category });
const perms = (r = {}, payroll = false) => ({ reports: r, payroll: { can_manage_payroll: payroll } });

// ---------------- access matrix ----------------
test("SuperAdmin and Admin: every report, org scope, can export", () => {
  for (const m of ["SuperAdmin", "Admin"]) {
    const a = evaluateAccess({ actorModel: m, role: m === "Admin" ? "admin" : "super_admin", perms: null }, DEF("payroll"));
    assert.deepEqual([a.allowed, a.scope, a.canExport], [true, "org", true]);
  }
});
test("employee without any reports permission: denied everywhere", () => {
  for (const c of ["hr", "attendance", "leave", "payroll", "timesheet", "expense"]) {
    assert.equal(evaluateAccess({ actorModel: "User", role: "employee", perms: null }, DEF(c)).allowed, false);
    assert.equal(evaluateAccess({ actorModel: "User", role: "employee", perms: perms() }, DEF(c)).allowed, false);
  }
});
test("payroll reports need payroll.can_manage_payroll even with reports enabled", () => {
  const p = perms({ can_view_reports: true, can_export_reports: true, can_view_hr_reports: true }, false);
  assert.equal(evaluateAccess({ actorModel: "Manager", role: "manager", perms: p }, DEF("payroll")).allowed, false);
  const ok = evaluateAccess({ actorModel: "Manager", role: "manager", perms: perms({ can_view_reports: true, can_export_reports: true }, true) }, DEF("payroll"));
  assert.equal(ok.allowed, true);
});
test("manager: team scope by default, org scope only when granted; plain employee has no scope", () => {
  const base = { can_view_reports: true, can_view_hr_reports: true };
  assert.equal(evaluateAccess({ actorModel: "Manager", role: "manager", perms: perms(base) }, DEF("hr")).scope, "team");
  assert.equal(evaluateAccess({ actorModel: "Manager", role: "manager", perms: perms({ ...base, can_view_all_employees: true }) }, DEF("hr")).scope, "org");
  const emp = evaluateAccess({ actorModel: "User", role: "employee", perms: perms(base) }, DEF("hr"));
  assert.equal(emp.allowed, false);
  assert.equal(emp.reason, "no_scope");
});
test("export needs its own flag", () => {
  const p = perms({ can_view_reports: true, can_view_leave_reports: true });
  const a = evaluateAccess({ actorModel: "Manager", role: "manager", perms: p }, DEF("leave"));
  assert.equal(a.allowed, true);
  assert.equal(a.canExport, false);
});
test("category flag is per category", () => {
  const p = perms({ can_view_reports: true, can_view_leave_reports: true });
  assert.equal(evaluateAccess({ actorModel: "Manager", role: "manager", perms: p }, DEF("expense")).allowed, false);
});

// ---------------- filters ----------------
test("filters: unknown keys dropped, ids validated, required enforced", () => {
  const def = { filters: [
    { key: "from", label: "From", type: "date", required: true },
    { key: "employees", label: "Employee", type: "employees" },
    { key: "statuses", label: "Status", type: "multiselect", options: [{ value: "a" }] },
  ] };
  const ok = normalizeFilters(def, { from: "2026-10-01", organisation_id: "HACK", employees: ["64b7f0f4f4f4f4f4f4f4f4f4"] });
  assert.equal(ok.organisation_id, undefined);
  assert.throws(() => normalizeFilters(def, {}), /From is required/);
  assert.throws(() => normalizeFilters(def, { from: "2026-13-40" }), /valid|format/);
  assert.throws(() => normalizeFilters(def, { from: "2026-10-01", employees: [{ $ne: null }] }), /Invalid/);
  assert.throws(() => normalizeFilters(def, { from: "2026-10-01", statuses: ["zzz"] }), /Invalid/);
});
test("date range: reversed and oversized ranges rejected", () => {
  assert.throws(() => istRange("2026-10-10", "2026-10-01"), /cannot be after/);
  assert.throws(() => istRange("2026-01-01", "2026-12-31", { maxDays: 31 }), /too large/);
  assert.equal(istRange("2026-10-01", "2026-10-31", { maxDays: 31 }).days, 31);
});

// ---------------- headcount as-of ----------------
test("headcount statusAsOf: joining, exit day boundary, unknown exit", () => {
  const d = (s) => parseDateStrict(s);
  const today = d("2026-10-26");
  const p = (over) => ({ joiningDate: d("2026-01-10"), workingStatus: "working", ...over });
  assert.equal(headcount.statusAsOf(p(), null, d("2026-01-09"), today), "not_joined");
  assert.equal(headcount.statusAsOf(p(), null, d("2026-01-10"), today), "active");
  assert.equal(headcount.statusAsOf(p({ workingStatus: "resigned" }), d("2026-06-30"), d("2026-06-30"), today), "active"); // last working day still counted
  assert.equal(headcount.statusAsOf(p({ workingStatus: "resigned" }), d("2026-06-30"), d("2026-07-01"), today), "inactive");
  assert.equal(headcount.statusAsOf(p({ workingStatus: "fired" }), null, d("2026-03-01"), today), "unknown");
  assert.equal(headcount.statusAsOf(p({ workingStatus: "fired" }), null, today, today), "inactive");
  assert.equal(headcount.statusAsOf(p({ joiningDate: null }), null, today, today), "not_joined");
});

// ---------------- monthly attendance ----------------
test("monthly summary: working days, paid leave vs LWP, attendance %", () => {
  const days = [
    ...Array(10).fill({ status: "present" }),
    { status: "half_day" },
    { status: "absent" },
    { status: "leave", leaveType: "el", isLwpDay: false },
    { status: "leave", leaveType: "lwp", isLwpDay: true },
    { status: "week_off" }, { status: "week_off" }, { status: "holiday" },
  ];
  const s = monthly.summarizeDays(days);
  assert.equal(s.daysCovered, 17);
  assert.equal(s.workingDays, 14);
  assert.equal(s.presentDays, 10);
  assert.equal(s.paidLeaveDays, 1);
  assert.equal(s.unpaidLeaveDays, 1);
  assert.equal(s.absentDays, 1);
  assert.equal(s.weekOffHolidayDays, 3);
  assert.equal(s.attendancePct, Math.round(((10 + 0.5 + 1) / 14) * 10000) / 100);
});
test("monthly summary: no working days -> null %, not NaN", () => {
  assert.equal(monthly.summarizeDays([{ status: "week_off" }]).attendancePct, null);
});

// ---------------- leave ----------------
test("leave status normalisation covers all collections", () => {
  const n = leaveTx.normalizeStatus;
  for (const s of ["pending_manager", "pending_admin", "pending_coadmin", "pending_superadmin", "pending_reporting_manager"]) assert.equal(n(s), "Pending");
  for (const s of ["approved_manager", "approved_admin", "approved_reporting_manager", "approved_superadmin"]) assert.equal(n(s), "Approved");
  for (const s of ["rejected_manager", "rejected_admin", "rejected_superadmin"]) assert.equal(n(s), "Rejected");
  for (const s of ["forwarded_admin", "forwarded_reporting_manager"]) assert.equal(n(s), "Forwarded");
});
test("leave balance remaining matches the Leave screen rule", () => {
  assert.deepEqual(leaveBal.remaining({ EL: { accrued: 7.5, availed: 2 }, SL: { entitled: 6, availed: 8 } }), { el: 5.5, sl: 0 });
});

// ---------------- timesheet ----------------
test("timesheet fold: statuses bucket correctly and nothing is double counted", () => {
  const statusById = new Map([["t1", "approved"], ["t2", "rejected"], ["t3", "pending_manager"], ["t4", "draft"]]);
  const groups = [
    { emp: "e1", ts: "t1", minutes: 480 }, { emp: "e1", ts: "t2", minutes: 120 },
    { emp: "e1", ts: "t3", minutes: 60 }, { emp: "e1", ts: "t4", minutes: 30 }, { emp: "e1", ts: null, minutes: 90 },
  ];
  const e1 = ts.foldHours(groups, statusById, null).get("e1");
  assert.equal(e1.Approved, 480); assert.equal(e1.Rejected, 120); assert.equal(e1.Pending, 60); assert.equal(e1.Draft, 120);
  assert.equal(e1.sheets.size, 3);
  // resubmitted: same timesheet, now approved -> counted once, under Approved only
  const after = ts.foldHours([{ emp: "e1", ts: "t2", minutes: 120 }], new Map([["t2", "approved"]]), null).get("e1");
  assert.deepEqual([after.Approved, after.Rejected, after.Pending], [120, 0, 0]);
  // status filter
  const only = ts.foldHours(groups, statusById, new Set(["Rejected"])).get("e1");
  assert.equal(only.Approved, 0); assert.equal(only.Rejected, 120);
});

// ---------------- payroll ----------------
const payslip = (over = {}) => ({
  month: 10, year: 2026, status: "approved",
  employeeSnapshot: { name: "A B", employeeId: "E1", department: "ENG", designation: "Dev", accountNumber: "SECRET" },
  attendance: { workingDays: 30, paidDays: 29, lopDays: 1 },
  breakup: { basic: 20000, hra: 8000, allowances: [{ name: "Conveyance", amount: 2000 }], monthlyGross: 31000,
    benefitComponents: [{ name: "Meal", amount: 500 }], reimbursementComponents: [], deductionComponents: [{ name: "Canteen", amount: 100 }] },
  earnings: { gross: 30000, bonus: 1000, incentive: 0, overtime: 0, reimbursement: 0, other: 0, benefits: 500, reimbursementComponents: 0, totalEarnings: 31500 },
  deductions: { pf: 2400, esi: 0, professionalTax: 200, tds: 0, lwf: 0, lossOfPay: 1000, loan: 0, advance: 0, other: 0, components: 100, totalDeductions: 2700 },
  employerContribution: { pf: 2400, esi: 0, gratuity: 0, lwf: 0, statutoryBonus: 0 },
  netSalary: 28800,
  ...over,
});
test("payroll register row: gross is earned gross, net verified, no bank data", () => {
  const r = reg.registerRow(payslip());
  assert.equal(r.grossSalary, 30000);
  assert.equal(r.fixedMonthlyGross, 31000);
  assert.equal(r.totalEarnings, 31500);
  assert.equal(r.totalDeductions, 2700);
  assert.equal(r.netSalary, 28800);
  assert.equal(r.check, "OK");
  assert.ok(!JSON.stringify(r).includes("SECRET"));
  assert.equal(reg.registerRow(payslip({ netSalary: 1 })).check, "Mismatch");
});
test("payroll register totals count finalised rows only", () => {
  const acc = reg.accumulator();
  acc.add({ ...reg.registerRow(payslip()) });
  acc.add({ ...reg.registerRow(payslip({ status: "generated" })) });
  acc.add({ ...reg.registerRow(payslip({ status: "paid" })) });
  const r = acc.result();
  assert.equal(r.columnTotals.netSalary, 57600);
  assert.ok(r.items.some((i) => /excluded/.test(i.label) && i.value === 1));
});
test("earnings & deductions unpivot reconciles and keeps employer/memo separate", () => {
  const rows = comp.unpivot(payslip());
  const sum = (t) => Math.round(rows.filter((r) => r.type === t).reduce((s, r) => s + r.amount, 0) * 100) / 100;
  assert.equal(sum("Earning"), 31500);
  assert.equal(sum("Deduction"), 2700);
  assert.equal(sum("Earning") - sum("Deduction"), 28800);
  assert.equal(sum("Employer Contribution"), 2400);
  assert.equal(sum("Memo (not part of net pay)"), 1000);
  assert.ok(comp.reconciles(payslip()));
});
test("unpivot emits an explicit unitemised row instead of drifting", () => {
  const doc = payslip({ earnings: { ...payslip().earnings, benefits: 800, totalEarnings: 31800 } });
  const rows = comp.unpivot(doc);
  assert.ok(rows.some((r) => r.component === "Benefits (unitemised)" && r.amount === 300));
  assert.equal(rows.filter((r) => r.type === "Earning").reduce((s, r) => s + r.amount, 0), 31800);
});

// ---------------- excel ----------------
test("excel: sanitises formulas, writes real dates/numbers, totals, row-for-row parity", async () => {
  assert.equal(sanitizeText("=1+1"), "'=1+1");
  assert.equal(sanitizeText("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(sanitizeText("Normal"), "Normal");

  const columns = [
    { key: "name", header: "Name", type: "text" },
    { key: "d", header: "Date", type: "date" },
    { key: "amt", header: "Amount", type: "currency", total: true },
  ];
  const data = [
    { name: "=HYPERLINK(\"x\")", d: new Date("2026-10-05T18:30:00Z"), amt: 100.5 }, // = 06-Oct IST
    { name: "B", d: null, amt: 50 },
  ];
  const file = path.join(os.tmpdir(), `rep-${Date.now()}.xlsx`);
  const out = fs.createWriteStream(file);
  const acc = makeAccumulator(columns);
  const n = await streamWorkbook({
    res: out, columns,
    meta: { reportName: "Test Report", organisationName: "Org", period: "Oct 2026", filterLines: ["Dept: ENG"], notes: ["n1"], generatedAt: new Date(), generatedAtText: "now", generatedBy: "me" },
    rows: (async function* () { for (const r of data) yield r; })(),
    accumulator: acc, maxRows: 10,
  });
  await new Promise((r) => out.on("close", r));
  assert.equal(n, 2);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const rows = []; ws.eachRow((r) => rows.push(r.values.slice(1)));
  const headerIdx = rows.findIndex((r) => r[0] === "Name");
  assert.ok(headerIdx > 0);
  assert.equal(rows[headerIdx + 1][0], "'=HYPERLINK(\"x\")");
  assert.equal(rows[headerIdx + 1][1].toISOString().slice(0, 10), "2026-10-06"); // IST calendar day preserved
  assert.equal(rows[headerIdx + 1][2], 100.5);
  assert.equal(rows[headerIdx + 3][2], 150.5); // totals row
  assert.equal(rows[0][0], "Test Report");
  fs.unlinkSync(file);
});
test("excel: row cap throws instead of silently truncating", async () => {
  const out = fs.createWriteStream(path.join(os.tmpdir(), `cap-${Date.now()}.xlsx`));
  await assert.rejects(
    streamWorkbook({
      res: out, columns: [{ key: "a", header: "A", type: "text" }],
      meta: { reportName: "X", filterLines: [], generatedAt: new Date(), generatedAtText: "" },
      rows: (async function* () { yield { a: "1" }; yield { a: "2" }; })(),
      accumulator: makeAccumulator([]), maxRows: 1,
    }),
    /row limit/
  );
});
test("date formatting is IST", () => {
  assert.equal(fmtDate(new Date("2026-10-05T18:30:00Z")), "06-Oct-2026");
});
