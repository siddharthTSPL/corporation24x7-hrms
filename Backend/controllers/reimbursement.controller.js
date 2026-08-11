const Reimbursement = require("../Models/reimbursement.model");
const imagekit = require("../utils/imagekit.utils");

const ALLOWED_TYPES = [
  "Travel",
  "Food",
  "Medical",
  "Internet",
  "Office Supplies",
  "Training",
  "Other",
];

const err = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

// True only when the actor (employee/manager/admin) has filled in every
// bank field needed to actually pay out a reimbursement.
const hasBankDetails = (actor) =>
  !!(
    actor?.bank_name?.trim() &&
    actor?.account_holder_name?.trim() &&
    actor?.account_number?.trim() &&
    actor?.ifsc_code?.trim()
  );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Uploads whatever multer put on req.files["receipts"] / req.files["supportingDocuments"]
// to ImageKit and returns the attachment sub-docs — mirrors uploaddocument.controller.js.
const uploadAttachments = async (files = []) => {
  const uploaded = [];
  for (const file of files) {
    const fileBase64 = file.buffer.toString("base64");
    const res = await imagekit.upload({
      file: fileBase64,
      fileName: file.originalname,
      folder: "/reimbursements",
      useUniqueFileName: true,
    });
    uploaded.push({
      url: res.url,
      fileId: res.fileId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeKb: Math.round(res.size / 1024),
    });
  }
  return uploaded;
};

// Builds the snapshot + actor fields shared by every "apply" handler, given
// the authenticated actor (req.employee / req.manager / req.admin) and which
// model it maps to.
const buildActorSnapshot = (actor, model) => ({
  submittedBy: actor._id,
  submitterModel: model,
  organisation_id: actor.organisation_id,
  employeeName: `${actor.f_name} ${actor.l_name}`,
  empid: actor.empid,
  department: actor.department,
  designation: actor.designation,
  email: actor.work_email,
  reportingManager: model === "User" ? actor.Under_manager || null : null,
  bankAccount: {
    bankName: actor.bank_name || "",
    accountHolderName: actor.account_holder_name || "",
    accountNumber: actor.account_number || "",
    ifscCode: actor.ifsc_code || "",
  },
});

const validateClaimBody = (body) => {
  const { reimbursementType, expenseDate, amountClaimed, description } = body;
  if (!reimbursementType || !ALLOWED_TYPES.includes(reimbursementType))
    return "A valid reimbursementType is required";
  if (!expenseDate) return "expenseDate is required";
  if (amountClaimed === undefined || Number(amountClaimed) <= 0)
    return "amountClaimed must be a positive number";
  if (!description) return "description is required";
  return null;
};

// Shared "apply" logic used by employee/manager/admin apply handlers.
const createClaim = async ({ actor, model, body, files, asDraft }) => {
  const validationError = validateClaimBody(body);
  if (!asDraft && validationError) throw err(validationError);

  if (!asDraft && !hasBankDetails(actor))
    throw err("Bank details is not available. Please update your bank details in Settings before submitting a reimbursement claim.");

  const receipts = await uploadAttachments(files?.receipts);
  const supportingDocuments = await uploadAttachments(files?.supportingDocuments);

  if (!asDraft && receipts.length === 0)
    throw err("At least one receipt/invoice must be attached to submit a claim");

  const claim = await Reimbursement.create({
    ...buildActorSnapshot(actor, model),
    reimbursementType: body.reimbursementType,
    expenseDate: body.expenseDate,
    amountClaimed: body.amountClaimed,
    currency: body.currency || "INR",
    description: body.description,
    project: body.project || "",
    costCenter: body.costCenter || "",
    paymentMethod: body.paymentMethod || "Bank Transfer",
    reimbursementPolicyAcknowledged: !!body.reimbursementPolicyAcknowledged,
    employeeSignature: body.employeeSignature || "",
    receipts,
    supportingDocuments,
    status: asDraft ? "draft" : "submitted",
  });

  return claim;
};

