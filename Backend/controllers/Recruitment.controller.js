const HiringRequisition = require("../Models/Hiringrequisition.model");
const Candidate = require("../Models/candidate.model");
const OfferLetter = require("../Models/offerletter.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");
const { syncRequisitionFillStatus } = require("../utils/recruitment/pipeline.utils");
const { sendEmail } = require("../utils/nodemailer.utils");
const { buildInterviewInviteEmail, buildInterviewerInviteEmail, buildInterviewIcs } = require("../utils/recruitment/offerMail.utils");

const STAGE_ORDER = {
  APPLIED: ["SCREENING", "REJECTED"],
  SCREENING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["HR_ROUND", "SELECTED", "REJECTED"],
  HR_ROUND: ["SELECTED", "REJECTED"],
  SELECTED: ["OFFER_RELEASED"],
  OFFER_RELEASED: ["OFFER_ACCEPTED", "OFFER_REJECTED", "OFFER_EXPIRED", "JOINED"],
  OFFER_ACCEPTED: ["JOINED"],
  OFFER_REJECTED: [],
  OFFER_EXPIRED: ["OFFER_RELEASED"],
  JOINED: [],
  REJECTED: [],
};

const OFFER_MANAGED_STAGES = ["OFFER_RELEASED", "OFFER_ACCEPTED", "OFFER_REJECTED", "OFFER_EXPIRED", "JOINED"];

const createRequisition = async (req, res) => {
  const {
    job_title, department, openings, employment_type, experience_required,
    skills_required, salary_range, priority, work_mode, job_description,
    hiring_reason, expected_joining_date,
  } = req.body;

  const requisition = await HiringRequisition.create({
    organisation_id: req.manager.organisation_id,
    requested_by: req.manager._id,
    job_title, department, openings, employment_type, experience_required,
    skills_required, salary_range, priority, work_mode, job_description,
    hiring_reason, expected_joining_date,
  });

  return res.status(201).json({ success: true, data: requisition });
};

const getMyRequisitions = async (req, res) => {
  const { status } = req.query;

  const filter = {
    requested_by: req.manager._id,
    organisation_id: req.manager.organisation_id,
  };

  if (status) filter.status = status;

  const requisitions = await HiringRequisition.find(filter)
    .populate("approved_by", "f_name l_name work_email")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: requisitions });
};

const getAllRequisitions = async (req, res) => {
  const { status, department, priority } = req.query;

  const filter = { organisation_id: req.admin.organisation_id };

  if (status) filter.status = status;
  if (department) filter.department = department;
  if (priority) filter.priority = priority;

  const requisitions = await HiringRequisition.find(filter)
    .populate("requested_by", "f_name l_name work_email department designation")
    .populate("approved_by", "f_name l_name work_email")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: requisitions });
};

const getPendingRequisitions = async (req, res) => {
  const requisitions = await HiringRequisition.find({
    organisation_id: req.admin.organisation_id,
    status: "PENDING",
  })
    .populate("requested_by", "f_name l_name work_email department designation")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, count: requisitions.length, data: requisitions });
};

const getRequisitionById = async (req, res) => {
  const requisition = await HiringRequisition.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  })
    .populate("requested_by", "f_name l_name work_email department designation")
    .populate("approved_by", "f_name l_name work_email");

  if (!requisition) {
    return res.status(404).json({ success: false, message: "Requisition not found" });
  }

  const candidates = await Candidate.find({
    requisition_id: req.params.id,
    organisation_id: req.admin.organisation_id,
  }).select("full_name email phone skills experience current_stage source current_company createdAt");

  const stage_summary = await Candidate.aggregate([
    { $match: { requisition_id: requisition._id, organisation_id: requisition.organisation_id } },
    { $group: { _id: "$current_stage", count: { $sum: 1 } } },
  ]);

  return res.status(200).json({ success: true, data: { requisition, candidates, stage_summary } });
};

const approveRequisition = async (req, res) => {
  const requisition = await HiringRequisition.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
    status: "PENDING",
  });

  if (!requisition) {
    return res.status(404).json({ success: false, message: "Requisition not found or not pending" });
  }

  requisition.status = "APPROVED";
  requisition.approved_by = req.admin._id;
  requisition.approved_at = new Date();
  if (req.body.admin_comment) requisition.admin_comment = req.body.admin_comment;

  await requisition.save();

  return res.status(200).json({ success: true, message: "Requisition approved", data: requisition });
};

