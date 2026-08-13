const PayrollPolicy = require("../Models/payrollpolicy.model");
const { evaluateFormula } = require("../utils/payroll.utils");

// Same shape as the schema defaults — used by resetToStandard() and by
// getPolicy() the very first time an org asks (so the frontend always has
// something sane to render, even before the org saves anything).

const STANDARD_DEFAULTS = {
  basic: { percentOfGross: 40 },
  hra: { enabled: true, percentOfBasic: 50 },
  allowances: [
    { name: "Medical Allowance", percentOfBasic: 0, flatAmount: 1250, enabled: true, isBalancing: false },
    { name: "Conveyance Allowance", percentOfBasic: 0, flatAmount: 1600, enabled: true, isBalancing: false },
    // Normal, fully editable earning — flat / % of Basic / % of Gross /
    // % of CTC / custom formula. Not a balancing component, so whatever
    // calculationType is picked for it is actually used every payroll run.
    { name: "Fixed Allowance", percentOfBasic: 0, flatAmount: 0, enabled: true, isBalancing: false },
  ],
  pf: { enabled: true, employeePercent: 12, employerPercent: 12, applyWageCeiling: false, wageCeiling: 15000 },
  esi: { enabled: false, employeePercent: 0.75, employerPercent: 3.25, wageThreshold: 21000 },
  professionalTax: { enabled: true, monthlyAmount: 200 },
  tds: { enabled: false },
  lwf: { enabled: false, employeeAmount: 0, employerAmount: 0 },
  statutoryBonus: { enabled: false, percentOfBasic: 8.33 },
};

// Every payroll calculation needs a policy to read from — this creates one
// with standard defaults the first time it's touched, so callers never have
// to null-check "policy doesn't exist yet".
const getOrCreatePolicy = async (organisation_id) => {
  let policy = await PayrollPolicy.findOne({ organisation_id });
  if (!policy) {
    policy = await PayrollPolicy.create({ organisation_id, ...STANDARD_DEFAULTS });
  }
  return policy;
};

const getPolicy = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const policy = await getOrCreatePolicy(organisation_id);
  res.status(200).json({ success: true, policy });
};

// Generic partial update — accepts any subset of { basic, hra, pf, esi,
// professionalTax, tds }. Each block is merged in (not replaced wholesale)
// so the frontend can send just the one toggle/percentage that changed.
const setPolicy = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { basic, hra, pf, esi, professionalTax, tds, lwf, statutoryBonus } = req.body;

  const policy = await getOrCreatePolicy(organisation_id);

  if (basic && typeof basic.percentOfGross === "number") {
    if (basic.percentOfGross < 1 || basic.percentOfGross > 100)
      return res.status(400).json({ success: false, message: "basic.percentOfGross must be between 1 and 100" });
    policy.basic.percentOfGross = basic.percentOfGross;
  }

  if (hra) {
    if (typeof hra.enabled === "boolean") policy.hra.enabled = hra.enabled;
    if (typeof hra.percentOfBasic === "number") policy.hra.percentOfBasic = hra.percentOfBasic;
  }

  if (pf) {
    if (typeof pf.enabled === "boolean") policy.pf.enabled = pf.enabled;
    if (typeof pf.employeePercent === "number") policy.pf.employeePercent = pf.employeePercent;
    if (typeof pf.employerPercent === "number") policy.pf.employerPercent = pf.employerPercent;
    if (typeof pf.applyWageCeiling === "boolean") policy.pf.applyWageCeiling = pf.applyWageCeiling;
    if (typeof pf.wageCeiling === "number") policy.pf.wageCeiling = pf.wageCeiling;
  }

  if (esi) {
    if (typeof esi.enabled === "boolean") policy.esi.enabled = esi.enabled;
    if (typeof esi.employeePercent === "number") policy.esi.employeePercent = esi.employeePercent;
    if (typeof esi.employerPercent === "number") policy.esi.employerPercent = esi.employerPercent;
    if (typeof esi.wageThreshold === "number") policy.esi.wageThreshold = esi.wageThreshold;
  }

  if (professionalTax) {
    if (typeof professionalTax.enabled === "boolean") policy.professionalTax.enabled = professionalTax.enabled;
    if (typeof professionalTax.monthlyAmount === "number")
      policy.professionalTax.monthlyAmount = professionalTax.monthlyAmount;
  }

  if (tds && typeof tds.enabled === "boolean") policy.tds.enabled = tds.enabled;

  if (lwf) {
    if (typeof lwf.enabled === "boolean") policy.lwf.enabled = lwf.enabled;
    if (typeof lwf.employeeAmount === "number") policy.lwf.employeeAmount = lwf.employeeAmount;
    if (typeof lwf.employerAmount === "number") policy.lwf.employerAmount = lwf.employerAmount;
  }

  if (statutoryBonus) {
    if (typeof statutoryBonus.enabled === "boolean") policy.statutoryBonus.enabled = statutoryBonus.enabled;
    if (typeof statutoryBonus.percentOfBasic === "number") policy.statutoryBonus.percentOfBasic = statutoryBonus.percentOfBasic;
  }

  policy.updatedBy = req.admin._id;
  policy.updatedByModel = req.actorModel || "Admin";
  await policy.save();

  res.status(200).json({ success: true, policy });
};

