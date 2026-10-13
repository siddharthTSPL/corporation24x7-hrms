const OfferLetter = require("../Models/offerletter.model");
const AppointmentLetter = require("../Models/appointmentletter.model");
const Candidate = require("../Models/candidate.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");
const imagekit = require("../utils/imagekit.utils");
const { sendEmail } = require("../utils/nodemailer.utils");
const { createNotification } = require("../utils/Notification.utils");
const { formatInr } = require("../utils/recruitment/ctcCalculator.utils");
const { TEMPLATES } = require("../utils/recruitment/offerTemplates.utils");
const { buildApprovalRequestEmail, buildApprovalResultEmail } = require("../utils/recruitment/offerMail.utils");
const { fail, str, serialize, safeFileName, loadOffer, loadAppointment, buildPdf, appointmentPdf, reviewIssues } = require("./Offer.controller");

const FRONTEND_URL = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const SUBMITTABLE = { offer: ["DRAFT", "REVIEW_DONE"], appointment: ["DRAFT"] };

const KIND = {
  offer: { Model: OfferLetter, label: "Offer Letter", pdfKind: "OFFER" },
  appointment: { Model: AppointmentLetter, label: "Appointment Letter", pdfKind: "APPOINTMENT" },
};

const kindOf = (raw) => {
  const k = String(raw || "").toLowerCase();
  if (!KIND[k]) throw fail(400, "Unknown letter type");
  return k;
};

const fullName = (u) => `${u?.f_name || ""} ${u?.l_name || ""}`.trim();

// ---- who is calling -------------------------------------------------------
// Routes in this file are mounted behind either the admin middleware (creator
// side) or adminOrSuperAdmin middleware (approver side). Normalise both.
const actor = (req) => {
  if (req.superAdmin) {
    return { model: "SuperAdmin", id: req.superAdmin._id, orgId: req.superAdmin._id, doc: req.superAdmin };
  }
  return { model: "Admin", id: req.admin._id, orgId: req.admin.organisation_id, doc: req.admin };
};

const sameId = (a, b) => a && b && String(a) === String(b);

// ---- approver directory ---------------------------------------------------
const adminFilter = (orgId) => ({
  organisation_id: orgId,
  working_status: "working",
  isVerified: true,
  status: { $ne: "suspended" },
});

const toPerson = (u, model) => ({
  id: String(u._id),
  model,
  name: model === "SuperAdmin" ? fullName(u) || u.organisation_name || "Super Admin" : fullName(u),
  designation: u.designation || "",
  email: model === "SuperAdmin" ? u.email || "" : u.work_email || "",
  role: model === "SuperAdmin" ? "Super Admin" : "Admin",
});

const getApprovers = async (req, res) => {
  const a = actor(req);
  const [admins, superAdmin] = await Promise.all([
    Admin.find({ ...adminFilter(a.orgId), ...(a.model === "Admin" ? { _id: { $ne: a.id } } : {}) }).select("f_name l_name designation work_email").sort({ f_name: 1 }).lean(),
    SuperAdmin.findById(a.orgId).select("f_name l_name designation email organisation_name").lean(),
  ]);
  const list = [];
  if (superAdmin && a.model !== "SuperAdmin") list.push(toPerson(superAdmin, "SuperAdmin"));
  admins.forEach((x) => list.push(toPerson(x, "Admin")));
  return res.status(200).json({ success: true, data: list });
};

const getInterviewers = async (req, res) => {
  const a = actor(req);
  const admins = await Admin.find(adminFilter(a.orgId)).select("f_name l_name designation work_email").sort({ f_name: 1 }).lean();
  return res.status(200).json({ success: true, data: admins.map((x) => toPerson(x, "Admin")) });
};

const resolveApprover = async (orgId, model, id) => {
  if (model === "SuperAdmin") {
    const su = await SuperAdmin.findOne({ _id: id }).select("f_name l_name designation email organisation_name working_status status").lean();
    if (!su || !sameId(su._id, orgId)) throw fail(400, "Selected approver was not found in your organisation");
    return toPerson(su, "SuperAdmin");
  }
  if (model === "Admin") {
    const ad = await Admin.findOne({ _id: id, ...adminFilter(orgId) }).select("f_name l_name designation work_email").lean();
    if (!ad) throw fail(400, "Selected approver was not found or is not active");
    return toPerson(ad, "Admin");
  }
  throw fail(400, "Choose an Admin or the Super Admin as approver");
};

const approvalLink = (model) => (model === "SuperAdmin" ? "/superadmin-recruitment?tab=approvals" : "/recruitment-admin?tab=approvals");

const loadLetter = async (kind, id, orgId) => (kind === "offer" ? loadOffer(id, orgId) : loadAppointment(id, orgId));

const amountOf = (letter) => (letter.ctc?.annual_ctc ? formatInr(letter.ctc.annual_ctc) : "");