const rejectRequisition = async (req, res) => {
  const { admin_comment } = req.body;

  if (!admin_comment) {
    return res.status(400).json({ success: false, message: "Rejection reason is required" });
  }

  const requisition = await HiringRequisition.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
    status: "PENDING",
  });

  if (!requisition) {
    return res.status(404).json({ success: false, message: "Requisition not found or not pending" });
  }

  requisition.status = "REJECTED";
  requisition.admin_comment = admin_comment;
  requisition.approved_by = req.admin._id;

  await requisition.save();

  return res.status(200).json({ success: true, message: "Requisition rejected", data: requisition });
};

const holdRequisition = async (req, res) => {
  const requisition = await HiringRequisition.findOneAndUpdate(
    { _id: req.params.id, organisation_id: req.admin.organisation_id, status: "PENDING" },
    { status: "ON_HOLD", admin_comment: req.body.admin_comment || "" },
    { new: true }
  );

  if (!requisition) {
    return res.status(404).json({ success: false, message: "Requisition not found or not pending" });
  }

  return res.status(200).json({ success: true, message: "Requisition put on hold", data: requisition });
};

const requestRevision = async (req, res) => {
  const { admin_comment } = req.body;

  if (!admin_comment) {
    return res.status(400).json({ success: false, message: "Revision notes are required" });
  }

  const requisition = await HiringRequisition.findOneAndUpdate(
    { _id: req.params.id, organisation_id: req.admin.organisation_id, status: "PENDING" },
    { status: "REVISION_REQUIRED", admin_comment },
    { new: true }
  );

  if (!requisition) {
    return res.status(404).json({ success: false, message: "Requisition not found or not pending" });
  }

  return res.status(200).json({ success: true, message: "Revision requested", data: requisition });
};

const addCandidate = async (req, res) => {
  const {
    requisition_id, full_name, email, phone, resume_url,
    experience, current_company, skills, source,
  } = req.body;

  const requisition = await HiringRequisition.findOne({
    _id: requisition_id,
    organisation_id: req.admin.organisation_id,
    status: "APPROVED",
  });

  if (!requisition) {
    return res.status(404).json({
      success: false,
      message: "Approved requisition not found, or all openings for this requisition are already filled",
    });
  }

  const existing = await Candidate.findOne({
    requisition_id,
    organisation_id: req.admin.organisation_id,
    email: email.toLowerCase(),
  });
  if (existing) {
    return res.status(409).json({ success: false, message: "Candidate with this email already exists in this pipeline" });
  }

  const candidate = await Candidate.create({
    organisation_id: requisition.organisation_id,
    requisition_id,
    full_name, email, phone, resume_url, experience, current_company, skills, source,
    added_by: req.admin._id,
  });

  return res.status(201).json({ success: true, message: "Candidate added", data: candidate });
};

const getCandidatesByRequisition = async (req, res) => {
  const { stage } = req.query;

  const filter = {
    requisition_id: req.params.requisition_id,
    organisation_id: req.admin.organisation_id,
  };

  if (stage) filter.current_stage = stage;

  const candidates = await Candidate.find(filter)
    .populate("added_by", "f_name l_name")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, count: candidates.length, data: candidates });
};

const getCandidateById = async (req, res) => {
  const candidate = await Candidate.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  })
    .populate("requisition_id", "job_title department employment_type skills_required")
    .populate("added_by", "f_name l_name work_email")
    .populate("interview_rounds.conducted_by", "f_name l_name");

  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  return res.status(200).json({ success: true, data: candidate });
};

const updateCandidateStage = async (req, res) => {
  const { stage, rejection_reason, overall_feedback } = req.body;

  const candidate = await Candidate.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  });

  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  const allowed = STAGE_ORDER[candidate.current_stage] || [];

  if (!allowed.includes(stage)) {
    return res.status(400).json({
      success: false,
      message: `Cannot move from ${candidate.current_stage} to ${stage}. Allowed next: ${allowed.join(", ") || "none"}`,
    });
  }

  if (OFFER_MANAGED_STAGES.includes(stage)) {
    const hasOffer = await OfferLetter.exists({ candidate_id: candidate._id });
    const legacyJoin = stage === "JOINED" && candidate.current_stage === "OFFER_RELEASED" && !hasOffer;
    if (!legacyJoin) {
      return res.status(400).json({
        success: false,
        message: "This step is handled from the Offer tab (generate, send, accept/reject and join)",
      });
    }
  }

  candidate.current_stage = stage;
  if (overall_feedback) candidate.overall_feedback = overall_feedback;
  if (stage === "REJECTED" && rejection_reason) candidate.rejection_reason = rejection_reason;

  await candidate.save();

  const requisition = await syncRequisitionFillStatus(candidate.requisition_id);

  return res.status(200).json({
    success: true,
    message: `Candidate moved to ${stage}`,
    data: candidate,
    requisition: requisition
      ? { _id: requisition._id, openings: requisition.openings, filled_count: requisition.filled_count, status: requisition.status }
      : undefined,
  });
};

