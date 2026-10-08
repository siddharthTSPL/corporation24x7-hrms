const crypto = require("crypto");
const OfferLetter = require("../Models/offerletter.model");
const AppointmentLetter = require("../Models/appointmentletter.model");
const Candidate = require("../Models/candidate.model");
const HiringRequisition = require("../Models/Hiringrequisition.model");
const SuperAdmin = require("../Models/superadmin.model");
const Admin = require("../Models/Admin.model");
const imagekit = require("../utils/imagekit.utils");
const { sendEmail } = require("../utils/nodemailer.utils");
const { createNotification } = require("../utils/Notification.utils");
const { syncRequisitionFillStatus } = require("../utils/recruitment/pipeline.utils");
const { calculateCtc, formatInr } = require("../utils/recruitment/ctcCalculator.utils");
const { listTemplates, TEMPLATES, PLACEHOLDERS, cloneSections } = require("../utils/recruitment/offerTemplates.utils");
const { buildContext, resolveSections } = require("../utils/recruitment/offerPlaceholders.utils");
const { generateLetterPdf } = require("../utils/recruitment/offerPdf.utils");
const {
  buildOfferEmail,
  buildOfferReminderEmail,
  buildOfferConfirmationEmail,
  buildHrOfferResponseEmail,
  buildAppointmentEmail,
} = require("../utils/recruitment/offerMail.utils");

const PORTAL_BASE = (process.env.TORCHX_TALENT_URL || "https://torchxsuite.com/talent").replace(/\/$/, "");

const DEPT_LABELS = { OPR: "Operations", BPO: "BPO", ENG: "Engineering", HR: "Human Resources", MGMT: "Management" };
const ACTIVE_OFFER_STATUSES = ["DRAFT", "REVIEW_DONE", "PENDING_APPROVAL", "FINAL", "SENT", "ACCEPTED"];
const REJECT_REASONS = ["Accepted a better offer", "Salary expectation not met", "Location or work mode", "Personal reasons", "Other"];
const EDITABLE_STATUSES = ["DRAFT", "REVIEW_DONE"];

const fail = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const str = (v, max = 250) => String(v ?? "").trim().slice(0, max);

const parseDateOnly = (input) => {
  if (!input) return null;
  const s = String(input);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+05:30`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseEndOfDayIst = (input) => {
  if (!input) return null;
  const s = String(input);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59+05:30`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDaysEndOfDayIst = (days) => {
  const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const ymd = target.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new Date(`${ymd}T23:59:59+05:30`);
};

const serialize = (doc) => {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete o.token;
  delete o.share_token;
  return o;
};

const safeFileName = (name) => String(name || "letter").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");

const nextRefNo = async (Model, orgId, prefix) => {
  const year = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 4);
  const base = `${prefix}/${year}/`;
  const count = await Model.countDocuments({ organisation_id: orgId, ref_no: new RegExp(`^${base}`) });
  let seq = count + 1;
  while (await Model.exists({ organisation_id: orgId, ref_no: `${base}${String(seq).padStart(4, "0")}` })) seq += 1;
  return `${base}${String(seq).padStart(4, "0")}`;
};

const orgCompanyDefaults = (org) => {
  const a = org.address || {};
  const address = [a.line1, a.line2, a.city, a.state, a.zip_code].filter(Boolean).join(", ") || org.company_address || "";
  return {
    name: org.organisation_name || "",
    address,
    city: a.city || "",
    phone: org.phone || "",
    email: org.email || "",
    website: org.company_domain || "",
  };
};

const loadCandidate = async (id, organisationId) => {
  const candidate = await Candidate.findOne({ _id: id, organisation_id: organisationId });
  if (!candidate) throw fail(404, "Candidate not found");
  return candidate;
};

const loadOffer = async (id, organisationId, withToken = false) => {
  const q = OfferLetter.findOne({ _id: id, organisation_id: organisationId });
  if (withToken) q.select("+token");
  const offer = await q;
  if (!offer) throw fail(404, "Offer letter not found");
  return offer;
};

const buildPdf = ({ kind, letter, candidate, offer, watermark, acceptance }) => {
  const plain = typeof letter.toObject === "function" ? letter.toObject() : letter;
  const context = buildContext({ letter: plain, candidate, offer: offer && (typeof offer.toObject === "function" ? offer.toObject() : offer) });
  return generateLetterPdf({ kind, letter: plain, context, watermark, acceptance });
};

const offerWatermark = (status) => {
  if (["DRAFT", "REVIEW_DONE", "PENDING_APPROVAL"].includes(status)) return "DRAFT";
  if (["EXPIRED", "REJECTED"].includes(status)) return "VOID";
  return null;
};

const offerAcceptance = (offer) => (offer.status === "ACCEPTED" && offer.response?.at ? { at: offer.response.at, ip: offer.response.ip } : null);

const missingRequired = (letter, kind) => {
  const missing = [];
  if (!letter.company?.name) missing.push("company name");
  if (!letter.designation) missing.push("designation");
  if (!letter.department) missing.push("department");
  if (!letter.work_location) missing.push("work location");
  if (!letter.joining_date) missing.push("joining date");
  if (!letter.ctc?.annual_ctc) missing.push("annual CTC");
  if (!letter.signatory?.name) missing.push("signatory name");
  if (kind === "OFFER" && !letter.valid_till) missing.push("offer validity date");
  return missing;
};

const reviewIssues = (letter, candidate, offer, kind) => {
  const plain = typeof letter.toObject === "function" ? letter.toObject() : letter;
  const context = buildContext({ letter: plain, candidate, offer: offer && (typeof offer.toObject === "function" ? offer.toObject() : offer) });
  const { unresolved } = resolveSections(plain.sections, context);
  return { missing: missingRequired(plain, kind), unresolved };
};