// ---- creator: send for approval / withdraw --------------------------------
const submitForApproval = async (req, res) => {
  const kind = kindOf(req.params.kind);
  const a = actor(req);
    const letter = await loadLetter(kind, req.params.id, a.orgId);

  if (letter.status === "PENDING_APPROVAL") throw fail(400, "This letter is already waiting for approval");
  if (!SUBMITTABLE[kind].includes(letter.status)) throw fail(400, `This ${KIND[kind].label.toLowerCase()} cannot be sent for approval in its current state`);
  if (kind === "offer" && new Date(letter.valid_till) < new Date()) throw fail(400, "Offer validity date has passed. Update it before sending for approval");

  const approver = await resolveApprover(a.orgId, req.body.approver_model, req.body.approver_id);
  if (a.model === approver.model && sameId(a.id, approver.id)) throw fail(400, "You cannot approve your own letter. Choose another approver");

  const candidate = await Candidate.findById(letter.candidate_id);
  const offerForCtx = kind === "offer" ? letter : await OfferLetter.findById(letter.offer_id);
  const { missing, unresolved } = reviewIssues(letter, candidate, offerForCtx, kind === "offer" ? "OFFER" : "APPOINTMENT");
  if (missing.length) throw fail(400, `Please fill: ${missing.join(", ")}`);
  if (unresolved.length) throw fail(400, `These placeholders are empty or unknown: ${unresolved.map((u) => `{{${u}}}`).join(", ")}`);

  const requesterName = fullName(a.doc);
  const wasRejected = letter.approval?.status === "REJECTED";

  if (kind === "offer") {
    letter.reviewed_by = a.id;
    letter.reviewed_at = new Date();
    if (wasRejected) letter.version = (letter.version || 1) + 1;
  }
  letter.status = "PENDING_APPROVAL";
  letter.approval.status = "PENDING";
  letter.approval.approver_id = approver.id;
  letter.approval.approver_model = approver.model;
  letter.approval.approver_name = approver.name;
  letter.approval.approver_designation = approver.designation;
  letter.approval.requested_by = a.id;
  letter.approval.requested_by_model = a.model;
  letter.approval.requested_by_name = requesterName;
  letter.approval.requested_at = new Date();
  letter.approval.decided_at = null;
  letter.approval.rejection_reason = null;
  letter.approval.signature_url = null;
  letter.approval.history.push({ action: "SUBMITTED", by_name: requesterName, approver_name: approver.name });
  await letter.save();

  await createNotification({
    recipientModel: approver.model,
    recipientId: approver.id,
    organisation_id: a.orgId,
    type: "general",
    title: `${KIND[kind].label} waiting for your approval`,
    message: `${requesterName} sent the ${KIND[kind].label.toLowerCase()} for ${candidate?.full_name || "a candidate"} (${letter.designation}) for your approval.`,
    link: approvalLink(approver.model),
    priority: "high",
    meta: { kind, letter_id: letter._id, candidate_id: letter.candidate_id },
  });

  if (approver.email) {
    try {
      const mail = buildApprovalRequestEmail({
        approverName: approver.name,
        companyName: letter.company?.name || "TorchX Talent",
        requesterName,
        kindLabel: KIND[kind].label,
        candidateName: candidate?.full_name || "",
        designation: letter.designation,
        refNo: letter.ref_no,
        annualCtcText: amountOf(letter),
        reviewUrl: FRONTEND_URL ? `${FRONTEND_URL}${approvalLink(approver.model)}` : "",
      });
      await sendEmail({ to: approver.email, subject: mail.subject, html: mail.html });
    } catch (err) {
      console.error("[approval] approver email failed:", err.message);
    }
  }

  return res.status(200).json({ success: true, message: `${KIND[kind].label} sent to ${approver.name} for approval`, data: serialize(letter) });
};

const withdrawApproval = async (req, res) => {
  const kind = kindOf(req.params.kind);
  const a = actor(req);
  const letter = await loadLetter(kind, req.params.id, a.orgId);
  if (letter.status !== "PENDING_APPROVAL") throw fail(400, "This letter is not waiting for approval");
  const name = fullName(a.doc);
  letter.approval.history.push({ action: "WITHDRAWN", by_name: name, approver_name: letter.approval.approver_name });
  letter.status = "DRAFT";
  letter.approval.status = null;
  letter.approval.decided_at = null;
  await letter.save();
  return res.status(200).json({ success: true, message: "Approval request withdrawn. The letter is editable again", data: serialize(letter) });
};

// ---- approver side --------------------------------------------------------
const mineFilter = (a) => ({
  organisation_id: a.orgId,
  "approval.approver_id": a.id,
  "approval.approver_model": a.model,
  "approval.status": { $in: ["PENDING", "APPROVED", "REJECTED"] },
});