const ROUND_TYPES = ["Screening", "Technical", "HR Round", "Final Round", "Other"];
const ROUND_MODES = ["Online", "In-person", "Phone"];

const cleanText = (v, max) => String(v ?? "").trim().slice(0, max);

const isHttpUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Sends the invite to the candidate (with a calendar file) and, when an
// interviewer is assigned, a heads-up to the interviewer as well. Never throws:
// the round is already saved, so a mail problem is reported back, not fatal.
const sendRoundInvites = async ({ candidate, round, orgId, hrAdmin }) => {
  const result = { candidate: false, interviewer: false, errors: [] };
  const [org, requisition, interviewer] = await Promise.all([
    SuperAdmin.findById(orgId).select("organisation_name").lean(),
    HiringRequisition.findById(candidate.requisition_id).select("job_title").lean(),
    round.conducted_by ? Admin.findOne({ _id: round.conducted_by, organisation_id: orgId }).select("f_name l_name work_email").lean() : null,
  ]);

  const companyName = org?.organisation_name || "TorchX Talent";
  const designation = requisition?.job_title || "the open position";
  const roundLabel = `Round ${round.round_number} - ${round.round_type}`;
  const interviewerName = interviewer ? `${interviewer.f_name || ""} ${interviewer.l_name || ""}`.trim() : "";
  const hrName = hrAdmin ? `${hrAdmin.f_name || ""} ${hrAdmin.l_name || ""}`.trim() : "";
  const hrEmail = hrAdmin?.work_email || hrAdmin?.email || "";
  const where = round.mode === "Online" ? round.meeting_link : round.mode === "In-person" ? round.location : "Phone call";
  const common = {
    companyName,
    designation,
    roundLabel,
    scheduledAt: round.scheduled_at,
    durationMinutes: round.duration_minutes,
    mode: round.mode,
    platform: round.mode === "Online" ? round.meeting_platform : "",
    meetingLink: round.mode === "Online" ? round.meeting_link : "",
    location: round.mode === "In-person" ? round.location : "",
    instructions: round.instructions,
  };

  const ics = buildInterviewIcs({
    uid: String(round._id),
    title: `${roundLabel}: ${designation} at ${companyName}`,
    description: [round.mode === "Online" && round.meeting_link ? `Join: ${round.meeting_link}` : "", round.instructions].filter(Boolean).join("\n"),
    location: where,
    start: round.scheduled_at,
    durationMinutes: round.duration_minutes || 45,
    organizerEmail: hrEmail,
  });
  const attachments = [{ filename: "interview.ics", content: ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" }];

  const sentTo = [];
  try {
    const mail = buildInterviewInviteEmail({ candidateName: candidate.full_name, interviewerName, hrName, hrEmail, ...common });
    await sendEmail({ to: candidate.email, subject: mail.subject, html: mail.html, attachments, ...(hrEmail && { replyTo: hrEmail }) });
    result.candidate = true;
    sentTo.push(candidate.email);
  } catch (err) {
    console.error("[interview] candidate invite failed:", err.message);
    result.errors.push("candidate");
  }

  if (interviewer?.work_email) {
    try {
      const mail = buildInterviewerInviteEmail({ interviewerName, candidateName: candidate.full_name, candidateEmail: candidate.email, ...common });
      await sendEmail({ to: interviewer.work_email, subject: mail.subject, html: mail.html, attachments });
      result.interviewer = true;
      sentTo.push(interviewer.work_email);
    } catch (err) {
      console.error("[interview] interviewer invite failed:", err.message);
      result.errors.push("interviewer");
    }
  }

  if (sentTo.length) {
    round.invite_sent_at = new Date();
    round.invite_sent_to = sentTo;
  }
  return result;
};

const inviteMessage = (base, mail) => {
  if (!mail.candidate) return `${base}, but the invitation email could not be sent. Use "Resend invite" to try again`;
  return `${base} and invitation emailed to the candidate${mail.interviewer ? " and interviewer" : ""}`;
};

const scheduleInterview = async (req, res) => {
  const { round_type, scheduled_at, conducted_by } = req.body;

  if (!ROUND_TYPES.includes(round_type)) {
    return res.status(400).json({ success: false, message: "Please choose a valid round type" });
  }
  const when = new Date(scheduled_at);
  if (!scheduled_at || Number.isNaN(when.getTime())) {
    return res.status(400).json({ success: false, message: "Please choose a valid date and time" });
  }
  const mode = ROUND_MODES.includes(req.body.mode) ? req.body.mode : "Online";
  const meeting_link = cleanText(req.body.meeting_link, 500);
  const location = cleanText(req.body.location, 300);
  if (mode === "Online" && !isHttpUrl(meeting_link)) {
    return res.status(400).json({ success: false, message: "Please add a valid meeting link (starting with https://) for an online round" });
  }
  if (mode === "In-person" && !location) {
    return res.status(400).json({ success: false, message: "Please add the venue for an in-person round" });
  }
  const duration = Number(req.body.duration_minutes) || 45;
  if (duration < 5 || duration > 480) {
    return res.status(400).json({ success: false, message: "Duration must be between 5 and 480 minutes" });
  }

  const candidate = await Candidate.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  });

  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  let interviewerId = null;
  if (conducted_by) {
    const ok = await Admin.exists({ _id: conducted_by, organisation_id: req.admin.organisation_id });
    if (!ok) return res.status(400).json({ success: false, message: "Selected interviewer was not found" });
    interviewerId = conducted_by;
  }

  const round_number = candidate.interview_rounds.length + 1;
  candidate.interview_rounds.push({
    round_number,
    round_type,
    scheduled_at: when,
    conducted_by: interviewerId,
    duration_minutes: duration,
    mode,
    meeting_platform: mode === "Online" ? cleanText(req.body.meeting_platform, 60) : "",
    meeting_link: mode === "Online" ? meeting_link : "",
    location: mode === "In-person" ? location : "",
    instructions: cleanText(req.body.instructions, 2000),
  });
  await candidate.save();

  const round = candidate.interview_rounds[candidate.interview_rounds.length - 1];
  const mail = await sendRoundInvites({ candidate, round, orgId: req.admin.organisation_id, hrAdmin: req.admin });
  await candidate.save();

  return res.status(200).json({
    success: true,
    message: inviteMessage(`Round ${round_number} scheduled`, mail),
    mail,
    data: round,
  });
};