// ---------- Salary Components ----------
// One list (`policy.allowances`, kept as-is for backward compatibility)
// covers all four Zoho-style tabs: Earnings, Deductions, Benefits and
// Reimbursements — `category` decides which tab a component shows up in.
// Every component can be a flat amount, a % of Basic, a % of CTC, or a
// custom formula (see evaluateFormula in payroll.utils.js).

const ALLOWED_CATEGORIES = ["earning", "deduction", "benefit", "reimbursement"];
const ALLOWED_CALC_TYPES = ["flat", "percentOfBasic", "percentOfCTC", "percentOfGross", "formula"];

const addAllowance = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const {
    name,
    category,
    calculationType,
    percentOfBasic,
    percentOfCTC,
    percentOfGross,
    flatAmount,
    formula,
    enabled,
    considerForEPF,
    considerForESI,
    isFBP,
  } = req.body;

  if (!name) return res.status(400).json({ success: false, message: "name is required" });

  if (category && !ALLOWED_CATEGORIES.includes(category))
    return res.status(400).json({ success: false, message: `category must be one of ${ALLOWED_CATEGORIES.join(", ")}` });

  if (calculationType && !ALLOWED_CALC_TYPES.includes(calculationType))
    return res.status(400).json({ success: false, message: `calculationType must be one of ${ALLOWED_CALC_TYPES.join(", ")}` });

  if (calculationType === "formula") {
    if (!formula || !formula.trim())
      return res.status(400).json({ success: false, message: "formula is required when calculationType is formula" });
    try {
      evaluateFormula(formula, { basic: 1000, gross: 2500, ctc: 300000, hra: 500 });
    } catch (e) {
      return res.status(400).json({ success: false, message: `Invalid formula: ${e.message}` });
    }
  }

  const policy = await getOrCreatePolicy(organisation_id);
  policy.allowances.push({
    name,
    category: category || "earning",
    calculationType: calculationType || "flat",
    percentOfBasic: percentOfBasic || 0,
    percentOfCTC: percentOfCTC || 0,
    percentOfGross: percentOfGross || 0,
    flatAmount: flatAmount || 0,
    formula: formula || "",
    enabled: enabled !== false,
    considerForEPF: considerForEPF !== false,
    considerForESI: considerForESI !== false,
    isFBP: !!isFBP,
    isBalancing: false, // custom components are never the balancing one
  });
  policy.updatedBy = req.admin._id;
  policy.updatedByModel = req.actorModel || "Admin";
  await policy.save();

  res.status(200).json({ success: true, policy });
};

const updateAllowance = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { name } = req.params;
  const {
    percentOfBasic,
    percentOfCTC,
    percentOfGross,
    flatAmount,
    calculationType,
    formula,
    enabled,
    newName,
    considerForEPF,
    considerForESI,
    isFBP,
    isBalancing,
  } = req.body;

  const policy = await getOrCreatePolicy(organisation_id);
  const allowance = policy.allowances.find((a) => a.name === name);
  if (!allowance) return res.status(404).json({ success: false, message: "Allowance not found" });

  // Let an existing org convert its old locked/auto-balancing component
  // (e.g. a legacy "Special Allowance") into a normal, fully-calculating
  // one — this must run BEFORE the calculationType check below so the same
  // request can un-flag it and switch it to a formula/% type in one save.
  if (typeof isBalancing === "boolean") allowance.isBalancing = isBalancing;

  // The balancing earning always absorbs leftover gross — its amount is
  // never computed from calculationType/formula (see calculateSalaryBreakup).
  // Silently accepting a formula here would look saved but never actually
  // run, which is confusing — reject it up front instead.
  if (allowance.isBalancing && calculationType && calculationType !== "flat") {
    return res.status(400).json({
      success: false,
      message:
        "This is still the balancing allowance — it always auto-fills the remaining gross and can't use % / formula. Turn off isBalancing first, or add a separate Fixed Allowance component.",
    });
  }

  if (calculationType) {
    if (!ALLOWED_CALC_TYPES.includes(calculationType))
      return res.status(400).json({ success: false, message: `calculationType must be one of ${ALLOWED_CALC_TYPES.join(", ")}` });
    if (calculationType === "formula") {
      const f = formula !== undefined ? formula : allowance.formula;
      if (!f || !f.trim())
        return res.status(400).json({ success: false, message: "formula is required when calculationType is formula" });
      try {
        evaluateFormula(f, { basic: 1000, gross: 2500, ctc: 300000, hra: 500 });
      } catch (e) {
        return res.status(400).json({ success: false, message: `Invalid formula: ${e.message}` });
      }
    }
    allowance.calculationType = calculationType;
  }

  if (typeof percentOfBasic === "number") allowance.percentOfBasic = percentOfBasic;
  if (typeof percentOfCTC === "number") allowance.percentOfCTC = percentOfCTC;
  if (typeof percentOfGross === "number") allowance.percentOfGross = percentOfGross;
  if (typeof flatAmount === "number") allowance.flatAmount = flatAmount;
  if (typeof formula === "string") allowance.formula = formula;
  if (typeof considerForEPF === "boolean") allowance.considerForEPF = considerForEPF;
  if (typeof considerForESI === "boolean") allowance.considerForESI = considerForESI;
  if (typeof isFBP === "boolean") allowance.isFBP = isFBP;
  if (typeof enabled === "boolean") {
    if (allowance.isBalancing && enabled === false)
      return res.status(400).json({ success: false, message: "The balancing allowance can't be disabled" });
    allowance.enabled = enabled;
  }
  if (newName) allowance.name = newName;

  policy.updatedBy = req.admin._id;
  policy.updatedByModel = req.actorModel || "Admin";
  await policy.save();

  res.status(200).json({ success: true, policy });
};