const updateClaim = async ({ actor, model, id, body, files }) => {
  const claim = await Reimbursement.findOne({
    _id: id,
    organisation_id: actor.organisation_id,
    submittedBy: actor._id,
    submitterModel: model,
  });
  if (!claim) throw err("Reimbursement claim not found", 404);
  if (claim.status !== "draft")
    throw err("Only a draft claim can be edited", 400);

  const editable = [
    "reimbursementType",
    "expenseDate",
    "amountClaimed",
    "currency",
    "description",
    "project",
    "costCenter",
    "paymentMethod",
    "employeeSignature",
  ];
  editable.forEach((field) => {
    if (body[field] !== undefined) claim[field] = body[field];
  });
  if (body.reimbursementPolicyAcknowledged !== undefined)
    claim.reimbursementPolicyAcknowledged = !!body.reimbursementPolicyAcknowledged;

  const newReceipts = await uploadAttachments(files?.receipts);
  const newSupportingDocuments = await uploadAttachments(files?.supportingDocuments);
  if (newReceipts.length) claim.receipts.push(...newReceipts);
  if (newSupportingDocuments.length) claim.supportingDocuments.push(...newSupportingDocuments);

  if (body.status === "submitted") {
    const validationError = validateClaimBody(claim.toObject());
    if (validationError) throw err(validationError);
    if (!hasBankDetails(actor))
      throw err("Bank details is not available. Please update your bank details in Settings before submitting a reimbursement claim.");
    if (claim.receipts.length === 0)
      throw err("At least one receipt/invoice must be attached to submit a claim");
    // Re-snapshot bank details in case they were added/changed after the
    // draft was first saved.
    claim.bankAccount = {
      bankName: actor.bank_name || "",
      accountHolderName: actor.account_holder_name || "",
      accountNumber: actor.account_number || "",
      ifscCode: actor.ifsc_code || "",
    };
    claim.status = "submitted";
  }

  await claim.save();
  return claim;
};

const deleteClaim = async ({ actor, model, id }) => {
  const claim = await Reimbursement.findOne({
    _id: id,
    organisation_id: actor.organisation_id,
    submittedBy: actor._id,
    submitterModel: model,
  });
  if (!claim) throw err("Reimbursement claim not found", 404);
  if (claim.status !== "draft")
    throw err("Only a draft claim can be deleted", 400);
  await claim.deleteOne();
};