const resendInterviewInvite = async (req, res) => {
  const candidate = await Candidate.findOne({
    _id: req.params.candidateId,
    organisation_id: req.admin.organisation_id,
  });
  if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });

  const round = candidate.interview_rounds.id(req.params.roundId);
  if (!round) return res.status(404).json({ success: false, message: "Interview round not found" });
  if (round.outcome !== "Pending") {
    return res.status(400).json({ success: false, message: "This round is already completed" });
  }

  const mail = await sendRoundInvites({ candidate, round, orgId: req.admin.organisation_id, hrAdmin: req.admin });
  await candidate.save();
  return res.status(200).json({ success: mail.candidate, message: inviteMessage("Invite resent", mail), mail, data: round });
};

const submitInterviewFeedback = async (req, res) => {
  const { feedback, score, outcome } = req.body;

  const candidate = await Candidate.findOne({
    _id: req.params.candidateId,
    organisation_id: req.admin.organisation_id,
  });

  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  const round = candidate.interview_rounds.id(req.params.roundId);

  if (!round) {
    return res.status(404).json({ success: false, message: "Interview round not found" });
  }

  round.feedback = feedback;
  round.score = score;
  round.outcome = outcome;

  await candidate.save();

  return res.status(200).json({ success: true, message: "Feedback saved", data: round });
};

module.exports = {
  createRequisition, getMyRequisitions, getAllRequisitions, getPendingRequisitions,
  getRequisitionById, approveRequisition, rejectRequisition, holdRequisition,
  requestRevision, addCandidate, getCandidatesByRequisition, getCandidateById,
  updateCandidateStage, scheduleInterview, resendInterviewInvite, submitInterviewFeedback,
};