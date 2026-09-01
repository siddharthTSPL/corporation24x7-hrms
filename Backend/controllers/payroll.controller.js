const SalaryStructure = require("../Models/salarystructure.model");
const Payroll = require("../Models/payroll.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");
const { getOrCreatePolicy } = require("./payrollpolicy.controller");
const { calculateSalaryBreakup, calculatePayrollForMonth } = require("../utils/payroll.utils");

const EMPLOYEE_MODEL_MAP = { User, Manager, Admin, SuperAdmin };
const ALLOWED_EMPLOYEE_MODELS = ["User", "Manager", "Admin", "SuperAdmin"];

// Regular monthly payroll is only for currently-working people. Once someone
// has resigned/been fired/terminated, their settlement moves to the
// one-time Full & Final (FnF) flow instead — see fnf.controller.js.
const getWorkingStatusMap = async (employeeModel, employeeIds) => {
  const Model = EMPLOYEE_MODEL_MAP[employeeModel];
  if (!Model || !employeeIds.length) return new Map();
  const docs = await Model.find({ _id: { $in: employeeIds } }).select("working_status").lean();
  return new Map(docs.map((d) => [String(d._id), d.working_status || "working"]));
};




const getOrganisationSnapshot = async (organisation_id) => {
  const org = await SuperAdmin.findById(organisation_id).select("organisation_name").lean();
  return { name: org?.organisation_name || "" };
};




const getEmployeeSnapshot = async (employeeModel, employeeId) => {
  const Model = EMPLOYEE_MODEL_MAP[employeeModel];
  if (!Model) return { name: "", employeeId: "", department: "", designation: "" };


  if (employeeModel === "SuperAdmin") {
    const person = await Model.findById(employeeId).select("f_name l_name organisation_name").lean();
    if (!person) return { name: "", employeeId: "", department: "", designation: "" };
    return {
      name: `${person.f_name || ""} ${person.l_name || ""}`.trim(),
      employeeId: "OWNER",
      department: "Management",
      designation: "Super Admin",
    };
  }

  const person = await Model.findById(employeeId).select("f_name l_name empid uid department designation").lean();
  if (!person) return { name: "", employeeId: "", department: "", designation: "" };
  return {
    name: `${person.f_name || ""} ${person.l_name || ""}`.trim(),
    employeeId: person.empid || person.uid || "",
    department: person.department || "",
    designation: person.designation || "",
  };
};









// Basic org-owner (SuperAdmin) identity — Admin needs this to see "Super Admin"
// as a selectable person for CTC/payroll, same as SuperAdmin already can for
// themself. organisation_id === the SuperAdmin's own _id (see
// adminOrSuperadmin.middleware.js), so this is always the caller's own org owner.
const getOrgOwner = async (req, res) => {
  const organisation_id = req.admin.organisation_id;

  const owner = await SuperAdmin.findById(organisation_id).select("f_name l_name organisation_name").lean();
  if (!owner) return res.status(404).json({ success: false, message: "Organisation owner not found" });

  res.status(200).json({
    success: true,
    owner: {
      _id: owner._id,
      f_name: owner.f_name || "",
      l_name: owner.l_name || "",
      organisation_name: owner.organisation_name || "",
    },
  });
};