const notifyHr = async ({ offer, candidate, action, reason, comment, message }) => {
  const ids = [...new Set([offer.created_by, candidate.added_by].filter(Boolean).map(String))];
  if (!ids.length) return;
  const found = await Admin.find({ _id: { $in: ids } }).select("f_name l_name work_email");
  const foundIds = new Set(found.map((x) => String(x._id)));
  // Letters can also be created by the SuperAdmin, who lives in a different collection.
  const supers = await SuperAdmin.find({ _id: { $in: ids.filter((i) => !foundIds.has(i)) } }).select("f_name l_name email");
  const admins = [
    ...found.map((x) => ({ _id: x._id, f_name: x.f_name, work_email: x.work_email, model: "Admin" })),
    ...supers.map((x) => ({ _id: x._id, f_name: x.f_name, work_email: x.email, model: "SuperAdmin" })),
  ];
  const titles = {
    ACCEPTED: `Offer accepted by ${candidate.full_name}`,
    REJECTED: `Offer declined by ${candidate.full_name}`,
    EXPIRED: `Offer to ${candidate.full_name} has expired`,
    CHANGES: `${candidate.full_name} requested changes to the offer`,
  };
  const messages = {
    ACCEPTED: `${candidate.full_name} accepted the offer for ${offer.designation}. You can now mark them as joined.`,
    REJECTED: `${candidate.full_name} declined the offer for ${offer.designation}${reason ? `: ${reason}` : ""}. The opening is available again.`,
    EXPIRED: `The offer for ${offer.designation} sent to ${candidate.full_name} expired without a response. You can resend it or extend validity.`,
    CHANGES: `${candidate.full_name} sent a message about the offer for ${offer.designation}: ${message}`,
  };
  await Promise.all(
    admins.map(async (a) => {
      await createNotification({
        recipientModel: a.model,
        recipientId: a._id,
        organisation_id: offer.organisation_id,
        type: "general",
        title: titles[action],
        message: messages[action],
        link: a.model === "SuperAdmin" ? "/superadmin-recruitment" : "/recruitment-admin",
        priority: action === "ACCEPTED" || action === "CHANGES" ? "high" : "medium",
        meta: { candidate_id: candidate._id, offer_id: offer._id, action },
      });
      if (a.work_email) {
        try {
          const mail = buildHrOfferResponseEmail({
            hrName: `${a.f_name || ""}`.trim(),
            companyName: offer.company?.name || "TorchX Talent",
            candidateName: candidate.full_name,
            designation: offer.designation,
            action: action === "CHANGES" ? "CHANGES" : action,
            reason,
            comment,
            message,
          });
          await sendEmail({ to: a.work_email, subject: mail.subject, html: mail.html });
        } catch (err) {
          console.error("[offer] HR email failed:", err.message);
        }
      }
    })
  );
};

const markOfferExpired = async (offer) => {
  const updated = await OfferLetter.findOneAndUpdate({ _id: offer._id, status: "SENT" }, { $set: { status: "EXPIRED" } }, { new: true });
  if (!updated) return false;
  offer.status = "EXPIRED";
  const candidate = await Candidate.findOneAndUpdate({ _id: offer.candidate_id, current_stage: "OFFER_RELEASED" }, { $set: { current_stage: "OFFER_EXPIRED" } }, { new: true });
  await syncRequisitionFillStatus(offer.requisition_id);
  if (candidate) await notifyHr({ offer: updated, candidate, action: "EXPIRED" });
  return true;
};

const expireIfNeeded = async (offer) => {
  if (offer && offer.status === "SENT" && offer.valid_till && new Date(offer.valid_till) < new Date()) {
    await markOfferExpired(offer);
  }
  return offer;
};

const responseUrlFor = (token) => `${PORTAL_BASE}/offer-response/${token}`;

const ensureToken = (offer) => {
  if (!offer.token) offer.token = crypto.randomBytes(32).toString("hex");
  return offer.token;
};

const markSent = async (offer, candidate, channel) => {
  offer.status = "SENT";
  if (!offer.sent_at) offer.sent_at = new Date();
  if (!offer.sent_via.includes(channel)) offer.sent_via.push(channel);
  offer.token_used_at = null;
  await offer.save();
  if (candidate.current_stage === "SELECTED") {
    candidate.current_stage = "OFFER_RELEASED";
    await candidate.save();
  } else if (candidate.current_stage === "OFFER_EXPIRED") {
    candidate.current_stage = "OFFER_RELEASED";
    await candidate.save();
  }
  await syncRequisitionFillStatus(offer.requisition_id);
};

const whatsappUrl = (phone, message) => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11) throw fail(400, "Candidate does not have a valid phone number for WhatsApp");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

const offerWhatsappMessage = (offer, candidate, url) =>
  `Hello ${candidate.full_name},\n\nCongratulations! ${offer.company?.name} is pleased to offer you the position of ${offer.designation}.\n\nPlease open the secure link below to view your offer letter and respond (valid till ${new Date(offer.valid_till).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}):\n${url}\n\nRegards,\n${offer.signatory?.name || "HR Team"}\n${offer.company?.name}`;

const sanitizeSections = (input) => {
  if (!Array.isArray(input)) throw fail(400, "Sections must be a list");
  if (input.length > 25) throw fail(400, "Too many sections");
  return input.map((s, i) => ({
    key: str(s.key || `custom_${i}`, 40),
    title: str(s.title, 200),
    body: String(s.body ?? "").slice(0, 6000),
    enabled: s.enabled !== false,
  }));
};

