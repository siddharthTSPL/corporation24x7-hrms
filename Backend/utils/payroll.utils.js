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
 * and their AttendanceSummary for that month. `extras` carries one-off
 * manual inputs entered at generation time (bonus, loan EMI, etc).
 */
function calculatePayrollForMonth({ structure, policy, attendanceSummary, month, year, extras = {} }) {
  const { monthlyGross, basic, hra, allowances } = structure.breakup;

  const totalDays = daysInMonth(month, year);
  const presentDays = attendanceSummary?.presentDays ?? totalDays; // no attendance record yet -> assume fully present
  const halfDays = attendanceSummary?.halfDays ?? 0;
  const absentDays = attendanceSummary?.absentDays ?? 0;
  const paidDays = Math.max(0, totalDays - absentDays);

  const perDayRate = totalDays > 0 ? monthlyGross / totalDays : 0;
  const lossOfPay = round2(perDayRate * absentDays);

  // ---- Deductions ----
  const pfEnabled = policy?.pf?.enabled !== false;
  const pfWage =
    pfEnabled && policy?.pf?.applyWageCeiling && policy?.pf?.wageCeiling
      ? Math.min(basic, policy.pf.wageCeiling)
      : basic;
  const employeePF = pfEnabled ? round2(((policy?.pf?.employeePercent ?? 12) / 100) * pfWage) : 0;
  const employerPF = pfEnabled ? round2(((policy?.pf?.employerPercent ?? 12) / 100) * pfWage) : 0;

  const esiEligible = monthlyGross <= (policy?.esi?.wageThreshold ?? 21000);
  const esiEnabled = policy?.esi?.enabled === true && esiEligible;
  const employeeESI = esiEnabled ? round2(((policy?.esi?.employeePercent ?? 0.75) / 100) * monthlyGross) : 0;
  const employerESI = esiEnabled ? round2(((policy?.esi?.employerPercent ?? 3.25) / 100) * monthlyGross) : 0;

  const professionalTax = policy?.professionalTax?.enabled !== false ? policy?.professionalTax?.monthlyAmount ?? 0 : 0;

  const tdsEnabled = policy?.tds?.enabled === true;
  const tds = tdsEnabled ? round2((structure.annualTaxEstimate || 0) / 12) : 0;

  const bonus = round2(extras.bonus || 0);
  const incentive = round2(extras.incentive || 0);
  const overtime = round2(extras.overtime || 0);
  const otherEarnings = round2(extras.otherEarnings || 0);
  const loan = round2(extras.loan || 0);
  const advance = round2(extras.advance || 0);
  const otherDeductions = round2(extras.otherDeductions || 0);

  const totalEarnings = round2(monthlyGross + bonus + incentive + overtime + otherEarnings);
  const totalDeductions = round2(
    employeePF + employeeESI + professionalTax + tds + lossOfPay + loan + advance + otherDeductions
  );
  const netSalary = round2(totalEarnings - totalDeductions);

  return {
    breakup: { monthlyGross, basic, hra, allowances },
    attendance: { daysInMonth: totalDays, presentDays, halfDays, absentDays, paidDays },
    earnings: { gross: monthlyGross, bonus, incentive, overtime, other: otherEarnings, totalEarnings },
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
    employerContribution: { pf: employerPF, esi: employerESI },
    netSalary,
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = { calculateSalaryBreakup, calculatePayrollForMonth, daysInMonth, round2 };
