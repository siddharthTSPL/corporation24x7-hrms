const PayrollPolicy = require("../Models/payrollpolicy.model");

// Same shape as the schema defaults — used by resetToStandard() and by
// getPolicy() the very first time an org asks (so the frontend always has
// something sane to render, even before the org saves anything).

const STANDARD_DEFAULTS = {
  basic: { percentOfGross: 40 },
  hra: { enabled: true, percentOfBasic: 50 },
  allowances: [
    { name: "Medical Allowance", percentOfBasic: 0, flatAmount: 1250, enabled: true, isBalancing: false },
    { name: "Conveyance Allowance", percentOfBasic: 0, flatAmount: 1600, enabled: true, isBalancing: false },
    { name: "Special Allowance", percentOfBasic: 0, flatAmount: 0, enabled: true, isBalancing: true },
  ],
  pf: { enabled: true, employeePercent: 12, employerPercent: 12, applyWageCeiling: false, wageCeiling: 15000 },
  esi: { enabled: false, employeePercent: 0.75, employerPercent: 3.25, wageThreshold: 21000 },
  professionalTax: { enabled: true, monthlyAmount: 200 },
  tds: { enabled: false },
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
  const { basic, hra, pf, esi, professionalTax, tds } = req.body;

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

  policy.updatedBy = req.admin._id;
  policy.updatedByModel = req.actorModel || "Admin";
  await policy.save();

  res.status(200).json({ success: true, policy });
};

// ---------- Allowances (Medical, Conveyance, Special, or any custom one) ----------

const addAllowance = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { name, percentOfBasic, flatAmount, enabled } = req.body;

  if (!name) return res.status(400).json({ success: false, message: "name is required" });

  const policy = await getOrCreatePolicy(organisation_id);
  policy.allowances.push({
    name,
    percentOfBasic: percentOfBasic || 0,
    flatAmount: flatAmount || 0,
    enabled: enabled !== false,
    isBalancing: false, // custom allowances are never the balancing one
  });
  policy.updatedBy = req.admin._id;
  policy.updatedByModel = req.actorModel || "Admin";
  await policy.save();

  res.status(200).json({ success: true, policy });
};

const updateAllowance = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { name } = req.params;
  const { percentOfBasic, flatAmount, enabled, newName } = req.body;

  const policy = await getOrCreatePolicy(organisation_id);
  const allowance = policy.allowances.find((a) => a.name === name);
  if (!allowance) return res.status(404).json({ success: false, message: "Allowance not found" });

  if (typeof percentOfBasic === "number") allowance.percentOfBasic = percentOfBasic;
  if (typeof flatAmount === "number") allowance.flatAmount = flatAmount;
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