const applyCommonEdits = (doc, body) => {
  ["designation", "department", "employment_type", "work_mode", "work_location"].forEach((k) => {
    if (body[k] !== undefined) doc[k] = str(body[k], 150);
  });
  if (body.probation_months !== undefined) {
    const n = Number(body.probation_months);
    if (!Number.isFinite(n) || n < 0 || n > 24) throw fail(400, "Probation must be between 0 and 24 months");
    doc.probation_months = n;
  }
  if (body.notice_period_days !== undefined) {
    const n = Number(body.notice_period_days);
    if (!Number.isFinite(n) || n < 0 || n > 180) throw fail(400, "Notice period must be between 0 and 180 days");
    doc.notice_period_days = n;
  }
  if (body.joining_date !== undefined) {
    const d = parseDateOnly(body.joining_date);
    if (!d) throw fail(400, "Invalid joining date");
    doc.joining_date = d;
  }
  if (body.letter_date !== undefined) {
    const d = parseDateOnly(body.letter_date);
    if (!d) throw fail(400, "Invalid letter date");
    doc.letter_date = d;
  }
  if (body.template_key !== undefined) {
    if (!TEMPLATES[body.template_key]) throw fail(400, "Unknown template");
    doc.template_key = body.template_key;
  }
  if (body.accent_color !== undefined) {
    if (body.accent_color && !/^#[0-9a-f]{6}$/i.test(body.accent_color)) throw fail(400, "Accent color must be a hex value like #730042");
    doc.accent_color = body.accent_color || null;
  }
  if (body.company && typeof body.company === "object") {
    ["name", "address", "city", "phone", "email", "website"].forEach((k) => {
      if (body.company[k] !== undefined) doc.company[k] = str(body.company[k]);
    });
  }
  if (body.signatory && typeof body.signatory === "object") {
    ["name", "designation"].forEach((k) => {
      if (body.signatory[k] !== undefined) doc.signatory[k] = str(body.signatory[k], 120);
    });
  }
  if (body.sections !== undefined) doc.sections = sanitizeSections(body.sections);
};

const recalcCtc = (doc, body) => {
  if (body.annual_ctc === undefined && body.ctc_options === undefined && body.ctc_overrides === undefined) return false;
  const annual = body.annual_ctc !== undefined ? Number(body.annual_ctc) : doc.ctc?.annual_ctc;
  const options = body.ctc_options !== undefined ? body.ctc_options : doc.ctc?.options;
  const overrides = body.ctc_overrides !== undefined ? body.ctc_overrides || {} : doc.ctc_overrides || {};
  doc.ctc = calculateCtc({ annual_ctc: annual, options, overrides });
  doc.ctc_overrides = overrides;
  doc.markModified("ctc");
  doc.markModified("ctc_overrides");
  return true;
};

const getTemplatesMeta = async (req, res) => {
  return res.status(200).json({ success: true, data: { templates: listTemplates(), placeholders: PLACEHOLDERS } });
};

const previewCtc = async (req, res) => {
  const { annual_ctc, options, overrides } = req.body;
  const ctc = calculateCtc({ annual_ctc, options, overrides });
  return res.status(200).json({ success: true, data: ctc });
};

const generateOffer = async (req, res) => {
  const organisationId = req.admin.organisation_id;
  const candidate = await loadCandidate(req.params.candidateId, organisationId);

  const existing = await OfferLetter.findOne({ candidate_id: candidate._id, status: { $in: ACTIVE_OFFER_STATUSES } });
  if (existing) return res.status(200).json({ success: true, existing: true, data: serialize(existing) });

  if (candidate.current_stage !== "SELECTED") {
    throw fail(400, "Offer letter can only be generated for a candidate in the SELECTED stage");
  }

  const requisition = await HiringRequisition.findOne({ _id: candidate.requisition_id, organisation_id: organisationId });
  if (!requisition) throw fail(404, "Requisition not found");

  const { annual_ctc, joining_date, validity_days, template_key, ctc_options } = req.body;
  const ctc = calculateCtc({ annual_ctc, options: ctc_options });

  const org = await SuperAdmin.findById(organisationId).select("organisation_name address company_address phone email company_domain").lean();
  if (!org) throw fail(404, "Organisation not found");

  const inherited = await OfferLetter.findOne({
    organisation_id: organisationId,
    $or: [{ logo_url: { $ne: null } }, { signature_url: { $ne: null } }],
  })
    .sort({ createdAt: -1 })
    .select("logo_url signature_url template_key accent_color company")
    .lean();

  const company = { ...orgCompanyDefaults(org), ...(inherited?.company || {}) };
  if (!company.name) company.name = org.organisation_name || "";

  const chosenTemplate = TEMPLATES[template_key] ? template_key : inherited?.template_key || "classic";
  const days = Math.min(Math.max(Number(validity_days) || 7, 1), 60);
  const joining = parseDateOnly(joining_date) || requisition.expected_joining_date || addDaysEndOfDayIst(30);

  const adminName = `${req.admin.f_name || ""} ${req.admin.l_name || ""}`.trim();

  const offer = await OfferLetter.create({
    organisation_id: organisationId,
    candidate_id: candidate._id,
    requisition_id: requisition._id,
    ref_no: await nextRefNo(OfferLetter, organisationId, "OFR"),
    template_key: chosenTemplate,
    accent_color: inherited?.accent_color || null,
    logo_url: inherited?.logo_url || null,
    signature_url: inherited?.signature_url || null,
    company,
    signatory: { name: adminName, designation: req.admin.designation || "" },
    letter_date: new Date(),
    designation: requisition.job_title,
    department: DEPT_LABELS[requisition.department] || requisition.department,
    employment_type: requisition.employment_type,
    work_mode: requisition.work_mode,
    work_location: company.city || "",
    joining_date: joining,
    valid_till: addDaysEndOfDayIst(days),
    ctc,
    sections: cloneSections("OFFER"),
    created_by: req.admin._id,
  });

  await Candidate.updateOne({ _id: candidate._id }, { $set: { offered_salary: ctc.annual_ctc, joining_date: joining } });

  return res.status(201).json({ success: true, data: serialize(offer) });
};

const getCandidateOfferBundle = async (req, res) => {
  const organisationId = req.admin.organisation_id;
  const candidate = await loadCandidate(req.params.candidateId, organisationId);

  let offer = await OfferLetter.findOne({ candidate_id: candidate._id }).sort({ createdAt: -1 });
  if (offer) offer = await expireIfNeeded(offer);
  const appointment = await AppointmentLetter.findOne({ candidate_id: candidate._id });

  let issues = null;
  if (offer && EDITABLE_STATUSES.includes(offer.status)) issues = reviewIssues(offer, candidate, offer, "OFFER");

  return res.status(200).json({
    success: true,
    data: {
      offer: serialize(offer),
      appointment: serialize(appointment),
      issues,
      templates: listTemplates(),
      placeholders: PLACEHOLDERS,
    },
  });
};

const updateOffer = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id);
  if (!EDITABLE_STATUSES.includes(offer.status)) {
    throw fail(400, "Only draft or reviewed offers can be edited. Reopen the offer first");
  }

  applyCommonEdits(offer, req.body);

  if (req.body.valid_till !== undefined) {
    const d = parseEndOfDayIst(req.body.valid_till);
    if (!d) throw fail(400, "Invalid validity date");
    if (d < new Date()) throw fail(400, "Validity date must be in the future");
    offer.valid_till = d;
  }

  recalcCtc(offer, req.body);

  offer.status = "DRAFT";
  offer.reviewed_by = null;
  offer.reviewed_at = null;
  await offer.save();

  if (offer.ctc?.annual_ctc) {
    await Candidate.updateOne({ _id: offer.candidate_id }, { $set: { offered_salary: offer.ctc.annual_ctc, joining_date: offer.joining_date } });
  }

  const candidate = await Candidate.findById(offer.candidate_id);
  return res.status(200).json({ success: true, message: "Offer updated", data: serialize(offer), issues: reviewIssues(offer, candidate, offer, "OFFER") });
};

