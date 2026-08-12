/**
 * Pure calculation helpers for payroll. No DB calls here on purpose —
 * controllers fetch PayrollPolicy / SalaryStructure / AttendanceSummary
 * and pass plain data in, so this logic stays easy to unit-test and reuse
 * (e.g. for a "preview breakup before saving" endpoint later).
 */

const daysInMonth = (month, year) => new Date(Date.UTC(year, month, 0)).getUTCDate();


/**
 * Given an annual CTC and the org's PayrollPolicy (mongoose doc or plain
 * object), returns the monthly salary breakup.
 *
 * Model followed (matches standard Indian payroll practice):
 *   Monthly Gross = CTC / 12
 *   Basic         = basic.percentOfGross % of Gross
 *   HRA           = hra.percentOfBasic % of Basic (if hra.enabled)
 *   Named allowances = flat amount, or percentOfBasic % of Basic
 *   Balancing allowance (isBalancing: true) soaks up whatever is left of
 *     Gross after Basic + HRA + every other named allowance, so the
 *     breakup always reconciles back to the monthly gross exactly.
 *   Employer PF / ESI are informational only (part of cost-to-company,
 *     already inside CTC) — they do NOT reduce the employee's monthly gross.
 */
function calculateSalaryBreakup(ctc, policy) {
  const monthlyGross = round2(ctc / 12);

  const basicPercent = policy?.basic?.percentOfGross ?? 40;
  const basic = round2((basicPercent / 100) * monthlyGross);

  const hraEnabled = policy?.hra?.enabled !== false;
  const hraPercent = policy?.hra?.percentOfBasic ?? 50;
  const hra = hraEnabled ? round2((hraPercent / 100) * basic) : 0;

  const allowanceDefs = Array.isArray(policy?.allowances) ? policy.allowances : [];
  const namedAllowances = allowanceDefs.filter((a) => a.enabled !== false && !a.isBalancing);
  const balancingDef = allowanceDefs.find((a) => a.enabled !== false && a.isBalancing);

  const allowances = namedAllowances.map((a) => {
    const amount = a.flatAmount > 0 ? a.flatAmount : round2(((a.percentOfBasic || 0) / 100) * basic);
    return { name: a.name, amount: round2(amount) };
  });

  const namedTotal = allowances.reduce((sum, a) => sum + a.amount, 0);
  const remainder = round2(monthlyGross - basic - hra - namedTotal);

  if (balancingDef) {
    // Balancing allowance can't go negative — if the fixed components
    // already exceed gross (misconfigured policy / very low CTC), clamp
    // to 0 rather than shipping a negative line item on the payslip.
    allowances.push({ name: balancingDef.name, amount: Math.max(0, remainder) });
  } else if (remainder !== 0) {
    // No balancing allowance configured — surface the leftover explicitly
    // rather than silently dropping it, so it doesn't vanish unaccounted.
    allowances.push({ name: "Other Allowance", amount: Math.max(0, remainder) });
  }

  const pfEnabled = policy?.pf?.enabled !== false;
  let employerPF = 0;
  if (pfEnabled) {
    const pfWage =
      policy?.pf?.applyWageCeiling && policy?.pf?.wageCeiling
        ? Math.min(basic, policy.pf.wageCeiling)
        : basic;
    employerPF = round2(((policy?.pf?.employerPercent ?? 12) / 100) * pfWage);
  }

  const esiEnabled = policy?.esi?.enabled === true && monthlyGross <= (policy?.esi?.wageThreshold ?? 21000);
  const employerESI = esiEnabled ? round2(((policy?.esi?.employerPercent ?? 3.25) / 100) * monthlyGross) : 0;

  return {
    monthlyGross,
    basic,
    hra,
    allowances,
    employerPF,
    employerESI,
  };
}

/**
 * Computes a full month's payroll for one employee from their cached
 * SalaryStructure.breakup, the org's PayrollPolicy (for deduction rates),
 * and either their AttendanceSummary for that month OR a manually typed-in
 * "Paid Days" count (`manualAttendance`) for orgs that don't want to rely on
 * the automatic attendance system for payroll. `extras` carries one-off
 * manual inputs entered at generation time (bonus, loan EMI, etc).
 *
 * manualAttendance (optional): { paidDays, workingDays?, calendarDays? }
 *   When paidDays is a finite number, it wins over attendanceSummary
 *   entirely — the admin is telling the system exactly how many days this
 *   person is being paid for.
 */
