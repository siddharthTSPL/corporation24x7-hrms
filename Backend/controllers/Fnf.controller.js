const FnF = require("../Models/fnf.model");
const Payroll = require("../Models/payroll.model");
const SalaryStructure = require("../Models/salarystructure.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");

const EMPLOYEE_MODEL_MAP = { User, Manager, Admin, SuperAdmin };
const EXIT_STATUSES = ["resigned", "fired", "terminated"];

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

const getOrganisationSnapshot = async (organisation_id) => {
  const org = await SuperAdmin.findById(organisation_id).select("organisation_name").lean();
  return { name: org?.organisation_name || "" };
};

// Everyone (User/Manager/Admin) whose working_status has left "working",
// across the org — with a flag for whether their FnF has already been
// generated. This is the FnF tab's employee list.
const listEligibleForFnF = async (req, res) => {
  const organisation_id = req.admin.organisation_id;

  const [users, managers, admins] = await Promise.all([
    User.find({ organisation_id, working_status: { $in: EXIT_STATUSES } })
      .select("empid uid f_name l_name department designation working_status updatedAt")
      .lean(),
    Manager.find({ organisation_id, working_status: { $in: EXIT_STATUSES } })
      .select("empid uid f_name l_name department designation working_status updatedAt")
      .lean(),
    Admin.find({ organisation_id, working_status: { $in: EXIT_STATUSES } })
      .select("empid uid f_name l_name department designation working_status updatedAt")
      .lean(),
  ]);

  const people = [
    ...users.map((p) => ({ ...p, employeeModel: "User" })),
    ...managers.map((p) => ({ ...p, employeeModel: "Manager" })),
    ...admins.map((p) => ({ ...p, employeeModel: "Admin" })),
  ];

  const existing = await FnF.find({ organisation_id, employee: { $in: people.map((p) => p._id) } })
    .select("employee status")
    .lean();
  const fnfByEmployee = new Map(existing.map((f) => [String(f.employee), f.status]));

  const result = people.map((p) => ({
    _id: p._id,
    employeeModel: p.employeeModel,
    name: `${p.f_name || ""} ${p.l_name || ""}`.trim() || p.empid || p.uid,
    employeeId: p.empid || p.uid || "",
    department: p.department || "",
    designation: p.designation || "",
    workingStatus: p.working_status,
    statusChangedOn: p.updatedAt,
    fnfStatus: fnfByEmployee.get(String(p._id)) || null, // null = not generated yet
  }));

  res.status(200).json({ success: true, count: result.length, people: result });
};

// Generate the (one-time) FnF settlement for a single exited employee.
// pendingSalary defaults to the sum of their un-paid regular payroll months
// so the admin isn't starting from zero, but every figure is editable.
const generateFnF = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const {
    employee, employeeModel, lastWorkingDay,
    leaveEncashment, gratuity, bonus, otherEarnings,
    deductions, otherDeductions, remarks,
  } = req.body;

  if (!employee || !employeeModel)
    return res.status(400).json({ success: false, message: "employee and employeeModel are required" });

  const Model = EMPLOYEE_MODEL_MAP[employeeModel];
  if (!Model) return res.status(400).json({ success: false, message: "Invalid employeeModel" });

  const person = await Model.findOne({ _id: employee, organisation_id }).select("working_status").lean();
  if (!person) return res.status(404).json({ success: false, message: "Person not found in this organisation" });
  if (!EXIT_STATUSES.includes(person.working_status)) {
    return res.status(400).json({
      success: false,
      message: "FnF can only be generated for a resigned, fired, or terminated person. This person is still working.",
    });
  }

  const already = await FnF.findOne({ employee }).lean();
  if (already) {
    return res.status(409).json({
      success: false,
      message: "Full & Final has already been generated for this person. Edit it instead of regenerating.",
      fnfId: already._id,
    });
  }

  const unpaidPayrolls = await Payroll.find({ employee, status: { $ne: "paid" } }).select("netSalary").lean();
  const pendingSalary = unpaidPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  const structure = await SalaryStructure.findOne({ employee, organisation_id }).select("ctc").lean();

  const settlement = {
    pendingSalary,
    leaveEncashment: Number(leaveEncashment) || 0,
    gratuity: Number(gratuity) || 0,
    bonus: Number(bonus) || 0,
    otherEarnings: Number(otherEarnings) || 0,
    deductions: Number(deductions) || 0,
    otherDeductions: Number(otherDeductions) || 0,
  };
  const netPayable =
    settlement.pendingSalary + settlement.leaveEncashment + settlement.gratuity + settlement.bonus + settlement.otherEarnings
    - settlement.deductions - settlement.otherDeductions;

  const employeeSnapshot = await getEmployeeSnapshot(employeeModel, employee);
  const organisationSnapshot = await getOrganisationSnapshot(organisation_id);

  const fnf = await FnF.create({
    organisation_id,
    employee,
    employeeModel,
    exitType: person.working_status,
    lastWorkingDay: lastWorkingDay ? new Date(lastWorkingDay) : null,
    employeeSnapshot,
    organisationSnapshot,
    ctc: structure?.ctc || 0,
    settlement,
    netPayable,
    remarks: remarks || "",
    status: "generated",
    generatedBy: req.admin._id,
    generatedByModel: req.actorModel || "Admin",
  });

  res.status(201).json({ success: true, fnf });
};