const uploadLetterAssets = (kind) => async (req, res) => {
  const organisationId = req.admin.organisation_id;
  const doc = kind === "appointment" ? await AppointmentLetter.findOne({ _id: req.params.id, organisation_id: organisationId }) : await loadOffer(req.params.id, organisationId);
  if (!doc) throw fail(404, "Letter not found");
  if (kind === "offer" && !EDITABLE_STATUSES.includes(doc.status)) throw fail(400, "Reopen the offer before changing logo or signature");
  if (kind === "appointment" && doc.status !== "DRAFT") throw fail(400, "Appointment letters that are pending approval or finalized are locked");

  const files = req.files || {};
  const upload = async (file, folder) => {
    const result = await imagekit.upload({
      file: file.buffer.toString("base64"),
      fileName: file.originalname,
      folder,
      useUniqueFileName: true,
      tags: [String(organisationId)],
    });
    return result.url;
  };

  if (files.logo?.[0]) doc.logo_url = await upload(files.logo[0], "/recruitment/letterhead");
  if (files.signature?.[0]) doc.signature_url = await upload(files.signature[0], "/recruitment/signatures");
  if (req.body.remove_logo === "true") doc.logo_url = null;
  if (req.body.remove_signature === "true") doc.signature_url = null;

  await doc.save();
  return res.status(200).json({ success: true, message: "Images updated", data: serialize(doc) });
};

const uploadOfferAssets = uploadLetterAssets("offer");
const uploadAppointmentAssets = uploadLetterAssets("appointment");

const reviewDone = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id);
  if (offer.status !== "DRAFT") throw fail(400, "Only a draft offer can be marked as reviewed");
  const candidate = await Candidate.findById(offer.candidate_id);
  const { missing, unresolved } = reviewIssues(offer, candidate, offer, "OFFER");
  if (missing.length) throw fail(400, `Please fill: ${missing.join(", ")}`);
  if (unresolved.length) throw fail(400, `These placeholders are empty or unknown: ${unresolved.map((u) => `{{${u}}}`).join(", ")}`);
  offer.status = "REVIEW_DONE";
  offer.reviewed_by = req.admin._id;
  offer.reviewed_at = new Date();
  await offer.save();
  return res.status(200).json({ success: true, message: "Offer marked as reviewed", data: serialize(offer) });
};

// Offers are no longer finalized by the person who prepared them. The creator
// sends the letter to a chosen Admin / SuperAdmin (see OfferApproval.controller)
// and only that approver can finalize it, with their own signature.
const finalizeOffer = async () => {
  throw fail(403, "An offer can only be finalized by the approver you send it to. Use 'Send for approval' instead");
};

const reopenOffer = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id);
  if (!["REVIEW_DONE", "FINAL"].includes(offer.status)) throw fail(400, "Only reviewed or final offers that are not yet sent can be reopened");
  if (offer.approval?.status === "APPROVED" && offer.signature_url && offer.signature_url === offer.approval.signature_url) offer.signature_url = null;
  offer.status = "DRAFT";
  offer.reviewed_by = null;
  offer.reviewed_at = null;
  offer.finalized_at = null;
  offer.approval.status = null;
  offer.approval.decided_at = null;
  offer.approval.signature_url = null;
  await offer.save();
  return res.status(200).json({ success: true, message: "Offer reopened for editing", data: serialize(offer) });
};