const removeAllowance = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { name } = req.params;

  const policy = await getOrCreatePolicy(organisation_id);
  const allowance = policy.allowances.find((a) => a.name === name);
  if (allowance?.isBalancing)
    return res.status(400).json({ success: false, message: "The balancing allowance can't be removed" });

  policy.allowances = policy.allowances.filter((a) => a.name !== name);
  policy.updatedBy = req.admin._id;
  policy.updatedByModel = req.actorModel || "Admin";
  await policy.save();

  res.status(200).json({ success: true, policy });
};

// ---------- Pay Schedule (fixed org-wide run schedule) ----------

const STANDARD_PAY_SCHEDULE = {
  payFrequency: "Monthly",
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  payDay: 1,
  firstPayPeriodMonth: null,
  firstPayPeriodYear: null,
  firstPayDate: null,
  noOfWorkingDays: 30,
  locked: false,
};

const getPaySchedule = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const policy = await getOrCreatePolicy(organisation_id);
  const paySchedule = policy.paySchedule?.toObject ? policy.paySchedule.toObject() : policy.paySchedule || STANDARD_PAY_SCHEDULE;
  res.status(200).json({ success: true, paySchedule });
};

// Once locked (first payroll run processed against it), the schedule can
// only be viewed, not edited — matches "Pay Schedule cannot be edited once
// you process the first pay run."
const setPaySchedule = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { workingDays, payDay, firstPayPeriodMonth, firstPayPeriodYear, firstPayDate, noOfWorkingDays } = req.body;

  const policy = await getOrCreatePolicy(organisation_id);

  if (policy.paySchedule?.locked) {
    return res.status(409).json({
      success: false,
      message: "Pay Schedule cannot be edited once you process the first pay run.",
    });
  }

  if (Array.isArray(workingDays)) policy.paySchedule.workingDays = workingDays;
  if (typeof payDay === "number") {
    if (payDay < 1 || payDay > 31) return res.status(400).json({ success: false, message: "payDay must be between 1 and 31" });
    policy.paySchedule.payDay = payDay;
  }
  if (typeof firstPayPeriodMonth === "number") policy.paySchedule.firstPayPeriodMonth = firstPayPeriodMonth;
  if (typeof firstPayPeriodYear === "number") policy.paySchedule.firstPayPeriodYear = firstPayPeriodYear;
  if (firstPayDate) policy.paySchedule.firstPayDate = new Date(firstPayDate);
  if (typeof noOfWorkingDays === "number") {
    if (noOfWorkingDays < 1 || noOfWorkingDays > 31)
      return res.status(400).json({ success: false, message: "noOfWorkingDays must be between 1 and 31" });
    policy.paySchedule.noOfWorkingDays = noOfWorkingDays;
  }

  policy.updatedBy = req.admin._id;
  policy.updatedByModel = req.actorModel || "Admin";
  await policy.save();

  res.status(200).json({ success: true, paySchedule: policy.paySchedule });
};

// ---------- Reset ----------

const resetToStandard = async (req, res) => {
  const organisation_id = req.admin.organisation_id;

  const policy = await PayrollPolicy.findOneAndUpdate(
    { organisation_id },
    {
      $set: {
        ...STANDARD_DEFAULTS,
        updatedBy: req.admin._id,
        updatedByModel: req.actorModel || "Admin",
      },
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, policy });
};

module.exports = {
  getOrCreatePolicy,
  getPolicy,
  setPolicy,
  addAllowance,
  updateAllowance,
  removeAllowance,
  resetToStandard,
  getPaySchedule,
  setPaySchedule,
};