const SalaryStructure = require("../Models/salarystructure.model");
const Payroll = require("../Models/payroll.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const { getOrCreatePolicy } = require("./payrollpolicy.controller");
const { calculateSalaryBreakup, calculatePayrollForMonth } = require("../utils/payroll.utils");

// ---------- Salary structure (one-time CTC set, auto-computed breakup) ----------

// This is the "one click" step: give it employee + annual CTC, it pulls the
// org's current PayrollPolicy and computes the full monthly breakup
// (Basic/HRA/allowances/PF/ESI) automatically, then saves it. Calling this
// again for the same employee (e.g. after an appraisal) revises the CTC and
// recomputes, keeping a history entry of the old value.
const setEmployeeCTC = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee, employeeModel, ctc, annualTaxEstimate, effectiveFrom } = req.body;

  if (!employee || !employeeModel || !ctc)
    return res.status(400).json({ success: false, message: "employee, employeeModel and ctc are required" });

  if (!["User", "Manager", "Admin"].includes(employeeModel))
    return res.status(400).json({ success: false, message: "Invalid employeeModel" });

  if (ctc <= 0) return res.status(400).json({ success: false, message: "ctc must be greater than 0" });

  const policy = await getOrCreatePolicy(organisation_id);
  const breakup = calculateSalaryBreakup(ctc, policy);

  const existing = await SalaryStructure.findOne({ employee });

  const policySnapshot = {
    basic: policy.basic,
    hra: policy.hra,
    allowances: policy.allowances,
    pf: policy.pf,
    esi: policy.esi,
    professionalTax: policy.professionalTax,
    tds: policy.tds,
  };

  if (existing) {
    if (existing.ctc !== ctc) {
      existing.revisionHistory.push({
        ctc: existing.ctc,
        effectiveFrom: existing.effectiveFrom,
        changedBy: req.admin._id,
        changedByModel: req.actorModel || "Admin",
      });
    }
    existing.ctc = ctc;
    existing.annualTaxEstimate = annualTaxEstimate ?? existing.annualTaxEstimate;
    existing.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();
    existing.breakup = breakup;
    existing.policySnapshot = policySnapshot;
    existing.setBy = req.admin._id;
    existing.setByModel = req.actorModel || "Admin";
    await existing.save();
    return res.status(200).json({ success: true, structure: existing, message: "CTC revised and breakup recalculated" });
  }

  const structure = await SalaryStructure.create({
    organisation_id,
    employee,
    employeeModel,
    ctc,
    annualTaxEstimate: annualTaxEstimate || 0,
    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
    breakup,
    policySnapshot,
    setBy: req.admin._id,
    setByModel: req.actorModel || "Admin",
  });

  res.status(201).json({ success: true, structure, message: "Salary structure created" });
};

// Recompute an existing employee's breakup against the CURRENT policy without
// changing their CTC — useful right after editing policy percentages, for an
// admin who wants "apply new policy to this person" without a CTC revision.
const reapplyPolicy = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee } = req.params;

  const structure = await SalaryStructure.findOne({ employee, organisation_id });
  if (!structure) return res.status(404).json({ success: false, message: "Salary structure not found" });

  const policy = await getOrCreatePolicy(organisation_id);
  structure.breakup = calculateSalaryBreakup(structure.ctc, policy);
  structure.policySnapshot = {
    basic: policy.basic,
    hra: policy.hra,
    allowances: policy.allowances,
    pf: policy.pf,
    esi: policy.esi,
    professionalTax: policy.professionalTax,
    tds: policy.tds,
  };
  await structure.save();

  res.status(200).json({ success: true, structure });
};

const getSalaryStructure = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee } = req.params;

  const structure = await SalaryStructure.findOne({ employee, organisation_id }).lean();
  if (!structure) return res.status(404).json({ success: false, message: "Salary structure not found" });

  res.status(200).json({ success: true, structure });
};

const listSalaryStructures = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employeeModel } = req.query;

  const filter = { organisation_id, isActive: true };
  if (employeeModel) filter.employeeModel = employeeModel;

  const structures = await SalaryStructure.find(filter).lean();
  res.status(200).json({ success: true, count: structures.length, structures });
};

// ---------- Payroll generation ----------

// Pulls SalaryStructure (must already exist — set CTC first), the org's
// PayrollPolicy, and this employee's AttendanceSummary for the month, runs
// the math, and upserts the Payroll document. `extras` (bonus/loan/etc) are
// optional one-off inputs for this specific month only.
const generatePayroll = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const {
    employee,
    employeeModel,
    month,
    year,
    bonus,
    incentive,
    overtime,
    otherEarnings,
    loan,
    advance,
    otherDeductions,
    remarks,
    force,
  } = req.body;

  if (!employee || !employeeModel || !month || !year)
    return res.status(400).json({ success: false, message: "employee, employeeModel, month and year are required" });

  const existingPayroll = await Payroll.findOne({ employee, month: Number(month), year: Number(year) });
  if (existingPayroll && ["approved", "paid"].includes(existingPayroll.status) && !force) {
    return res.status(409).json({
      success: false,
      message: `Payroll for this month is already ${existingPayroll.status}. Pass force: true to regenerate and overwrite it.`,
      currentStatus: existingPayroll.status,
    });
  }

  const structure = await SalaryStructure.findOne({ employee, organisation_id });
  if (!structure)
    return res.status(400).json({ success: false, message: "Set this employee's CTC first (no salary structure found)" });

  const policy = await getOrCreatePolicy(organisation_id);

  const role = employeeModel === "User" ? "employee" : employeeModel.toLowerCase();
  const attendanceSummary = await AttendanceSummary.findOne({ employee, role, month: Number(month), year: Number(year) }).lean();

  const result = calculatePayrollForMonth({
    structure,
    policy,
    attendanceSummary,
    month: Number(month),
    year: Number(year),
    extras: { bonus, incentive, overtime, otherEarnings, loan, advance, otherDeductions },
  });

  const payroll = await Payroll.findOneAndUpdate(
    { employee, month: Number(month), year: Number(year) },
    {
      $set: {
        organisation_id,
        employeeModel,
        ctc: structure.ctc,
        ...result,
        policySnapshot: structure.policySnapshot,
        remarks: remarks || "",
        status: "generated",
        generatedBy: req.admin._id,
        generatedByModel: req.actorModel || "Admin",
      },
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, payroll, message: "Payroll generated" });
};