const downloadOffer = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id);
  const candidate = await Candidate.findById(offer.candidate_id);
  const pdf = await buildPdf({ kind: "OFFER", letter: offer, candidate, offer, watermark: offerWatermark(offer.status), acceptance: offerAcceptance(offer) });
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="Offer_${safeFileName(candidate.full_name)}_${safeFileName(offer.ref_no)}.pdf"`,
    "Cache-Control": "no-store",
  });
  return res.status(200).send(pdf);
};

const sendOfferByEmail = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id, true);
  if (offer.status !== "FINAL") throw fail(400, "Finalize the offer before sending it. Use resend for offers already sent");
  if (new Date(offer.valid_till) < new Date()) throw fail(400, "Offer validity date has passed. Update the validity first");
  const candidate = await Candidate.findById(offer.candidate_id);
  if (!candidate?.email) throw fail(400, "Candidate email is missing");

  ensureToken(offer);
  const pdf = await buildPdf({ kind: "OFFER", letter: offer, candidate, offer, watermark: null, acceptance: null });
  const mail = buildOfferEmail({
    candidateName: candidate.full_name,
    companyName: offer.company.name,
    accent: offer.accent_color || TEMPLATES[offer.template_key]?.accent,
    designation: offer.designation,
    annualCtcText: formatInr(offer.ctc.annual_ctc),
    joiningDate: offer.joining_date,
    validTill: offer.valid_till,
    refNo: offer.ref_no,
    responseUrl: responseUrlFor(offer.token),
  });

  try {
    await sendEmail({
      to: candidate.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [{ filename: `Offer_Letter_${safeFileName(candidate.full_name)}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
  } catch (err) {
    console.error("[offer] send email failed:", err.message);
    throw fail(502, "Email could not be sent. Please check the candidate email and try again");
  }

  await markSent(offer, candidate, "EMAIL");
  return res.status(200).json({ success: true, message: `Offer emailed to ${candidate.email}`, data: serialize(offer) });
};

const sendOfferByWhatsapp = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id, true);
  if (offer.status !== "FINAL") throw fail(400, "Finalize the offer before sending it. Use resend for offers already sent");
  if (new Date(offer.valid_till) < new Date()) throw fail(400, "Offer validity date has passed. Update the validity first");
  const candidate = await Candidate.findById(offer.candidate_id);

  ensureToken(offer);
  const url = whatsappUrl(candidate.phone, offerWhatsappMessage(offer, candidate, responseUrlFor(offer.token)));
  await markSent(offer, candidate, "WHATSAPP");
  return res.status(200).json({ success: true, message: "Offer link prepared for WhatsApp", data: { whatsapp_url: url, offer: serialize(offer) } });
};