function calculatePayrollForMonth({ structure, policy, attendanceSummary, month, year, extras = {}, manualAttendance = null }) {
  const { monthlyGross, basic, hra, allowances } = structure.breakup;

  const calendarDaysInMonth = daysInMonth(month, year);
  // Fixed denominator for per-day rate, matching standard payroll practice
  // (e.g. a flat 30 "No. of Working Days" every month, set once on the
  // org's Pay Schedule, rather than the actual day count of that month).
  const scheduleWorkingDays = policy?.paySchedule?.noOfWorkingDays || calendarDaysInMonth;

  const manualEntry = manualAttendance && Number.isFinite(Number(manualAttendance.paidDays));

  let calendarDays, workingDays, paidDays, lopDays, halfDays, absentDays;

  if (manualEntry) {
    calendarDays = Number.isFinite(Number(manualAttendance.calendarDays))
      ? Number(manualAttendance.calendarDays)
      : calendarDaysInMonth;
    workingDays = Number.isFinite(Number(manualAttendance.workingDays))
      ? Number(manualAttendance.workingDays)
      : scheduleWorkingDays;
    paidDays = Math.max(0, Number(manualAttendance.paidDays));
    lopDays = Math.max(0, round2(workingDays - paidDays));
    halfDays = 0;
    absentDays = lopDays;
  } else {
    calendarDays = calendarDaysInMonth;
    workingDays = scheduleWorkingDays;
    const presentDays = attendanceSummary?.presentDays ?? workingDays; // no attendance record yet -> assume fully present
    halfDays = attendanceSummary?.halfDays ?? 0;
    absentDays = attendanceSummary?.absentDays ?? 0;
    // A half day counts as 0.5 day unpaid, same as half a day's absence.
    const unpaidDays = absentDays + halfDays * 0.5;
    paidDays = Math.max(0, workingDays - unpaidDays);
    lopDays = round2(unpaidDays);
  }

  // Pro-rate Basic/HRA/allowances down to what's actually earned for the
  // paid days this month (LOP shows up here, in reduced Gross Earnings, the
  // way a real payslip reads — not as a separate deduction line item).
  const proration = workingDays > 0 ? Math.min(1, paidDays / workingDays) : 1;
  const earnedBasic = round2(basic * proration);
  const earnedHra = round2(hra * proration);
  const earnedAllowances = (allowances || []).map((a) => ({ name: a.name, amount: round2(a.amount * proration) }));
  const earnedGross = round2(earnedBasic + earnedHra + earnedAllowances.reduce((s, a) => s + a.amount, 0));
  const lossOfPay = round2(monthlyGross - earnedGross);

  // ---- Deductions (statutory deductions run on the EARNED basic, i.e.
  // already reflect LOP for that month — standard practice) ----
  const pfEnabled = policy?.pf?.enabled !== false;
  const pfWage =
    pfEnabled && policy?.pf?.applyWageCeiling && policy?.pf?.wageCeiling
      ? Math.min(earnedBasic, policy.pf.wageCeiling)
      : earnedBasic;
  const employeePF = pfEnabled ? round2(((policy?.pf?.employeePercent ?? 12) / 100) * pfWage) : 0;
  const employerPF = pfEnabled ? round2(((policy?.pf?.employerPercent ?? 12) / 100) * pfWage) : 0;

  const esiEligible = monthlyGross <= (policy?.esi?.wageThreshold ?? 21000);
  const esiEnabled = policy?.esi?.enabled === true && esiEligible;
  const employeeESI = esiEnabled ? round2(((policy?.esi?.employeePercent ?? 0.75) / 100) * earnedGross) : 0;
  const employerESI = esiEnabled ? round2(((policy?.esi?.employerPercent ?? 3.25) / 100) * earnedGross) : 0;

  const professionalTax = policy?.professionalTax?.enabled !== false ? policy?.professionalTax?.monthlyAmount ?? 0 : 0;

  const tdsEnabled = policy?.tds?.enabled === true;
  const tds = tdsEnabled ? round2((structure.annualTaxEstimate || 0) / 12) : 0;

  const bonus = round2(extras.bonus || 0);
  const incentive = round2(extras.incentive || 0);
  const overtime = round2(extras.overtime || 0);
  const reimbursement = round2(extras.reimbursement || 0);
  const otherEarnings = round2(extras.otherEarnings || 0);
  const loan = round2(extras.loan || 0);
  const advance = round2(extras.advance || 0);
  const otherDeductions = round2(extras.otherDeductions || 0);

  const totalEarnings = round2(earnedGross + bonus + incentive + overtime + reimbursement + otherEarnings);
  const totalDeductions = round2(
    employeePF + employeeESI + professionalTax + tds + loan + advance + otherDeductions
  );
  const netSalary = round2(totalEarnings - totalDeductions);

  // Standard gratuity estimate (informational, employer cost only — not
  // deducted from the employee): 15 days' basic per year of service,
  // approximated monthly as 4.81% of Basic.
  const gratuity = round2(earnedBasic * 0.0481);

  return {
    breakup: { monthlyGross, basic: earnedBasic, hra: earnedHra, allowances: earnedAllowances },
    attendance: {
      daysInMonth: calendarDays,
      presentDays: paidDays,
      halfDays,
      absentDays,
      paidDays,
      calendarDays,
      workingDays,
      lopDays,
      manualEntry: !!manualEntry,
    },
    earnings: { gross: earnedGross, bonus, incentive, overtime, reimbursement, other: otherEarnings, totalEarnings },
    deductions: {
      pf: employeePF,
      esi: employeeESI,
      professionalTax,
      tds,
      lossOfPay,
      loan,
      advance,
      other: otherDeductions,
      totalDeductions,
    },
    employerContribution: { pf: employerPF, esi: employerESI, gratuity },
    netSalary,
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = { calculateSalaryBreakup, calculatePayrollForMonth, daysInMonth, round2 };