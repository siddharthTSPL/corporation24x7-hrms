const SalaryStructure = require("../Models/salarystructure.model");
const Payroll = require("../Models/payroll.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const Attendance = require("../Models/attendance.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");
const { getOrCreatePolicy } = require("./payrollpolicy.controller");
const { calculateSalaryBreakup, calculatePayrollForMonth } = require("../utils/payroll.utils");
const { getTimesheetOvertimeByEmployee, buildOvertime } = require("../utils/Timesheetovertime.utils");
const { getOvertimeRequestsByEmployee, linkRequestsToPayroll } = require("../utils/Overtimerequest.utils");
const { isTimesheetBasis, getTimesheetAttendanceByEmployee } = require("../utils/Timesheetattendance.utils");
const FieldDutySession = require("../Models/fieldDutySession.model");
const { istDateFromYMD } = require("../utils/Istdate.utils");

const EMPLOYEE_MODEL_MAP = { User, Manager, Admin, SuperAdmin };
const ALLOWED_EMPLOYEE_MODELS = ["User", "Manager", "Admin", "SuperAdmin"];

const getPayrollPeriodBounds = (month, year) => ({
  start: istDateFromYMD(Number(year), Number(month), 1),
  end: Number(month) === 12
    ? istDateFromYMD(Number(year) + 1, 1, 1)
    : istDateFromYMD(Number(year), Number(month) + 1, 1),
});
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Regular monthly payroll is only for currently-working people. Once someone
// has resigned/been fired/terminated, their settlement moves to the
// one-time Full & Final (FnF) flow instead — see fnf.controller.js.
const getWorkingStatusMap = async (employeeModel, employeeIds) => {
  const Model = EMPLOYEE_MODEL_MAP[employeeModel];
  if (!Model || !employeeIds.length) return new Map();
  const docs = await Model.find({ _id: { $in: employeeIds } }).select("working_status").lean();
  return new Map(docs.map((d) => [String(d._id), d.working_status || "working"]));
};

const hasBankDetailsForPayroll = (employeeModel, person) => {
  const Model = EMPLOYEE_MODEL_MAP[employeeModel];
  if (!Model?.schema?.path("account_number")) return true;
  return !!String(person?.account_number || "").trim();
};

const getEffectiveJoinDate = (person) => person?.date_of_joining || person?.createdAt || null;

const isPayrollMonthBeforeJoinDate = (month, year, joinDate) => {
  if (!joinDate) return false;
  const parsed = new Date(joinDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const payrollMonthStart = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const joinMonthStart = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
  return payrollMonthStart < joinMonthStart;
};

const formatMonthYear = (month, year) => `${MONTH_NAMES[Number(month) - 1] || "Unknown"} ${year}`;




const getOrganisationSnapshot = async (organisation_id) => {
  const org = await SuperAdmin.findById(organisation_id).select("organisation_name").lean();
  return { name: org?.organisation_name || "" };
};




const getEmployeeSnapshot = async (employeeModel, employeeId) => {
  const Model = EMPLOYEE_MODEL_MAP[employeeModel];
  if (!Model) return { name: "", employeeId: "", department: "", designation: "", bankName: "", accountNumber: "" };


  if (employeeModel === "SuperAdmin") {
    const person = await Model.findById(employeeId).select("f_name l_name organisation_name bank_name account_number").lean();
    if (!person) return { name: "", employeeId: "", department: "", designation: "", bankName: "", accountNumber: "" };
    return {
      name: `${person.f_name || ""} ${person.l_name || ""}`.trim(),
      employeeId: "OWNER",
      department: "Management",
      designation: "Super Admin",
      bankName: person.bank_name || "",
      accountNumber: person.account_number || "",
    };
  }

  const person = await Model.findById(employeeId)
    .select("f_name l_name empid uid department designation bank_name account_number")
    .lean();
  if (!person) return { name: "", employeeId: "", department: "", designation: "", bankName: "", accountNumber: "" };
  return {
    name: `${person.f_name || ""} ${person.l_name || ""}`.trim(),
    employeeId: person.empid || person.uid || "",
    department: person.department || "",
    designation: person.designation || "",
    bankName: person.bank_name || "",
    accountNumber: person.account_number || "",
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




const applyAttendanceBasis = async (structure, basis) => {
  if (basis === structure.attendanceBasis) return;
  structure.attendanceBasis = basis;
  if (basis !== "timesheet") {
    structure.timesheetBasisFrom = { month: null, year: null };
    return;
  }
  const lastPaid = await Payroll.findOne({ employee: structure.employee, status: "paid" })
    .sort({ year: -1, month: -1 })
    .select("month year")
    .lean();
  structure.timesheetBasisFrom = !lastPaid
    ? { month: null, year: null }
    : lastPaid.month === 12
      ? { month: 1, year: lastPaid.year + 1 }
      : { month: lastPaid.month + 1, year: lastPaid.year };
};

const updateAttendanceBasis = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee } = req.params;
  const { attendanceBasis } = req.body;

  if (!["attendance", "timesheet"].includes(attendanceBasis))
    return res.status(400).json({ success: false, message: "attendanceBasis must be attendance or timesheet" });

  const structure = await SalaryStructure.findOne({ employee, organisation_id });
  if (!structure) return res.status(404).json({ success: false, message: "Salary structure not found" });

  if (attendanceBasis === "timesheet" && structure.employeeModel === "SuperAdmin")
    return res.status(400).json({ success: false, message: "Timesheet basis is not available for the organisation owner" });

  await applyAttendanceBasis(structure, attendanceBasis);
  await structure.save();

  const from = structure.timesheetBasisFrom;
  const message =
    attendanceBasis === "timesheet" && from?.month
      ? `Timesheet basis applies from ${MONTH_NAMES[from.month - 1]} ${from.year}. Earlier paid months stay attendance-based.`
      : attendanceBasis === "timesheet"
        ? "Timesheet basis applies to all payroll months"
        : "Attendance basis restored";

  res.status(200).json({ success: true, structure, message });
};

const setEmployeeCTC = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee, employeeModel, ctc, annualTaxEstimate, effectiveFrom, attendanceBasis } = req.body;

  if (!employee || !employeeModel || !ctc)
    return res.status(400).json({ success: false, message: "employee, employeeModel and ctc are required" });

  if (!ALLOWED_EMPLOYEE_MODELS.includes(employeeModel))
    return res.status(400).json({ success: false, message: "Invalid employeeModel" });

  if (ctc <= 0) return res.status(400).json({ success: false, message: "ctc must be greater than 0" });

  if (attendanceBasis !== undefined && !["attendance", "timesheet"].includes(attendanceBasis))
    return res.status(400).json({ success: false, message: "attendanceBasis must be attendance or timesheet" });

  if (attendanceBasis === "timesheet" && employeeModel === "SuperAdmin")
    return res.status(400).json({ success: false, message: "Timesheet basis is not available for the organisation owner" });

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
    if (attendanceBasis) await applyAttendanceBasis(existing, attendanceBasis);
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
    attendanceBasis: attendanceBasis || "attendance",
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

  if (employeeModel === "User") {
    const period = getPayrollPeriodBounds(month, year);
    const [openFieldDuty, unsyncedFieldAttendance] = await Promise.all([
      FieldDutySession.exists({
        organisation_id,
        employee,
        status: { $in: ["active", "paused", "offline"] },
        startedAt: { $lt: period.end },
      }),
      Attendance.exists({
        organisation_id,
        employee,
        role: "employee",
        source: "field",
        date: { $gte: period.start, $lt: period.end },
        $or: [
          { checkOut: { $exists: false } },
          { checkOut: null },
          { fieldSummarySyncedAt: { $exists: false } },
          { fieldSummarySyncedAt: null },
        ],
      }),
    ]);
    if (openFieldDuty || unsyncedFieldAttendance)
      return res.status(409).json({
        success: false,
        message: "This employee has an unfinished or unsynced field attendance record in the selected payroll period. Complete or resolve it before generating payroll.",
        reason: "field_duty_incomplete",
      });
  }


  const hasManualPaidDays = paidDays !== undefined && paidDays !== null && paidDays !== "";
  const manualAttendance = hasManualPaidDays
    ? {
        paidDays: Number(paidDays),
        workingDays: workingDays !== undefined && workingDays !== "" ? Number(workingDays) : undefined,
        calendarDays: calendarDays !== undefined && calendarDays !== "" ? Number(calendarDays) : undefined,
      }
    : null;

  const timesheetBasis = isTimesheetBasis(structure, employeeModel, month, year);

  let attendanceSummary = manualAttendance || timesheetBasis
    ? null
    : await AttendanceSummary.findOne({ employee, role, month: Number(month), year: Number(year) }).lean();

  const employeeDoc = await EMPLOYEE_MODEL_MAP[employeeModel]
    ?.findById(employee)
    .select("account_number date_of_joining createdAt")
    .lean();
  const dateOfJoining = getEffectiveJoinDate(employeeDoc);

  if (!hasBankDetailsForPayroll(employeeModel, employeeDoc)) {
    return res.status(400).json({
      success: false,
      message: "Bank account details are missing for this employee. Add bank details before generating payroll.",
    });
  }

  if (isPayrollMonthBeforeJoinDate(month, year, dateOfJoining)) {
    return res.status(400).json({
      success: false,
      message: `Cannot generate payroll for ${formatMonthYear(month, year)} because this employee joined in ${formatMonthYear(new Date(dateOfJoining).getUTCMonth() + 1, new Date(dateOfJoining).getUTCFullYear())}.`,
    });
  }

  // Timesheet -> payroll sync: approved timesheet overtime (if the org turned
  // it on in Payroll Policy) becomes this month's overtime earning, unless the
  // admin typed an overtime amount themselves (then that wins).
  if (timesheetBasis && !manualAttendance) {
    const attendanceMap = await getTimesheetAttendanceByEmployee({
      organisation_id,
      employeeModel,
      employees: [{ id: employee, joinDate: dateOfJoining }],
      month,
      year,
      policy,
    });
    attendanceSummary = attendanceMap.get(String(employee)) || null;
  }

  const overtimeMap = await getTimesheetOvertimeByEmployee({
    organisation_id,
    employeeModel,
    employeeIds: [employee],
    month,
    year,
  });
  const requestMap = await getOvertimeRequestsByEmployee({
    organisation_id,
    employeeModel,
    employeeIds: [employee],
    month,
    year,
  });
  const { amount: overtimeAmount, detail: overtimeDetail } = buildOvertime({
    policy,
    structure,
    overtimeEntry: overtimeMap.get(String(employee)),
    manualOvertime: overtime,
    requestEntry: requestMap.get(String(employee)),
    month,
    year,
  });

  const result = calculatePayrollForMonth({
    structure,
    policy,
    attendanceSummary,
    month: Number(month),
    year: Number(year),
    extras: { bonus, incentive, overtime: overtimeAmount, reimbursement, otherEarnings, loan, advance, otherDeductions },
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
        overtimeDetail,
        policySnapshot: structure.policySnapshot,
        remarks: remarks || "",
        status: "generated",
        generatedBy: req.admin._id,
        generatedByModel: req.actorModel || "Admin",
      },
    },
    { upsert: true, new: true }
  );

  await linkRequestsToPayroll({
    employee,
    employeeModel,
    month,
    year,
    payrollId: payroll?._id,
    requestIds: overtimeDetail.requestIds,
  });


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
  const period = getPayrollPeriodBounds(month, year);
  const [openFieldDuties, unsyncedFieldAttendances] = model === "User"
    ? await Promise.all([
        FieldDutySession.find({
          organisation_id,
          employee: { $in: employeeIds },
          status: { $in: ["active", "paused", "offline"] },
          startedAt: { $lt: period.end },
        }).select("employee").lean(),
        Attendance.find({
          organisation_id,
          employee: { $in: employeeIds },
          role: "employee",
          source: "field",
          date: { $gte: period.start, $lt: period.end },
          $or: [
            { checkOut: { $exists: false } },
            { checkOut: null },
            { fieldSummarySyncedAt: { $exists: false } },
            { fieldSummarySyncedAt: null },
          ],
        }).select("employee").lean(),
      ])
    : [[], []];
  const employeesWithOpenFieldDuty = new Set([
    ...openFieldDuties.map((row) => String(row.employee)),
    ...unsyncedFieldAttendances.map((row) => String(row.employee)),
  ]);
  const summaries = await AttendanceSummary.find({
    employee: { $in: employeeIds },
    role,
    month: Number(month),
    year: Number(year),
  }).lean();
  const summaryByEmployee = new Map(summaries.map((s) => [String(s.employee), s]));

  // One query for the whole run: approved-timesheet overtime per employee.
  const overtimeByEmployee = await getTimesheetOvertimeByEmployee({
    organisation_id,
    employeeModel: model,
    employeeIds,
    month,
    year,
  });


  const requestsByEmployee = await getOvertimeRequestsByEmployee({
    organisation_id,
    employeeModel: model,
    employeeIds,
    month,
    year,
  });

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
    .select("account_number date_of_joining createdAt")
    .lean();
  const employeeDocById = new Map(employeeDocs.map((d) => [String(d._id), d]));

  const timesheetAttendanceByEmployee = await getTimesheetAttendanceByEmployee({
    organisation_id,
    employeeModel: model,
    employees: structures
      .filter((s) => isTimesheetBasis(s, model, month, year))
      .map((s) => ({ id: s.employee, joinDate: getEffectiveJoinDate(employeeDocById.get(String(s.employee))) })),
    month,
    year,
    policy,
  });

  const overtimeRequestIdsByEmployee = new Map();
  const ops = [];
  const skipped = [];

  for (const structure of structures) {
    if (employeesWithOpenFieldDuty.has(String(structure.employee))) {
      skipped.push({ employee: structure.employee, reason: "unfinished or unsynced field attendance in the selected payroll period" });
      continue;
    }

    if ((workingStatusMap.get(String(structure.employee)) || "working") !== "working") {
      skipped.push({ employee: structure.employee, reason: "resigned/terminated/fired — settle via Full & Final (FnF) instead" });
      continue;
    }

    if (!structure.breakup?.monthlyGross) {
      skipped.push({ employee: structure.employee, reason: "breakup missing, re-set CTC" });
      continue;
    }

    const employeeDoc = employeeDocById.get(String(structure.employee)) || null;
    const effectiveJoinDate = getEffectiveJoinDate(employeeDoc);

    if (!hasBankDetailsForPayroll(model, employeeDoc)) {
      skipped.push({ employee: structure.employee, reason: "bank account details missing" });
      continue;
    }

    if (isPayrollMonthBeforeJoinDate(month, year, effectiveJoinDate)) {
      skipped.push({
        employee: structure.employee,
        reason: `joined in ${formatMonthYear(new Date(effectiveJoinDate).getUTCMonth() + 1, new Date(effectiveJoinDate).getUTCFullYear())}`,
      });
      continue;
    }

    const currentStatus = existingStatusByEmployee.get(String(structure.employee));
    if (currentStatus && ["approved", "paid"].includes(currentStatus) && !force) {
      skipped.push({ employee: structure.employee, reason: `already ${currentStatus}, pass force: true to override` });
      continue;
    }

    const timesheetBasis = isTimesheetBasis(structure, model, month, year);
    const attendanceSummary = timesheetBasis
      ? timesheetAttendanceByEmployee.get(String(structure.employee)) || null
      : summaryByEmployee.get(String(structure.employee)) || null;
    const { amount: overtimeAmount, detail: overtimeDetail } = buildOvertime({
      policy,
      structure,
      overtimeEntry: overtimeByEmployee.get(String(structure.employee)),
      manualOvertime: 0,
      requestEntry: requestsByEmployee.get(String(structure.employee)),
      month,
      year,
    });
    overtimeRequestIdsByEmployee.set(String(structure.employee), overtimeDetail.requestIds || []);
    const result = calculatePayrollForMonth({
      structure,
      policy,
      attendanceSummary,
      month: Number(month),
      year: Number(year),
      extras: { overtime: overtimeAmount },
      dateOfJoining: effectiveJoinDate,
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
            overtimeDetail,
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

  if (ops.length) {
    const saved = await Payroll.find({
      employee: { $in: [...overtimeRequestIdsByEmployee.keys()] },
      month: Number(month),
      year: Number(year),
    })
      .select("_id employee")
      .lean();
    for (const row of saved) {
      await linkRequestsToPayroll({
        employee: row.employee,
        employeeModel: model,
        month,
        year,
        payrollId: row._id,
        requestIds: overtimeRequestIdsByEmployee.get(String(row.employee)),
      });
    }
  }

  if (ops.length) await lockPayScheduleIfFirstRun(organisation_id, Number(month), Number(year));

  res.status(200).json({
    success: true,
    generated: (bulkResult.upsertedCount || 0) + (bulkResult.modifiedCount || 0),
    skipped: skipped.length,
    skippedDetails: skipped,
  });
};



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

  // Older payrolls (generated before bank details were added to the
  // snapshot) won't have bankName/accountNumber saved — backfill from each
  // employee's current bank details so existing payslips still show them.
  const needsBankBackfill = payrolls.filter((p) => !p.employeeSnapshot?.bankName && !p.employeeSnapshot?.accountNumber);
  if (needsBankBackfill.length) {
    const cache = new Map();
    for (const p of needsBankBackfill) {
      const cacheKey = `${p.employeeModel}:${p.employee}`;
      if (!cache.has(cacheKey)) {
        cache.set(cacheKey, await getEmployeeSnapshot(p.employeeModel, p.employee));
      }
      const { bankName, accountNumber } = cache.get(cacheKey);
      p.employeeSnapshot = { ...p.employeeSnapshot, bankName, accountNumber };
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

  // Older payslips (generated before bank details were added to the
  // snapshot) won't have bankName/accountNumber saved — backfill from the
  // employee's current bank details so existing payslips still show them.
  if (!payslip.employeeSnapshot?.bankName && !payslip.employeeSnapshot?.accountNumber) {
    const { bankName, accountNumber } = await getEmployeeSnapshot(payslip.employeeModel, payslip.employee);
    payslip.employeeSnapshot = { ...payslip.employeeSnapshot, bankName, accountNumber };
  }

  res.status(200).json({ success: true, payslip });
};

// Self-service endpoint: lets the logged-in Employee/Manager/Admin see and
// download their OWN payslips — but only once payroll has actually been
// marked "paid". This is deliberately plan-independent (no restrictPlanFeature
// gate on its route) so it works on every plan, including Basic.
const SELF_SERVICE_ROLE_MODEL = { employee: "User", manager: "Manager", admin: "Admin" };

const resolveSelfServiceActor = (req) => {
  if (req.employee) return { actor: req.employee, employeeModel: SELF_SERVICE_ROLE_MODEL.employee, organisation_id: req.employee.organisation_id };
  if (req.manager) return { actor: req.manager, employeeModel: SELF_SERVICE_ROLE_MODEL.manager, organisation_id: req.manager.organisation_id };
  if (req.admin) return { actor: req.admin, employeeModel: SELF_SERVICE_ROLE_MODEL.admin, organisation_id: req.admin.organisation_id };
  return null;
};

const getMyPayslips = async (req, res, next) => {
  try {
    const resolved = resolveSelfServiceActor(req);
    if (!resolved) return next(Object.assign(new Error("Payslips are not available for this account type."), { statusCode: 403 }));

    const { actor, employeeModel, organisation_id } = resolved;

    const payslips = await Payroll.find({
      organisation_id,
      employee: actor._id,
      employeeModel,
      status: "paid",
    })
      .sort({ year: -1, month: -1 })
      .lean();

    if (payslips.length) {
      const organisationSnapshot = payslips[0].organisationSnapshot?.name
        ? null
        : await getOrganisationSnapshot(organisation_id);
      const needsEmployeeSnapshot = !payslips[0].employeeSnapshot?.bankName && !payslips[0].employeeSnapshot?.accountNumber;
      const employeeSnapshot = needsEmployeeSnapshot ? await getEmployeeSnapshot(employeeModel, actor._id) : null;

      for (const p of payslips) {
        if (organisationSnapshot && !p.organisationSnapshot?.name) p.organisationSnapshot = organisationSnapshot;
        if (employeeSnapshot && !p.employeeSnapshot?.bankName && !p.employeeSnapshot?.accountNumber) {
          p.employeeSnapshot = { ...p.employeeSnapshot, ...employeeSnapshot };
        }
      }
    }

    res.status(200).json({ success: true, count: payslips.length, payslips });
  } catch (err) {
    next(err);
  }
};

const updatePayrollStatus = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { id } = req.params;
  const { status } = req.body;

  if (!["approved", "paid", "on_hold"].includes(status))
    return res.status(400).json({ success: false, message: "status must be approved, paid or on_hold" });

  const allowedSourceStatuses = BULK_STATUS_SOURCE_MAP[status] || [];
  const setFields = { status };
  if (status === "approved") {
    setFields.approvedBy = req.admin._id;
    setFields.approvedByModel = req.actorModel || "Admin";
  }
  if (status === "paid") setFields.paidOn = new Date();

  const payroll = await Payroll.findOneAndUpdate(
    { _id: id, organisation_id, status: { $in: allowedSourceStatuses } },
    { $set: setFields },
    { new: true }
  );
  if (!payroll) {
    const existing = await Payroll.findOne({ _id: id, organisation_id }, { status: 1 }).lean();
    if (!existing) return res.status(404).json({ success: false, message: "Payroll not found" });
    return res.status(400).json({
      success: false,
      message: `Cannot mark ${existing.status} payroll as ${status.replace("_", " ")}`,
    });
  }

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

const BULK_STATUS_SOURCE_MAP = {
  approved: ["generated", "on_hold"],
  on_hold: ["generated", "approved"],
  paid: ["approved"],
};

const bulkUpdatePayrollStatus = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });

  if (!["approved", "paid", "on_hold"].includes(status))
    return res.status(400).json({ success: false, message: "status must be approved, paid or on_hold" });

  const allowedSourceStatuses = BULK_STATUS_SOURCE_MAP[status] || [];
  const setFields = { status };
  if (status === "approved") {
    setFields.approvedBy = req.admin._id;
    setFields.approvedByModel = req.actorModel || "Admin";
  }
  if (status === "paid") setFields.paidOn = new Date();

  const eligible = await Payroll.find(
    { _id: { $in: ids }, organisation_id, status: { $in: allowedSourceStatuses } },
    { _id: 1 }
  ).lean();
  const eligibleIds = eligible.map((row) => row._id);

  const result = await Payroll.updateMany(
    { _id: { $in: eligibleIds }, organisation_id },
    { $set: setFields }
  );

  res.status(200).json({
    success: true,
    matched: result.matchedCount,
    modified: result.modifiedCount,
    skippedCount: ids.length - eligibleIds.length,
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
  updateAttendanceBasis,
  reapplyPolicy,
  getSalaryStructure,
  listSalaryStructures,
  generatePayroll,
  bulkGeneratePayroll,
  regeneratePayrollsForMonth,
  listPayrolls,
  getPayslip,
  getMyPayslips,
  updatePayrollStatus,
  deletePayroll,
  bulkUpdatePayrollStatus,
  bulkDeletePayroll,
};