const setEmployeeCTC = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee, employeeModel, ctc, annualTaxEstimate, effectiveFrom } = req.body;

  if (!employee || !employeeModel || !ctc)
    return res.status(400).json({ success: false, message: "employee, employeeModel and ctc are required" });

  if (!ALLOWED_EMPLOYEE_MODELS.includes(employeeModel))
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

  // Payroll-readiness warnings — missing these doesn't block generating
  // payroll, but the admin should see it: no bank account means this
  // person can't actually be paid out, and no date of joining means
  // gratuity eligibility (5-year continuous service) can't be computed.
  const idsByModel = {};
  for (const s of structures) {
    (idsByModel[s.employeeModel] ||= []).push(s.employee);
  }
  const detailsByEmployee = new Map();
  for (const [model, ids] of Object.entries(idsByModel)) {
    const Model = EMPLOYEE_MODEL_MAP[model];
    if (!Model) continue;
    const docs = await Model.find({ _id: { $in: ids } }).select("account_number date_of_joining").lean();
    for (const d of docs) detailsByEmployee.set(String(d._id), d);
  }

  const withWarnings = structures.map((s) => {
    const details = detailsByEmployee.get(String(s.employee));
    return {
      ...s,
      missingBankAccount: !details?.account_number,
      missingDateOfJoining: !details?.date_of_joining,
    };
  });

  res.status(200).json({ success: true, count: withWarnings.length, structures: withWarnings });
};







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
    reimbursement,
    otherEarnings,
    loan,
    advance,
    otherDeductions,
    remarks,
    force,

    paidDays,
    workingDays,
    calendarDays,
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

  const workingStatusMap = await getWorkingStatusMap(employeeModel, [employee]);
  if ((workingStatusMap.get(String(employee)) || "working") !== "working") {
    return res.status(400).json({
      success: false,
      message: "This person has resigned/been terminated/fired. Generate their settlement from Full & Final (FnF) instead of regular payroll.",
    });
  }

  const policy = await getOrCreatePolicy(organisation_id);

  const role = employeeModel === "User" ? "employee" : employeeModel.toLowerCase();


  const hasManualPaidDays = paidDays !== undefined && paidDays !== null && paidDays !== "";
  const manualAttendance = hasManualPaidDays
    ? {
        paidDays: Number(paidDays),
        workingDays: workingDays !== undefined && workingDays !== "" ? Number(workingDays) : undefined,
        calendarDays: calendarDays !== undefined && calendarDays !== "" ? Number(calendarDays) : undefined,
      }
    : null;

  const attendanceSummary = manualAttendance
    ? null
    : await AttendanceSummary.findOne({ employee, role, month: Number(month), year: Number(year) }).lean();

  const employeeDoc = await EMPLOYEE_MODEL_MAP[employeeModel]?.findById(employee).select("date_of_joining").lean();
  const dateOfJoining = employeeDoc?.date_of_joining || null;

  const result = calculatePayrollForMonth({
    structure,
    policy,
    attendanceSummary,
    month: Number(month),
    year: Number(year),
    extras: { bonus, incentive, overtime, reimbursement, otherEarnings, loan, advance, otherDeductions },
    manualAttendance,
    dateOfJoining,
  });

  const employeeSnapshot = await getEmployeeSnapshot(employeeModel, employee);
  const organisationSnapshot = await getOrganisationSnapshot(organisation_id);

  const payroll = await Payroll.findOneAndUpdate(
    { employee, month: Number(month), year: Number(year) },
    {
      $set: {
        organisation_id,
        employeeModel,
        employeeSnapshot,
        organisationSnapshot,
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


  await lockPayScheduleIfFirstRun(organisation_id, Number(month), Number(year));

  res.status(200).json({ success: true, payroll, message: "Payroll generated" });
};



const lockPayScheduleIfFirstRun = async (organisation_id, month, year) => {
  const policy = await getOrCreatePolicy(organisation_id);
  if (policy.paySchedule?.locked) return;


  const totalPayrolls = await Payroll.countDocuments({ organisation_id });
  if (totalPayrolls !== 1) return;

  policy.paySchedule = policy.paySchedule || {};
  if (!policy.paySchedule.firstPayPeriodMonth) policy.paySchedule.firstPayPeriodMonth = month;
  if (!policy.paySchedule.firstPayPeriodYear) policy.paySchedule.firstPayPeriodYear = year;
  if (!policy.paySchedule.firstPayDate) policy.paySchedule.firstPayDate = new Date();
  policy.paySchedule.locked = true;
  await policy.save();
};




const bulkGeneratePayroll = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { month, year, employeeModel, force } = req.body;

  if (!month || !year) return res.status(400).json({ success: false, message: "month and year are required" });

  const model = employeeModel || "User";
  if (!ALLOWED_EMPLOYEE_MODELS.includes(model))
    return res.status(400).json({ success: false, message: "Invalid employeeModel" });

  const structures = await SalaryStructure.find({ organisation_id, employeeModel: model, isActive: true }).lean();
  if (!structures.length)
    return res.status(200).json({ success: true, generated: 0, skipped: 0, message: "No salary structures found for this employeeModel" });

  const workingStatusMap = await getWorkingStatusMap(model, structures.map((s) => s.employee));

  const policy = await getOrCreatePolicy(organisation_id);
  const role = model === "User" ? "employee" : model.toLowerCase();
  const organisationSnapshot = await getOrganisationSnapshot(organisation_id);

  const employeeIds = structures.map((s) => s.employee);
  const summaries = await AttendanceSummary.find({
    employee: { $in: employeeIds },
    role,
    month: Number(month),
    year: Number(year),
  }).lean();
  const summaryByEmployee = new Map(summaries.map((s) => [String(s.employee), s]));


  const existingPayrolls = await Payroll.find({
    employee: { $in: employeeIds },
    month: Number(month),
    year: Number(year),
  })
    .select("employee status")
    .lean();
  const existingStatusByEmployee = new Map(existingPayrolls.map((p) => [String(p.employee), p.status]));

  const employeeDocs = await EMPLOYEE_MODEL_MAP[model]
    .find({ _id: { $in: employeeIds } })
    .select("date_of_joining")
    .lean();
  const dojByEmployee = new Map(employeeDocs.map((d) => [String(d._id), d.date_of_joining || null]));

  const ops = [];
  const skipped = [];

  for (const structure of structures) {
    if ((workingStatusMap.get(String(structure.employee)) || "working") !== "working") {
      skipped.push({ employee: structure.employee, reason: "resigned/terminated/fired — settle via Full & Final (FnF) instead" });
      continue;
    }

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
      dateOfJoining: dojByEmployee.get(String(structure.employee)) || null,
    });

    const employeeSnapshot = await getEmployeeSnapshot(model, structure.employee);

    ops.push({
      updateOne: {
        filter: { employee: structure.employee, month: Number(month), year: Number(year) },
        update: {
          $set: {
            organisation_id,
            employeeModel: model,
            employeeSnapshot,
            organisationSnapshot,
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

  if (ops.length) await lockPayScheduleIfFirstRun(organisation_id, Number(month), Number(year));

  res.status(200).json({
    success: true,
    generated: (bulkResult.upsertedCount || 0) + (bulkResult.modifiedCount || 0),
    skipped: skipped.length,
    skippedDetails: skipped,
  });
};



const listPayrolls = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { month, year, employeeModel, status } = req.query;

  const filter = { organisation_id };
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (employeeModel) filter.employeeModel = employeeModel;
  if (status) filter.status = status;

  const payrolls = await Payroll.find(filter).sort({ year: -1, month: -1 }).lean();


  if (payrolls.some((p) => !p.organisationSnapshot?.name)) {
    const organisationSnapshot = await getOrganisationSnapshot(organisation_id);
    for (const p of payrolls) {
      if (!p.organisationSnapshot?.name) p.organisationSnapshot = organisationSnapshot;
    }
  }

  res.status(200).json({ success: true, count: payrolls.length, payrolls });
};

const getPayslip = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee, month, year } = req.query;

  if (!employee || !month || !year)
    return res.status(400).json({ success: false, message: "employee, month and year are required" });

  const payslip = await Payroll.findOne({ organisation_id, employee, month: Number(month), year: Number(year) }).lean();
  if (!payslip) return res.status(404).json({ success: false, message: "Payslip not found for this period" });


  if (!payslip.organisationSnapshot?.name) {
    payslip.organisationSnapshot = await getOrganisationSnapshot(organisation_id);
  }

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




const deletePayroll = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { id } = req.params;

  const payroll = await Payroll.findOne({ _id: id, organisation_id });
  if (!payroll) return res.status(404).json({ success: false, message: "Payroll not found" });

  if (payroll.status !== "generated")
    return res.status(400).json({ success: false, message: "Only payroll records in generated state can be deleted" });

  await Payroll.deleteOne({ _id: id, organisation_id });

  res.status(200).json({ success: true, message: "Payroll record deleted" });
};


const bulkUpdatePayrollStatus = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });

  if (!["approved", "paid", "on_hold"].includes(status))
    return res.status(400).json({ success: false, message: "status must be approved, paid or on_hold" });

  const setFields = { status };
  if (status === "approved") {
    setFields.approvedBy = req.admin._id;
    setFields.approvedByModel = req.actorModel || "Admin";
  }
  if (status === "paid") setFields.paidOn = new Date();

  const result = await Payroll.updateMany(
    { _id: { $in: ids }, organisation_id },
    { $set: setFields }
  );

  res.status(200).json({
    success: true,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
};

const bulkDeletePayroll = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });

  const deletable = await Payroll.find(
    { _id: { $in: ids }, organisation_id, status: "generated" },
    { _id: 1 }
  ).lean();
  const deletableIds = deletable.map((d) => d._id);

  const result = await Payroll.deleteMany({ _id: { $in: deletableIds }, organisation_id });

  res.status(200).json({
    success: true,
    deletedCount: result.deletedCount,
    skippedCount: ids.length - deletableIds.length,
  });
};

module.exports = {
  getOrgOwner,
  setEmployeeCTC,
  reapplyPolicy,
  getSalaryStructure,
  listSalaryStructures,
  generatePayroll,
  bulkGeneratePayroll,
  listPayrolls,
  getPayslip,
  updatePayrollStatus,
  deletePayroll,
  bulkUpdatePayrollStatus,
  bulkDeletePayroll,
};