// One click for the whole org (or one employeeModel bucket) for a given
// month — generates payroll for every active employee that already has a
// SalaryStructure, skipping (and reporting) anyone who doesn't.
const bulkGeneratePayroll = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { month, year, employeeModel, force } = req.body;

  if (!month || !year) return res.status(400).json({ success: false, message: "month and year are required" });

  const model = employeeModel || "User";
  if (!["User", "Manager", "Admin"].includes(model))
    return res.status(400).json({ success: false, message: "Invalid employeeModel" });

  const structures = await SalaryStructure.find({ organisation_id, employeeModel: model, isActive: true }).lean();
  if (!structures.length)
    return res.status(200).json({ success: true, generated: 0, skipped: 0, message: "No salary structures found for this employeeModel" });

  const policy = await getOrCreatePolicy(organisation_id);
  const role = model === "User" ? "employee" : model.toLowerCase();

  const employeeIds = structures.map((s) => s.employee);
  const summaries = await AttendanceSummary.find({
    employee: { $in: employeeIds },
    role,
    month: Number(month),
    year: Number(year),
  }).lean();
  const summaryByEmployee = new Map(summaries.map((s) => [String(s.employee), s]));

  // Load existing payrolls for this period so we don't silently overwrite
  // anything already approved/paid — same rule as the single generatePayroll.
  const existingPayrolls = await Payroll.find({
    employee: { $in: employeeIds },
    month: Number(month),
    year: Number(year),
  })
    .select("employee status")
    .lean();
  const existingStatusByEmployee = new Map(existingPayrolls.map((p) => [String(p.employee), p.status]));

  const ops = [];
  const skipped = [];

  for (const structure of structures) {
    if (!structure.breakup?.monthlyGross) {
      skipped.push({ employee: structure.employee, reason: "breakup missing, re-set CTC" });
      continue;
    }

    const currentStatus = existingStatusByEmployee.get(String(structure.employee));
    if (currentStatus && ["approved", "paid"].includes(currentStatus) && !force) {
      skipped.push({ employee: structure.employee, reason: `already ${currentStatus}, pass force: true to override` });
      continue;
    }

    const attendanceSummary = summaryByEmployee.get(String(structure.employee)) || null;
    const result = calculatePayrollForMonth({
      structure,
      policy,
      attendanceSummary,
      month: Number(month),
      year: Number(year),
      extras: {},
    });

    ops.push({
      updateOne: {
        filter: { employee: structure.employee, month: Number(month), year: Number(year) },
        update: {
          $set: {
            organisation_id,
            employeeModel: model,
            ctc: structure.ctc,
            ...result,
            policySnapshot: structure.policySnapshot,
            status: "generated",
            generatedBy: req.admin._id,
            generatedByModel: req.actorModel || "Admin",
          },
        },
        upsert: true,
      },
    });
  }

  const bulkResult = ops.length ? await Payroll.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };

  res.status(200).json({
    success: true,
    generated: (bulkResult.upsertedCount || 0) + (bulkResult.modifiedCount || 0),
    skipped: skipped.length,
    skippedDetails: skipped,
  });
};

// ---------- Retrieval ----------

const listPayrolls = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { month, year, employeeModel, status } = req.query;

  const filter = { organisation_id };
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (employeeModel) filter.employeeModel = employeeModel;
  if (status) filter.status = status;

  const payrolls = await Payroll.find(filter).sort({ year: -1, month: -1 }).lean();
  res.status(200).json({ success: true, count: payrolls.length, payrolls });
};

const getPayslip = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee, month, year } = req.query;

  if (!employee || !month || !year)
    return res.status(400).json({ success: false, message: "employee, month and year are required" });

  const payslip = await Payroll.findOne({ organisation_id, employee, month: Number(month), year: Number(year) }).lean();
  if (!payslip) return res.status(404).json({ success: false, message: "Payslip not found for this period" });

  res.status(200).json({ success: true, payslip });
};

const updatePayrollStatus = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "paid", "on_hold"].includes(status))
    return res.status(400).json({ success: false, message: "status must be approved, paid or on_hold" });

  const setFields = { status };
  if (status === "approved") {
    setFields.approvedBy = req.admin._id;
    setFields.approvedByModel = req.actorModel || "Admin";
  }
  if (status === "paid") setFields.paidOn = new Date();

  const payroll = await Payroll.findOneAndUpdate({ _id: id, organisation_id }, { $set: setFields }, { new: true });
  if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

  res.status(200).json({ success: true, payroll });
};

module.exports = {
  setEmployeeCTC,
  reapplyPolicy,
  getSalaryStructure,
  listSalaryStructures,
  generatePayroll,
  bulkGeneratePayroll,
  listPayrolls,
  getPayslip,
  updatePayrollStatus,
};