const resendOffer = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id, true);
  if (!["SENT", "EXPIRED"].includes(offer.status)) throw fail(400, "Only sent or expired offers can be resent");
  const candidate = await Candidate.findById(offer.candidate_id);
  const channel = req.body.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL";

  if (offer.status === "EXPIRED" || new Date(offer.valid_till) < new Date()) {
    const d = req.body.valid_till ? parseEndOfDayIst(req.body.valid_till) : addDaysEndOfDayIst(7);
    if (!d || d < new Date()) throw fail(400, "Provide a validity date in the future");
    offer.valid_till = d;
  }

  ensureToken(offer);
  offer.resend_count += 1;
  offer.reminder_count = 0;
  offer.last_reminder_at = null;
  offer.sent_at = new Date();
  const url = responseUrlFor(offer.token);

  if (channel === "WHATSAPP") {
    const link = whatsappUrl(candidate.phone, offerWhatsappMessage(offer, candidate, url));
    await markSent(offer, candidate, "WHATSAPP");
    return res.status(200).json({ success: true, message: "Offer link prepared for WhatsApp", data: { whatsapp_url: link, offer: serialize(offer) } });
  }

  const pdf = await buildPdf({ kind: "OFFER", letter: offer, candidate, offer, watermark: null, acceptance: null });
  const mail = buildOfferEmail({
    candidateName: candidate.full_name,
    companyName: offer.company.name,
    accent: offer.accent_color || TEMPLATES[offer.template_key]?.accent,
    designation: offer.designation,
    annualCtcText: formatInr(offer.ctc.annual_ctc),
    joiningDate: offer.joining_date,
    validTill: offer.valid_till,
    refNo: offer.ref_no,
    responseUrl: url,
  });
  try {
    await sendEmail({
      to: candidate.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [{ filename: `Offer_Letter_${safeFileName(candidate.full_name)}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
  } catch (err) {
    console.error("[offer] resend email failed:", err.message);
    throw fail(502, "Email could not be sent. Please try again");
  }
  await markSent(offer, candidate, "EMAIL");
  return res.status(200).json({ success: true, message: `Offer resent to ${candidate.email}`, data: serialize(offer) });
};

const extendOfferValidity = async (req, res) => {
  const offer = await loadOffer(req.params.id, req.admin.organisation_id);
  if (!["SENT", "EXPIRED"].includes(offer.status)) throw fail(400, "Validity can only be extended for sent or expired offers");
  const d = parseEndOfDayIst(req.body.valid_till);
  if (!d || d < new Date()) throw fail(400, "Provide a validity date in the future");
  if (offer.status === "SENT" && d <= new Date(offer.valid_till)) throw fail(400, "New validity must be later than the current one");

  const wasExpired = offer.status === "EXPIRED";
  offer.valid_till = d;
  if (wasExpired) {
    offer.status = "SENT";
    offer.token_used_at = null;
  }
  offer.reminder_count = 0;
  offer.last_reminder_at = null;
  offer.sent_at = new Date();
  await offer.save();

  if (wasExpired) {
    await Candidate.updateOne({ _id: offer.candidate_id, current_stage: "OFFER_EXPIRED" }, { $set: { current_stage: "OFFER_RELEASED" } });
    await syncRequisitionFillStatus(offer.requisition_id);
  }
  return res.status(200).json({ success: true, message: "Offer validity extended", data: serialize(offer) });
};

const joinCandidate = async (req, res) => {
  const organisationId = req.admin.organisation_id;
  const candidate = await loadCandidate(req.params.id, organisationId);

  const offer = await OfferLetter.findOne({ candidate_id: candidate._id }).sort({ createdAt: -1 });
  const legacy = candidate.current_stage === "OFFER_RELEASED" && !offer;
  if (candidate.current_stage !== "OFFER_ACCEPTED" && !legacy) {
    throw fail(400, "Only candidates who have accepted the offer can be marked as joined");
  }

  const joining = req.body.joining_date ? parseDateOnly(req.body.joining_date) : candidate.joining_date || offer?.joining_date;
  if (!joining) throw fail(400, "Joining date is required");

  candidate.current_stage = "JOINED";
  candidate.joining_date = joining;
  await candidate.save();

  if (offer) {
    offer.joining_date = joining;
    await offer.save();
  }

  const requisition = await syncRequisitionFillStatus(candidate.requisition_id);
  return res.status(200).json({
    success: true,
    message: `${candidate.full_name} marked as joined`,
    data: candidate,
    requisition: requisition ? { _id: requisition._id, openings: requisition.openings, filled_count: requisition.filled_count, status: requisition.status } : undefined,
  });
};

const getPublicOffer = async (req, res) => {
  const offer = await OfferLetter.findOne({ token: req.params.token }).select("+token");
  if (!offer) throw fail(404, "This link is invalid or no longer available");
  await expireIfNeeded(offer);
  const candidate = await Candidate.findById(offer.candidate_id).select("full_name");

  const state = offer.status === "SENT" ? "PENDING" : offer.status === "ACCEPTED" || offer.status === "REJECTED" ? "RESPONDED" : offer.status === "EXPIRED" ? "EXPIRED" : "UNAVAILABLE";

  return res.status(200).json({
    success: true,
    data: {
      state,
      response_action: offer.response?.action || null,
      responded_at: offer.response?.at || null,
      candidate_name: candidate?.full_name || "",
      company_name: offer.company?.name || "",
      logo_url: offer.logo_url,
      accent: offer.accent_color || TEMPLATES[offer.template_key]?.accent || "#730042",
      ref_no: offer.ref_no,
      designation: offer.designation,
      department: offer.department,
      employment_type: offer.employment_type,
      work_mode: offer.work_mode,
      work_location: offer.work_location,
      joining_date: offer.joining_date,
      valid_till: offer.valid_till,
      annual_ctc: offer.ctc?.annual_ctc || null,
      change_requests_left: Math.max(0, 5 - (offer.change_requests?.length || 0)),
      reject_reasons: REJECT_REASONS,
    },
  });
};

const getPublicOfferPdf = async (req, res) => {
  const offer = await OfferLetter.findOne({ token: req.params.token }).select("+token");
  if (!offer || !["SENT", "ACCEPTED"].includes(offer.status)) throw fail(404, "This link is invalid or no longer available");
  const candidate = await Candidate.findById(offer.candidate_id);
  const pdf = await buildPdf({ kind: "OFFER", letter: offer, candidate, offer, watermark: null, acceptance: offerAcceptance(offer) });
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="Offer_Letter_${safeFileName(candidate.full_name)}.pdf"`,
    "Cache-Control": "no-store",
  });
  return res.status(200).send(pdf);
};

const respondToPublicOffer = async (req, res) => {
  const { action, accepted_terms, reason, comment, message } = req.body;
  if (!["ACCEPT", "REJECT", "REQUEST_CHANGES"].includes(action)) throw fail(400, "Invalid action");

  const offer = await OfferLetter.findOne({ token: req.params.token }).select("+token");
  if (!offer) throw fail(404, "This link is invalid or no longer available");
  await expireIfNeeded(offer);
  if (offer.status === "EXPIRED") throw fail(410, "This offer has expired. Please contact HR");
  if (offer.status !== "SENT") throw fail(409, "A response has already been recorded for this offer");

  const candidate = await Candidate.findById(offer.candidate_id);
  if (!candidate) throw fail(404, "This link is invalid or no longer available");

  const ip = req.ip || req.headers["x-forwarded-for"] || "";
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 300);
  const now = new Date();

  if (action === "REQUEST_CHANGES") {
    const text = str(message, 1500);
    if (text.length < 5) throw fail(400, "Please write your request in a few words");
    if ((offer.change_requests?.length || 0) >= 5) throw fail(429, "You have reached the limit of change requests. Please contact HR directly");
    offer.change_requests.push({ message: text, requested_at: now, ip: String(ip).slice(0, 60) });
    await offer.save();
    await notifyHr({ offer, candidate, action: "CHANGES", message: text });
    return res.status(200).json({ success: true, message: "Your request has been sent to HR. They will get back to you soon" });
  }

  if (action === "ACCEPT") {
    if (accepted_terms !== true) throw fail(400, "Please confirm that you accept the terms of this offer");
    const updated = await OfferLetter.findOneAndUpdate(
      { _id: offer._id, status: "SENT" },
      { $set: { status: "ACCEPTED", token_used_at: now, "response.action": "ACCEPTED", "response.at": now, "response.ip": String(ip).slice(0, 60), "response.user_agent": userAgent } },
      { new: true }
    );
    if (!updated) throw fail(409, "A response has already been recorded for this offer");
    await Candidate.updateOne({ _id: candidate._id, current_stage: "OFFER_RELEASED" }, { $set: { current_stage: "OFFER_ACCEPTED" } });
    await syncRequisitionFillStatus(offer.requisition_id);
    await notifyHr({ offer: updated, candidate, action: "ACCEPTED" });
    try {
      const mail = buildOfferConfirmationEmail({ candidateName: candidate.full_name, companyName: offer.company.name, accent: offer.accent_color || TEMPLATES[offer.template_key]?.accent, designation: offer.designation, action: "ACCEPTED" });
      await sendEmail({ to: candidate.email, subject: mail.subject, html: mail.html });
    } catch (err) {
      console.error("[offer] confirmation email failed:", err.message);
    }
    return res.status(200).json({ success: true, message: "Offer accepted. Welcome aboard!", data: { action: "ACCEPTED" } });
  }

  const cleanReason = str(reason, 100);
  if (!REJECT_REASONS.includes(cleanReason)) throw fail(400, "Please select a reason");
  const cleanComment = str(comment, 1000);

  const updated = await OfferLetter.findOneAndUpdate(
    { _id: offer._id, status: "SENT" },
    { $set: { status: "REJECTED", token_used_at: now, "response.action": "REJECTED", "response.at": now, "response.ip": String(ip).slice(0, 60), "response.user_agent": userAgent, "response.reason": cleanReason, "response.comment": cleanComment || null } },
    { new: true }
  );
  if (!updated) throw fail(409, "A response has already been recorded for this offer");

  await Candidate.updateOne(
    { _id: candidate._id, current_stage: "OFFER_RELEASED" },
    { $set: { current_stage: "OFFER_REJECTED", rejection_reason: `Offer declined: ${cleanReason}${cleanComment ? ` - ${cleanComment}` : ""}` } }
  );
  await syncRequisitionFillStatus(offer.requisition_id);
  await notifyHr({ offer: updated, candidate, action: "REJECTED", reason: cleanReason, comment: cleanComment });
  try {
    const mail = buildOfferConfirmationEmail({ candidateName: candidate.full_name, companyName: offer.company.name, accent: offer.accent_color || TEMPLATES[offer.template_key]?.accent, designation: offer.designation, action: "REJECTED" });
    await sendEmail({ to: candidate.email, subject: mail.subject, html: mail.html });
  } catch (err) {
    console.error("[offer] confirmation email failed:", err.message);
  }
  return res.status(200).json({ success: true, message: "Your response has been recorded", data: { action: "REJECTED" } });
};

const sendOfferReminder = async (offer) => {
  const withToken = await OfferLetter.findById(offer._id).select("+token");
  const candidate = await Candidate.findById(offer.candidate_id);
  if (!withToken?.token || !candidate?.email) return false;
  const mail = buildOfferReminderEmail({
    candidateName: candidate.full_name,
    companyName: withToken.company?.name,
    accent: withToken.accent_color || TEMPLATES[withToken.template_key]?.accent,
    designation: withToken.designation,
    validTill: withToken.valid_till,
    responseUrl: responseUrlFor(withToken.token),
  });
  await sendEmail({ to: candidate.email, subject: mail.subject, html: mail.html });
  await OfferLetter.updateOne({ _id: offer._id }, { $set: { last_reminder_at: new Date() }, $inc: { reminder_count: 1 } });
  return true;
};

const generateAppointment = async (req, res) => {
  const organisationId = req.admin.organisation_id;
  const candidate = await loadCandidate(req.params.candidateId, organisationId);
  if (candidate.current_stage !== "JOINED") throw fail(400, "Appointment letter can be generated only after the candidate has joined");

  const existing = await AppointmentLetter.findOne({ candidate_id: candidate._id });
  if (existing) return res.status(200).json({ success: true, existing: true, data: serialize(existing) });

  const offer = await OfferLetter.findOne({ candidate_id: candidate._id, status: "ACCEPTED" }).sort({ createdAt: -1 });
  if (!offer) throw fail(400, "No accepted offer letter found for this candidate");

  const adminName = `${req.admin.f_name || ""} ${req.admin.l_name || ""}`.trim();
  const appointment = await AppointmentLetter.create({
    organisation_id: organisationId,
    candidate_id: candidate._id,
    offer_id: offer._id,
    requisition_id: offer.requisition_id,
    ref_no: await nextRefNo(AppointmentLetter, organisationId, "APT"),
    template_key: offer.template_key,
    accent_color: offer.accent_color,
    logo_url: offer.logo_url,
    signature_url: offer.signature_url,
    company: offer.company.toObject ? offer.company.toObject() : offer.company,
    signatory: { name: offer.signatory?.name || adminName, designation: offer.signatory?.designation || req.admin.designation || "" },
    letter_date: new Date(),
    designation: offer.designation,
    department: offer.department,
    employment_type: offer.employment_type,
    work_mode: offer.work_mode,
    work_location: offer.work_location,
    joining_date: candidate.joining_date || offer.joining_date,
    probation_months: offer.probation_months,
    notice_period_days: offer.notice_period_days,
    ctc: offer.ctc,
    sections: cloneSections("APPOINTMENT"),
    created_by: req.admin._id,
  });

  return res.status(201).json({ success: true, data: serialize(appointment) });
};

const loadAppointment = async (id, organisationId, withToken = false) => {
  const q = AppointmentLetter.findOne({ _id: id, organisation_id: organisationId });
  if (withToken) q.select("+share_token");
  const doc = await q;
  if (!doc) throw fail(404, "Appointment letter not found");
  return doc;
};

const updateAppointment = async (req, res) => {
  const doc = await loadAppointment(req.params.id, req.admin.organisation_id);
  if (doc.status !== "DRAFT") throw fail(400, "Appointment letters that are pending approval or finalized are locked");
  applyCommonEdits(doc, req.body);
  await doc.save();
  const candidate = await Candidate.findById(doc.candidate_id);
  const offer = await OfferLetter.findById(doc.offer_id);
  return res.status(200).json({ success: true, message: "Appointment letter updated", data: serialize(doc), issues: reviewIssues(doc, candidate, offer, "APPOINTMENT") });
};

const finalizeAppointment = async () => {
  throw fail(403, "An appointment letter can only be finalized by the approver you send it to. Use 'Send for approval' instead");
};

const appointmentPdf = async (doc, candidate) => {
  const offer = await OfferLetter.findById(doc.offer_id);
  return buildPdf({ kind: "APPOINTMENT", letter: doc, candidate, offer, watermark: doc.status === "FINAL" ? null : "DRAFT", acceptance: null });
};

const downloadAppointment = async (req, res) => {
  const doc = await loadAppointment(req.params.id, req.admin.organisation_id);
  const candidate = await Candidate.findById(doc.candidate_id);
  const pdf = await appointmentPdf(doc, candidate);
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="Appointment_${safeFileName(candidate.full_name)}_${safeFileName(doc.ref_no)}.pdf"`,
    "Cache-Control": "no-store",
  });
  return res.status(200).send(pdf);
};

const sendAppointmentByEmail = async (req, res) => {
  const doc = await loadAppointment(req.params.id, req.admin.organisation_id);
  if (doc.status !== "FINAL") throw fail(400, "Finalize the appointment letter before sending it");
  const candidate = await Candidate.findById(doc.candidate_id);
  if (!candidate?.email) throw fail(400, "Candidate email is missing");
  const pdf = await appointmentPdf(doc, candidate);
  const mail = buildAppointmentEmail({
    candidateName: candidate.full_name,
    companyName: doc.company.name,
    accent: doc.accent_color || TEMPLATES[doc.template_key]?.accent,
    designation: doc.designation,
    joiningDate: doc.joining_date,
    refNo: doc.ref_no,
  });
  try {
    await sendEmail({
      to: candidate.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [{ filename: `Appointment_Letter_${safeFileName(candidate.full_name)}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
  } catch (err) {
    console.error("[appointment] send email failed:", err.message);
    throw fail(502, "Email could not be sent. Please try again");
  }
  doc.sent_at = new Date();
  if (!doc.sent_via.includes("EMAIL")) doc.sent_via.push("EMAIL");
  await doc.save();
  return res.status(200).json({ success: true, message: `Appointment letter emailed to ${candidate.email}`, data: serialize(doc) });
};

