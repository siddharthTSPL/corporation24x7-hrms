/**
 * Pure calculation helpers for payroll. No DB calls here on purpose —
 * controllers fetch PayrollPolicy / SalaryStructure / AttendanceSummary
 * and pass plain data in, so this logic stays easy to unit-test and reuse
 * (e.g. for a "preview breakup before saving" endpoint later).
 */

const daysInMonth = (month, year) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Safely evaluates a custom Salary Component formula like "basic*0.1 + 500"
 * or "gross - hra". Only these variable names are allowed: basic, gross,
 * ctc, hra. Every identifier in the formula is substituted with a plain
 * number FIRST; if anything other than digits/operators/parentheses is
 * left after substitution, it's rejected — so this never runs arbitrary
 * admin-typed code, only arithmetic.
 */
function evaluateFormula(formula, vars = {}) {
  if (!formula || typeof formula !== "string") return 0;
  const trimmed = formula.trim();
  if (!trimmed) return 0;

  const substituted = trimmed.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (token) => {
    if (Object.prototype.hasOwnProperty.call(vars, token)) {
      const v = Number(vars[token]);
      return String(Number.isFinite(v) ? v : 0);
    }
    throw new Error(`Unknown variable "${token}" in formula (allowed: ${Object.keys(vars).join(", ")})`);
  });

  if (!/^[0-9+\-*/().\s]+$/.test(substituted)) {
    throw new Error("Formula can only contain numbers, + - * / ( ) and the allowed variable names");
  }

  // Safe by construction at this point: substituted is guaranteed to be
  // only digits/whitespace/+-*/(). — no letters, no other tokens survive.
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${substituted});`)();
  return Number.isFinite(result) ? round2(result) : 0;
}

/**
 * Computes one Salary Component's monthly amount given its calculationType.
 * `ctx` = { basic, gross (monthly), ctc (annual), hra }.
 * Falls back to the pre-existing "flatAmount if >0 else percentOfBasic"
 * behaviour when calculationType isn't set, so old policy documents that
 * predate this field keep computing exactly as before.
 */
function computeComponentAmount(comp, ctx) {
  const type = comp?.calculationType || (Number(comp?.flatAmount) > 0 ? "flat" : "percentOfBasic");
  switch (type) {
    case "formula":
      try {
        return Math.max(0, evaluateFormula(comp.formula, ctx));
      } catch (e) {
        // Invalid/unsaveable formula shouldn't crash payroll generation —
        // treat as 0 and let the admin see it's wrong from the Salary
        // Components screen (which validates on save).
        return 0;
      }
    case "percentOfCTC":
      return round2(((comp?.percentOfCTC || 0) / 100) * (ctx.ctc / 12));
    case "percentOfBasic":
      return round2(((comp?.percentOfBasic || 0) / 100) * ctx.basic);
    case "flat":
    default:
      return round2(comp?.flatAmount || 0);
  }
}


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

  const componentCtx = { basic, gross: monthlyGross, ctc, hra: hraEnabled ? hra : 0 };

  const allowanceDefs = Array.isArray(policy?.allowances) ? policy.allowances : [];
  // Old records have no `category` at all — treat those as earnings too,
  // same as before this field existed.
  const isEarning = (a) => !a.category || a.category === "earning";
  const namedAllowances = allowanceDefs.filter((a) => a.enabled !== false && isEarning(a) && !a.isBalancing);
  const balancingDef = allowanceDefs.find((a) => a.enabled !== false && isEarning(a) && a.isBalancing);

  const allowances = namedAllowances.map((a) => ({ name: a.name, amount: computeComponentAmount(a, componentCtx) }));

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

  // Custom Deduction / Benefit / Reimbursement components (Zoho-style
  // Salary Components tabs). These aren't part of the Basic/HRA/allowance
  // reconciliation above — each is just its own computed line item.
  const componentsByCategory = (category) =>
    allowanceDefs
      .filter((a) => a.enabled !== false && a.category === category)
      .map((a) => ({ name: a.name, amount: computeComponentAmount(a, componentCtx), isFBP: !!a.isFBP }));

  const deductionComponents = componentsByCategory("deduction");
  const benefitComponents = componentsByCategory("benefit");
  const reimbursementComponents = componentsByCategory("reimbursement");

  return {
    monthlyGross,
    basic,
    hra,
    allowances,
    deductionComponents,
    benefitComponents,
    reimbursementComponents,
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
  const { monthlyGross, basic, hra, allowances, deductionComponents = [], benefitComponents = [], reimbursementComponents = [] } = structure.breakup;

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

  const lwfEnabled = policy?.lwf?.enabled === true;
  const lwf = lwfEnabled ? round2(policy?.lwf?.employeeAmount || 0) : 0;
  const employerLwf = lwfEnabled ? round2(policy?.lwf?.employerAmount || 0) : 0;

  const statutoryBonusEnabled = policy?.statutoryBonus?.enabled === true;
  const statutoryBonus = statutoryBonusEnabled
    ? round2(((policy?.statutoryBonus?.percentOfBasic ?? 8.33) / 100) * earnedBasic)
    : 0;

  // Custom Deduction / Benefit / Reimbursement Salary Components — flat
  // per-month amounts, not prorated by attendance (same treatment as the
  // manual bonus/loan/advance extras below).
  const deductionComponentsTotal = round2(deductionComponents.reduce((s, c) => s + (c.amount || 0), 0));
  const benefitComponentsTotal = round2(benefitComponents.reduce((s, c) => s + (c.amount || 0), 0));
  const reimbursementComponentsTotal = round2(reimbursementComponents.reduce((s, c) => s + (c.amount || 0), 0));

  const bonus = round2(extras.bonus || 0);
  const incentive = round2(extras.incentive || 0);
  const overtime = round2(extras.overtime || 0);
  const reimbursement = round2(extras.reimbursement || 0);
  const otherEarnings = round2(extras.otherEarnings || 0);
  const loan = round2(extras.loan || 0);
  const advance = round2(extras.advance || 0);
  const otherDeductions = round2(extras.otherDeductions || 0);

  const totalEarnings = round2(
    earnedGross + bonus + incentive + overtime + reimbursement + otherEarnings + benefitComponentsTotal + reimbursementComponentsTotal
  );
  const totalDeductions = round2(
    employeePF + employeeESI + professionalTax + tds + lwf + loan + advance + otherDeductions + deductionComponentsTotal
  );
  const netSalary = round2(totalEarnings - totalDeductions);

  // Standard gratuity estimate (informational, employer cost only — not
  // deducted from the employee): 15 days' basic per year of service,
  // approximated monthly as 4.81% of Basic.
  const gratuity = round2(earnedBasic * 0.0481);

  return {
    breakup: {
      monthlyGross,
      basic: earnedBasic,
      hra: earnedHra,
      allowances: earnedAllowances,
      deductionComponents,
      benefitComponents,
      reimbursementComponents,
    },
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
    earnings: {
      gross: earnedGross,
      bonus,
      incentive,
      overtime,
      reimbursement,
      other: otherEarnings,
      benefits: benefitComponentsTotal,
      reimbursementComponents: reimbursementComponentsTotal,
      totalEarnings,
    },
    deductions: {
      pf: employeePF,
      esi: employeeESI,
      professionalTax,
      tds,
      lwf,
      lossOfPay,
      loan,
      advance,
      other: otherDeductions,
      components: deductionComponentsTotal,
      totalDeductions,
    },
    employerContribution: { pf: employerPF, esi: employerESI, gratuity, lwf: employerLwf, statutoryBonus },
    netSalary,
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = { calculateSalaryBreakup, calculatePayrollForMonth, daysInMonth, round2, evaluateFormula, computeComponentAmount };