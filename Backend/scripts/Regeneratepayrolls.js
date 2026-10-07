// =====================================================================
// STEP 1: paste this whole block into controllers/payroll.controller.js,
//         just ABOVE the line:   const listPayrolls = async (req, res) => {
// STEP 2: in the module.exports = { ... } at the bottom of that file, add:
//         regeneratePayrollsForMonth,
// (no new imports needed - it uses helpers already in that file)
// =====================================================================

// Re-derives the ATTENDANCE-driven numbers of payrolls that already exist for
// one org / month / employeeModel, after AttendanceSummary (or an approved
// timesheet / overtime request) was corrected late. Used by
// scripts/Regeneratepayrolls.js - not wired to any route.
//
// Differences from bulkGeneratePayroll (deliberate):
//  - only touches payrolls that ALREADY exist, in `statuses` ("paid" is never
//    allowed - money has already gone out);
//  - keeps what an admin typed by hand: bonus, incentive, reimbursement,
//    other earnings, loan, advance, other deductions, and a manual overtime
//    amount. bulkGeneratePayroll would reset all of those to 0;
//  - skips payrolls whose paid days were typed in by hand (manualEntry);
//  - a changed "approved" payroll goes back to "generated" so it gets
//    re-approved; status/generatedBy/remarks/snapshots are otherwise kept.
// Uses the CURRENT salary structure + payroll policy, same as any regenerate.
const regeneratePayrollsForMonth = async ({
  organisation_id,
  month,
  year,
  employeeModel = "User",
  statuses = ["generated"],
  apply = false,
  employeeIds = null,
}) => {
  const report = { organisation_id, month, year, employeeModel, considered: 0, changed: 0, unchanged: 0, skipped: [], changes: [] };
  if (!ALLOWED_EMPLOYEE_MODELS.includes(employeeModel)) return report;

  const allowedStatuses = (statuses || []).filter((st) => ["generated", "approved"].includes(st));
  if (!allowedStatuses.length) return report;

  const payrollFilter = {
    organisation_id,
    employeeModel,
    month: Number(month),
    year: Number(year),
    status: { $in: allowedStatuses },
  };
  if (employeeIds?.length) payrollFilter.employee = { $in: employeeIds };

  const payrolls = await Payroll.find(payrollFilter).lean();
  report.considered = payrolls.length;
  if (!payrolls.length) return report;

  const ids = payrolls.map((p) => p.employee);
  const role = employeeModel === "User" ? "employee" : employeeModel.toLowerCase();

  const [structures, workingStatusMap, policy, summaries, employeeDocs] = await Promise.all([
    SalaryStructure.find({ organisation_id, employeeModel, employee: { $in: ids }, isActive: true }).lean(),
    getWorkingStatusMap(employeeModel, ids),
    getOrCreatePolicy(organisation_id),
    AttendanceSummary.find({ employee: { $in: ids }, role, month: Number(month), year: Number(year) }).lean(),
    EMPLOYEE_MODEL_MAP[employeeModel].find({ _id: { $in: ids } }).select("date_of_joining createdAt").lean(),
  ]);

  const structureByEmployee = new Map(structures.map((st) => [String(st.employee), st]));
  const summaryByEmployee = new Map(summaries.map((sm) => [String(sm.employee), sm]));
  const employeeDocById = new Map(employeeDocs.map((d) => [String(d._id), d]));

  const [overtimeByEmployee, requestsByEmployee, timesheetAttendanceByEmployee] = await Promise.all([
    getTimesheetOvertimeByEmployee({ organisation_id, employeeModel, employeeIds: ids, month, year }),
    getOvertimeRequestsByEmployee({ organisation_id, employeeModel, employeeIds: ids, month, year }),
    getTimesheetAttendanceByEmployee({
      organisation_id,
      employeeModel,
      employees: structures
        .filter((st) => isTimesheetBasis(st, employeeModel, month, year))
        .map((st) => ({ id: st.employee, joinDate: getEffectiveJoinDate(employeeDocById.get(String(st.employee))) })),
      month,
      year,
      policy,
    }),
  ]);

  const ops = [];
  const linkJobs = [];

  for (const p of payrolls) {
    const key = String(p.employee);
    const label = p.employeeSnapshot?.name || key;

    if (p.attendance?.manualEntry) {
      report.skipped.push({ employee: p.employee, name: label, reason: "paid days were typed in by hand" });
      continue;
    }
    const structure = structureByEmployee.get(key);
    if (!structure?.breakup?.monthlyGross) {
      report.skipped.push({ employee: p.employee, name: label, reason: "no active salary structure" });
      continue;
    }
    if ((workingStatusMap.get(key) || "working") !== "working") {
      report.skipped.push({ employee: p.employee, name: label, reason: "resigned/terminated - settle via FnF" });
      continue;
    }

    const timesheetBasis = isTimesheetBasis(structure, employeeModel, month, year);
    const attendanceSummary = timesheetBasis
      ? timesheetAttendanceByEmployee.get(key) || null
      : summaryByEmployee.get(key) || null;

    const { amount: overtimeAmount, detail: overtimeDetail } = buildOvertime({
      policy,
      structure,
      overtimeEntry: overtimeByEmployee.get(key),
      manualOvertime: p.overtimeDetail?.source === "manual" ? p.earnings?.overtime || 0 : 0,
      requestEntry: requestsByEmployee.get(key),
      month,
      year,
    });

    const result = calculatePayrollForMonth({
      structure,
      policy,
      attendanceSummary,
      month: Number(month),
      year: Number(year),
      extras: {
        bonus: p.earnings?.bonus,
        incentive: p.earnings?.incentive,
        overtime: overtimeAmount,
        reimbursement: p.earnings?.reimbursement,
        otherEarnings: p.earnings?.other,
        loan: p.deductions?.loan,
        advance: p.deductions?.advance,
        otherDeductions: p.deductions?.other,
      },
      dateOfJoining: getEffectiveJoinDate(employeeDocById.get(key)),
    });

    const before = {
      absent: p.attendance?.absentDays ?? 0,
      half: p.attendance?.halfDays ?? 0,
      paid: p.attendance?.paidDays ?? 0,
      overtime: p.earnings?.overtime ?? 0,
      net: p.netSalary ?? 0,
    };
    const after = {
      absent: result.attendance.absentDays,
      half: result.attendance.halfDays,
      paid: result.attendance.paidDays,
      overtime: result.earnings.overtime,
      net: result.netSalary,
    };

    if (JSON.stringify(before) === JSON.stringify(after)) {
      report.unchanged += 1;
      continue;
    }

    report.changed += 1;
    report.changes.push({ employee: p.employee, name: label, status: p.status, before, after });

    ops.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { ...result, overtimeDetail, status: "generated" } },
      },
    });
    linkJobs.push({ employee: p.employee, payrollId: p._id, requestIds: overtimeDetail.requestIds || [] });
  }

  if (apply && ops.length) {
    await Payroll.bulkWrite(ops, { ordered: false });
    for (const job of linkJobs) {
      await linkRequestsToPayroll({
        employee: job.employee,
        employeeModel,
        month,
        year,
        payrollId: job.payrollId,
        requestIds: job.requestIds,
      });
    }
  }

  return report;
};