const rowFor = (kind, letter, candidateMap) => {
  const c = candidateMap.get(String(letter.candidate_id));
  return {
    kind,
    id: String(letter._id),
    ref_no: letter.ref_no,
    letter_status: letter.status,
    approval_status: letter.approval.status,
    candidate_id: String(letter.candidate_id),
    candidate_name: c?.full_name || "Candidate",
    candidate_email: c?.email || "",
    designation: letter.designation,
    department: letter.department,
    annual_ctc: letter.ctc?.annual_ctc || null,
    joining_date: letter.joining_date,
    requested_by_name: letter.approval.requested_by_name,
    requested_at: letter.approval.requested_at,
    decided_at: letter.approval.decided_at,
    rejection_reason: letter.approval.rejection_reason,
    signature_url: letter.approval.signature_url,
    resubmission: (letter.approval.history || []).filter((h) => h.action === "SUBMITTED").length > 1,
  };
};

const listMyApprovals = async (req, res) => {
  const a = actor(req);
  const [offers, appts] = await Promise.all([
    OfferLetter.find(mineFilter(a)).sort({ "approval.requested_at": -1 }).limit(100).lean(),
    AppointmentLetter.find(mineFilter(a)).sort({ "approval.requested_at": -1 }).limit(100).lean(),
  ]);
  const ids = [...new Set([...offers, ...appts].map((l) => String(l.candidate_id)))];
  const candidates = await Candidate.find({ _id: { $in: ids } }).select("full_name email").lean();
  const map = new Map(candidates.map((c) => [String(c._id), c]));

  const rows = [...offers.map((o) => rowFor("offer", o, map)), ...appts.map((p) => rowFor("appointment", p, map))];
  const pending = rows.filter((r) => r.approval_status === "PENDING").sort((x, y) => new Date(y.requested_at) - new Date(x.requested_at));
  const history = rows
    .filter((r) => r.approval_status !== "PENDING")
    .sort((x, y) => new Date(y.decided_at || 0) - new Date(x.decided_at || 0))
    .slice(0, 50);
  const lastSigned = history.find((r) => r.approval_status === "APPROVED" && r.signature_url);

  return res.status(200).json({
    success: true,
    data: { pending, history, pending_count: pending.length, last_signature_url: lastSigned?.signature_url || null },
  });
};

const pendingCount = async (req, res) => {
  const a = actor(req);
  const f = { organisation_id: a.orgId, "approval.approver_id": a.id, "approval.approver_model": a.model, status: "PENDING_APPROVAL" };
  const [o, p] = await Promise.all([OfferLetter.countDocuments(f), AppointmentLetter.countDocuments(f)]);
  return res.status(200).json({ success: true, data: { count: o + p } });
};

const loadForApprover = async (kind, id, a) => {
  const letter = await loadLetter(kind, id, a.orgId);
  const isMine = letter.approval?.approver_model === a.model && sameId(letter.approval?.approver_id, a.id);
  if (!isMine) throw fail(403, "This letter was not sent to you for approval");
  return letter;
};

const previewForApprover = async (req, res) => {
  const kind = kindOf(req.params.kind);
  const a = actor(req);
  const letter = await loadForApprover(kind, req.params.id, a);
  const candidate = await Candidate.findById(letter.candidate_id);
  const pending = letter.status === "PENDING_APPROVAL";
  const offerDoc = kind === "offer" ? letter : await OfferLetter.findById(letter.offer_id);
  const pdf = kind === "offer" ? await buildPdf({ kind: "OFFER", letter, candidate, offer: offerDoc, watermark: pending ? "DRAFT" : null, acceptance: null }) : await appointmentPdf(letter, candidate);
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${KIND[kind].pdfKind}_${safeFileName(candidate?.full_name)}_${safeFileName(letter.ref_no)}.pdf"`,
    "Cache-Control": "no-store",
  });
  return res.status(200).send(pdf);
};

const uploadSignature = async (file, orgId) => {
  const result = await imagekit.upload({
    file: file.buffer.toString("base64"),
    fileName: file.originalname,
    folder: "/recruitment/signatures",
    useUniqueFileName: true,
    tags: [String(orgId)],
  });
  return result.url;
};