const sendAppointmentByWhatsapp = async (req, res) => {
  const doc = await loadAppointment(req.params.id, req.admin.organisation_id, true);
  if (doc.status !== "FINAL") throw fail(400, "Finalize the appointment letter before sending it");
  const candidate = await Candidate.findById(doc.candidate_id);
  if (!doc.share_token) doc.share_token = crypto.randomBytes(32).toString("hex");
  const link = `${req.protocol}://${req.get("host")}/recruitment/public/appointment/${doc.share_token}/pdf`;
  const message = `Hello ${candidate.full_name},\n\nWelcome to ${doc.company.name}! Your appointment letter (${doc.ref_no}) for the position of ${doc.designation} is ready. You can download it here:\n${link}\n\nRegards,\n${doc.signatory?.name || "HR Team"}\n${doc.company.name}`;
  const url = whatsappUrl(candidate.phone, message);
  doc.sent_at = new Date();
  if (!doc.sent_via.includes("WHATSAPP")) doc.sent_via.push("WHATSAPP");
  await doc.save();
  return res.status(200).json({ success: true, message: "Appointment letter link prepared for WhatsApp", data: { whatsapp_url: url, appointment: serialize(doc) } });
};

const getPublicAppointmentPdf = async (req, res) => {
  const doc = await AppointmentLetter.findOne({ share_token: req.params.token }).select("+share_token");
  if (!doc || doc.status !== "FINAL") throw fail(404, "This link is invalid or no longer available");
  const candidate = await Candidate.findById(doc.candidate_id);
  const pdf = await appointmentPdf(doc, candidate);
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="Appointment_Letter_${safeFileName(candidate.full_name)}.pdf"`,
    "Cache-Control": "no-store",
  });
  return res.status(200).send(pdf);
};

module.exports = {
  // helpers shared with OfferApproval.controller
  fail,
  str,
  serialize,
  safeFileName,
  loadOffer,
  loadAppointment,
  buildPdf,
  appointmentPdf,
  reviewIssues,
  getTemplatesMeta,
  previewCtc,
  generateOffer,
  getCandidateOfferBundle,
  updateOffer,
  uploadOfferAssets,
  uploadAppointmentAssets,
  reviewDone,
  finalizeOffer,
  reopenOffer,
  downloadOffer,
  sendOfferByEmail,
  sendOfferByWhatsapp,
  resendOffer,
  extendOfferValidity,
  joinCandidate,
  getPublicOffer,
  getPublicOfferPdf,
  respondToPublicOffer,
  generateAppointment,
  updateAppointment,
  finalizeAppointment,
  downloadAppointment,
  sendAppointmentByEmail,
  sendAppointmentByWhatsapp,
  getPublicAppointmentPdf,
  markOfferExpired,
  sendOfferReminder,
};