const listMyClaims = async ({ actor, model }) => {
  return Reimbursement.find({
    organisation_id: actor.organisation_id,
    submittedBy: actor._id,
    submitterModel: model,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .populate("reportingManager", "f_name l_name work_email personal_contact")
    .lean();
};

// Admin reviews claims raised by User/Manager. SuperAdmin reviews claims
// raised by Admin, and can additionally see/act on everything.
const listQueueForApprover = async ({ organisation_id, approverModel, status }) => {
  const query = { organisation_id, approverModel, isDeleted: false };
  if (status) query.status = status;
  return Reimbursement.find(query)
    .sort({ createdAt: -1 })
    .populate("reportingManager", "f_name l_name work_email personal_contact")
    .lean();
};

const decideClaim = async ({
  organisation_id,
  id,
  decision,
  actorId,
  actorModel,
  comments,
  reason,
  allowedApproverModels,
}) => {
  const claim = await Reimbursement.findOne({ _id: id, organisation_id });
  if (!claim) throw err("Reimbursement claim not found", 404);
  if (!allowedApproverModels.includes(claim.approverModel))
    throw err("You are not authorized to act on this claim", 403);
  if (claim.status !== "submitted")
    throw err(`Cannot ${decision} a claim that is not pending review`, 400);

  if (decision === "approve") {
    claim.status = "approved";
    claim.approvedBy = actorId;
    claim.approvedByModel = actorModel;
    claim.approvedAt = new Date();
    claim.approverComments = comments || "";
  } else {
    claim.status = "rejected";
    claim.rejectedBy = actorId;
    claim.rejectedByModel = actorModel;
    claim.rejectedAt = new Date();
    claim.rejectionReason = reason || "";
  }

  await claim.save();
  return claim;
};

const markPaid = async ({ organisation_id, id, actorId, actorModel, paymentReference, financeNotes, allowedApproverModels }) => {
  const claim = await Reimbursement.findOne({ _id: id, organisation_id });
  if (!claim) throw err("Reimbursement claim not found", 404);
  if (!allowedApproverModels.includes(claim.approverModel))
    throw err("You are not authorized to act on this claim", 403);
  if (claim.status !== "approved")
    throw err("Only an approved claim can be marked as paid", 400);

  claim.status = "paid";
  claim.paidBy = actorId;
  claim.paidByModel = actorModel;
  claim.paidAt = new Date();
  claim.paymentReference = paymentReference || "";
  if (financeNotes !== undefined) claim.financeNotes = financeNotes;

  await claim.save();
  return claim;
};

// ---------------------------------------------------------------------------
// Employee (User) handlers
// ---------------------------------------------------------------------------

const employeeApply = async (req, res) => {
  const claim = await createClaim({
    actor: req.employee,
    model: "User",
    body: req.body,
    files: req.files,
    asDraft: req.body.status === "draft",
  });
  res.status(201).json({ success: true, message: "Reimbursement claim submitted", reimbursement: claim });
};

const employeeUpdate = async (req, res) => {
  const claim = await updateClaim({ actor: req.employee, model: "User", id: req.params.id, body: req.body, files: req.files });
  res.status(200).json({ success: true, message: "Reimbursement claim updated", reimbursement: claim });
};

const employeeDelete = async (req, res) => {
  await deleteClaim({ actor: req.employee, model: "User", id: req.params.id });
  res.status(200).json({ success: true, message: "Reimbursement claim deleted" });
};

const employeeGetMy = async (req, res) => {
  const reimbursements = await listMyClaims({ actor: req.employee, model: "User" });
  res.status(200).json({ success: true, count: reimbursements.length, reimbursements });
};

// ---------------------------------------------------------------------------
// Manager handlers (Manager's own claims — reviewed by Admin, same as Employee)
// ---------------------------------------------------------------------------

const managerApply = async (req, res) => {
  const claim = await createClaim({
    actor: req.manager,
    model: "Manager",
    body: req.body,
    files: req.files,
    asDraft: req.body.status === "draft",
  });
  res.status(201).json({ success: true, message: "Reimbursement claim submitted", reimbursement: claim });
};

const managerUpdate = async (req, res) => {
  const claim = await updateClaim({ actor: req.manager, model: "Manager", id: req.params.id, body: req.body, files: req.files });
  res.status(200).json({ success: true, message: "Reimbursement claim updated", reimbursement: claim });
};

const managerDelete = async (req, res) => {
  await deleteClaim({ actor: req.manager, model: "Manager", id: req.params.id });
  res.status(200).json({ success: true, message: "Reimbursement claim deleted" });
};

const managerGetMy = async (req, res) => {
  const reimbursements = await listMyClaims({ actor: req.manager, model: "Manager" });
  res.status(200).json({ success: true, count: reimbursements.length, reimbursements });
};

// ---------------------------------------------------------------------------
// Admin handlers
//   - Admin's own claims escalate to SuperAdmin (apply/update/delete/getMy)
//   - Admin reviews Employee + Manager claims (pending/all/approve/reject/markPaid)
// ---------------------------------------------------------------------------

const adminApply = async (req, res) => {
  const claim = await createClaim({
    actor: req.admin,
    model: "Admin",
    body: req.body,
    files: req.files,
    asDraft: req.body.status === "draft",
  });
  res.status(201).json({ success: true, message: "Reimbursement claim submitted", reimbursement: claim });
};

const adminUpdate = async (req, res) => {
  const claim = await updateClaim({ actor: req.admin, model: "Admin", id: req.params.id, body: req.body, files: req.files });
  res.status(200).json({ success: true, message: "Reimbursement claim updated", reimbursement: claim });
};

const adminDelete = async (req, res) => {
  await deleteClaim({ actor: req.admin, model: "Admin", id: req.params.id });
  res.status(200).json({ success: true, message: "Reimbursement claim deleted" });
};

const adminGetMy = async (req, res) => {
  const reimbursements = await listMyClaims({ actor: req.admin, model: "Admin" });
  res.status(200).json({ success: true, count: reimbursements.length, reimbursements });
};

const adminGetPending = async (req, res) => {
  const reimbursements = await listQueueForApprover({
    organisation_id: req.admin.organisation_id,
    approverModel: "Admin",
    status: "submitted",
  });
  res.status(200).json({ success: true, count: reimbursements.length, reimbursements });
};

// Every Employee/Manager claim regardless of status — admin's full ledger.
const adminGetAll = async (req, res) => {
  const reimbursements = await listQueueForApprover({
    organisation_id: req.admin.organisation_id,
    approverModel: "Admin",
    status: req.query.status,
  });
  res.status(200).json({ success: true, count: reimbursements.length, reimbursements });
};

const adminApprove = async (req, res) => {
  const claim = await decideClaim({
    organisation_id: req.admin.organisation_id,
    id: req.body.id,
    decision: "approve",
    actorId: req.admin._id,
    actorModel: "Admin",
    comments: req.body.comments,
    allowedApproverModels: ["Admin"],
  });
  res.status(200).json({ success: true, message: "Reimbursement claim approved", reimbursement: claim });
};

const adminReject = async (req, res) => {
  const claim = await decideClaim({
    organisation_id: req.admin.organisation_id,
    id: req.body.id,
    decision: "reject",
    actorId: req.admin._id,
    actorModel: "Admin",
    reason: req.body.reason,
    allowedApproverModels: ["Admin"],
  });
  res.status(200).json({ success: true, message: "Reimbursement claim rejected", reimbursement: claim });
};

const adminMarkPaid = async (req, res) => {
  const claim = await markPaid({
    organisation_id: req.admin.organisation_id,
    id: req.body.id,
    actorId: req.admin._id,
    actorModel: "Admin",
    paymentReference: req.body.paymentReference,
    financeNotes: req.body.financeNotes,
    allowedApproverModels: ["Admin"],
  });
  res.status(200).json({ success: true, message: "Reimbursement claim marked as paid", reimbursement: claim });
};

// ---------------------------------------------------------------------------
// SuperAdmin handlers
//   - Reviews Admin claims (pending/approve/reject/markPaid)
//   - Can see every claim in the org: Employee, Manager, and Admin
// ---------------------------------------------------------------------------

const superadminGetPending = async (req, res) => {
  const reimbursements = await listQueueForApprover({
    organisation_id: req.superAdmin._id,
    approverModel: "SuperAdmin",
    status: "submitted",
  });
  res.status(200).json({ success: true, count: reimbursements.length, reimbursements });
};

// Org-wide visibility across all three submitter roles, any status.
const superadminGetAll = async (req, res) => {
  const query = { organisation_id: req.superAdmin._id, isDeleted: false };
  if (req.query.status) query.status = req.query.status;
  if (req.query.submitterModel) query.submitterModel = req.query.submitterModel;

  const reimbursements = await Reimbursement.find(query)
    .sort({ createdAt: -1 })
    .populate("reportingManager", "f_name l_name work_email personal_contact")
    .lean();
  res.status(200).json({ success: true, count: reimbursements.length, reimbursements });
};

const superadminApprove = async (req, res) => {
  const claim = await decideClaim({
    organisation_id: req.superAdmin._id,
    id: req.body.id,
    decision: "approve",
    actorId: req.superAdmin._id,
    actorModel: "SuperAdmin",
    comments: req.body.comments,
    // SuperAdmin can approve Admin claims via the normal queue; org-wide
    // override for Employee/Manager claims is intentionally not exposed
    // here to keep Admin as the single approver for those, per spec.
    allowedApproverModels: ["SuperAdmin"],
  });
  res.status(200).json({ success: true, message: "Reimbursement claim approved", reimbursement: claim });
};

const superadminReject = async (req, res) => {
  const claim = await decideClaim({
    organisation_id: req.superAdmin._id,
    id: req.body.id,
    decision: "reject",
    actorId: req.superAdmin._id,
    actorModel: "SuperAdmin",
    reason: req.body.reason,
    allowedApproverModels: ["SuperAdmin"],
  });
  res.status(200).json({ success: true, message: "Reimbursement claim rejected", reimbursement: claim });
};

const superadminMarkPaid = async (req, res) => {
  const claim = await markPaid({
    organisation_id: req.superAdmin._id,
    id: req.body.id,
    actorId: req.superAdmin._id,
    actorModel: "SuperAdmin",
    paymentReference: req.body.paymentReference,
    financeNotes: req.body.financeNotes,
    allowedApproverModels: ["SuperAdmin"],
  });
  res.status(200).json({ success: true, message: "Reimbursement claim marked as paid", reimbursement: claim });
};

module.exports = {
  employeeApply,
  employeeUpdate,
  employeeDelete,
  employeeGetMy,
  managerApply,
  managerUpdate,
  managerDelete,
  managerGetMy,
  adminApply,
  adminUpdate,
  adminDelete,
  adminGetMy,
  adminGetPending,
  adminGetAll,
  adminApprove,
  adminReject,
  adminMarkPaid,
  superadminGetPending,
  superadminGetAll,
  superadminApprove,
  superadminReject,
  superadminMarkPaid,
};