const approveLetter = async (req, res) => {
  const kind = kindOf(req.params.kind);
  const a = actor(req);
  const letter = await loadForApprover(kind, req.params.id, a);
  if (letter.status !== "PENDING_APPROVAL") throw fail(409, "This letter is no longer waiting for approval");

  const file = req.files?.signature?.[0];
  let signatureUrl = null;
  if (file) {
    signatureUrl = await uploadSignature(file, a.orgId);
  } else if (req.body.reuse_signature_url) {
    // Re-use a signature this same approver previously uploaded.
    const prev = await Promise.all([
      OfferLetter.exists({ organisation_id: a.orgId, "approval.approver_id": a.id, "approval.signature_url": req.body.reuse_signature_url }),
      AppointmentLetter.exists({ organisation_id: a.orgId, "approval.approver_id": a.id, "approval.signature_url": req.body.reuse_signature_url }),
    ]);
    if (!prev[0] && !prev[1]) throw fail(400, "That saved signature is no longer available. Please upload it again");
    signatureUrl = req.body.reuse_signature_url;
  }
  if (!signatureUrl) throw fail(400, "Please upload your signature (PNG or JPG) to approve");

  const approverName = letter.approval.approver_name || fullName(a.doc);
  letter.signature_url = signatureUrl;
  letter.signatory.name = approverName;
  letter.signatory.designation = letter.approval.approver_designation || a.doc.designation || "";
  letter.status = "FINAL";
  letter.finalized_at = new Date();
  if (kind === "appointment") letter.finalized_by = a.id;
  letter.approval.status = "APPROVED";
  letter.approval.decided_at = new Date();
  letter.approval.signature_url = signatureUrl;
  letter.approval.rejection_reason = null;
  letter.approval.history.push({ action: "APPROVED", by_name: approverName, approver_name: approverName });
  await letter.save();

  await notifyRequester({ kind, letter, approved: true });
  return res.status(200).json({ success: true, message: `${KIND[kind].label} approved and finalized with your signature`, data: serialize(letter) });
};

const rejectLetter = async (req, res) => {
  const kind = kindOf(req.params.kind);
  const a = actor(req);
  const letter = await loadForApprover(kind, req.params.id, a);
  if (letter.status !== "PENDING_APPROVAL") throw fail(409, "This letter is no longer waiting for approval");
  const reason = str(req.body.reason, 1000);
  if (reason.length < 3) throw fail(400, "Please tell the requester why you are rejecting it");

  const approverName = letter.approval.approver_name || fullName(a.doc);
  letter.status = "DRAFT";
  letter.reviewed_by = null;
  letter.reviewed_at = null;
  letter.approval.status = "REJECTED";
  letter.approval.decided_at = new Date();
  letter.approval.rejection_reason = reason;
  letter.approval.history.push({ action: "REJECTED", by_name: approverName, approver_name: approverName, reason });
  await letter.save();

  await notifyRequester({ kind, letter, approved: false, reason });
  return res.status(200).json({ success: true, message: `${KIND[kind].label} rejected and sent back for regeneration`, data: serialize(letter) });
};

const notifyRequester = async ({ kind, letter, approved, reason }) => {
  try {
    const reqModel = letter.approval.requested_by_model === "SuperAdmin" ? "SuperAdmin" : "Admin";
    const requesterDoc = letter.approval.requested_by
      ? await (reqModel === "SuperAdmin" ? SuperAdmin : Admin).findById(letter.approval.requested_by).select("f_name l_name work_email email").lean()
      : null;
    if (!requesterDoc) return;
    const requester = { ...requesterDoc, work_email: requesterDoc.work_email || requesterDoc.email };
    const candidate = await Candidate.findById(letter.candidate_id).select("full_name");
    const cName = candidate?.full_name || "the candidate";
    await createNotification({
      recipientModel: reqModel,
      recipientId: requester._id,
      organisation_id: letter.organisation_id,
      type: "general",
      title: approved ? `${KIND[kind].label} approved: ${cName}` : `${KIND[kind].label} rejected: ${cName}`,
      message: approved
        ? `${letter.approval.approver_name} approved and signed the ${KIND[kind].label.toLowerCase()}. It is finalized and ready to send.`
        : `${letter.approval.approver_name} rejected the ${KIND[kind].label.toLowerCase()}${reason ? `: ${reason}` : ""}. Regenerate it and send it again.`,
      link: reqModel === "SuperAdmin" ? "/superadmin-recruitment" : "/recruitment-admin",
      priority: "high",
      meta: { kind, letter_id: letter._id, candidate_id: letter.candidate_id, approved },
    });
    if (requester.work_email) {
      const mail = buildApprovalResultEmail({
        requesterName: fullName(requester),
        companyName: letter.company?.name || "TorchX Talent",
        accent: letter.accent_color || TEMPLATES[letter.template_key]?.accent,
        kindLabel: KIND[kind].label,
        candidateName: cName,
        designation: letter.designation,
        refNo: letter.ref_no,
        approverName: letter.approval.approver_name,
        approved,
        reason,
      });
      await sendEmail({ to: requester.work_email, subject: mail.subject, html: mail.html });
    }
  } catch (err) {
    console.error("[approval] requester notify failed:", err.message);
  }
};

module.exports = {
  getApprovers,
  getInterviewers,
  submitForApproval,
  withdrawApproval,
  listMyApprovals,
  pendingCount,
  previewForApprover,
  approveLetter,
  rejectLetter,
};