const listFnF = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { status } = req.query;

  const filter = { organisation_id };
  if (status) filter.status = status;

  const records = await FnF.find(filter).sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: records.length, records });
};

const getFnFSlip = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { id } = req.params;

  const fnf = await FnF.findOne({ _id: id, organisation_id }).lean();
  if (!fnf) return res.status(404).json({ success: false, message: "FnF record not found" });

  res.status(200).json({ success: true, fnf });
};

// Editable while still "generated" — corrections before approval/payment.
const updateFnF = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { id } = req.params;
  const { leaveEncashment, gratuity, bonus, otherEarnings, deductions, otherDeductions, remarks, lastWorkingDay } = req.body;

  const fnf = await FnF.findOne({ _id: id, organisation_id });
  if (!fnf) return res.status(404).json({ success: false, message: "FnF record not found" });
  if (fnf.status !== "generated")
    return res.status(400).json({ success: false, message: "Only a record still in 'generated' status can be edited" });

  const settlement = { ...fnf.settlement.toObject() };
  if (leaveEncashment !== undefined) settlement.leaveEncashment = Number(leaveEncashment) || 0;
  if (gratuity !== undefined) settlement.gratuity = Number(gratuity) || 0;
  if (bonus !== undefined) settlement.bonus = Number(bonus) || 0;
  if (otherEarnings !== undefined) settlement.otherEarnings = Number(otherEarnings) || 0;
  if (deductions !== undefined) settlement.deductions = Number(deductions) || 0;
  if (otherDeductions !== undefined) settlement.otherDeductions = Number(otherDeductions) || 0;

  const netPayable =
    settlement.pendingSalary + settlement.leaveEncashment + settlement.gratuity + settlement.bonus + settlement.otherEarnings
    - settlement.deductions - settlement.otherDeductions;

  fnf.settlement = settlement;
  fnf.netPayable = netPayable;
  if (remarks !== undefined) fnf.remarks = remarks;
  if (lastWorkingDay !== undefined) fnf.lastWorkingDay = lastWorkingDay ? new Date(lastWorkingDay) : null;
  await fnf.save();

  res.status(200).json({ success: true, fnf });
};

const updateFnFStatus = async (req, res) => {
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

  const fnf = await FnF.findOneAndUpdate({ _id: id, organisation_id }, { $set: setFields }, { new: true });
  if (!fnf) return res.status(404).json({ success: false, message: "FnF record not found" });

  res.status(200).json({ success: true, fnf });
};

const deleteFnF = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { id } = req.params;

  const fnf = await FnF.findOne({ _id: id, organisation_id });
  if (!fnf) return res.status(404).json({ success: false, message: "FnF record not found" });
  if (fnf.status !== "generated")
    return res.status(400).json({ success: false, message: "Only a record still in 'generated' status can be deleted" });

  await FnF.deleteOne({ _id: id, organisation_id });
  res.status(200).json({ success: true, message: "FnF record deleted" });
};

module.exports = {
  listEligibleForFnF,
  generateFnF,
  listFnF,
  getFnFSlip,
  updateFnF,
  updateFnFStatus,
  deleteFnF,
};