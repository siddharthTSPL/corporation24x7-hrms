const HiringRequisition = require("../Models/Hiringrequisition.model");
const Candidate = require("../Models/candidate.model");

const STAGE_ORDER = {
  APPLIED: ["SCREENING", "REJECTED"],
  SCREENING: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["HR_ROUND", "SELECTED", "REJECTED"],
  HR_ROUND: ["SELECTED", "REJECTED"],
  SELECTED: ["OFFER_RELEASED"],
  OFFER_RELEASED: ["JOINED"],
  JOINED: [],
  REJECTED: [],
};

// Stages that count as an "opening" being filled.
const FILLED_STAGES = ["SELECTED", "OFFER_RELEASED", "JOINED"];

// Recomputes filled_count for a requisition from its candidates and
// keeps requisition.status in sync (APPROVED <-> FILLED) whenever the
// number of filled openings changes. This is what makes "openings"
// actually go down when a candidate is marked SELECTED.
const syncRequisitionFillStatus = async (requisitionId) => {
  const requisition = await HiringRequisition.findById(requisitionId);
  if (!requisition) return null;

  const filled_count = await Candidate.countDocuments({
    requisition_id: requisitionId,
    current_stage: { $in: FILLED_STAGES },
  });

  requisition.filled_count = filled_count;

  // Only auto-manage the FILLED <-> APPROVED transition. Don't touch
  // requisitions that are PENDING / REJECTED / ON_HOLD / REVISION_REQUIRED.
  if (["APPROVED", "FILLED"].includes(requisition.status)) {
    requisition.status = filled_count >= requisition.openings ? "FILLED" : "APPROVED";
  }

  await requisition.save();
  return requisition;
};

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

const scheduleInterview = async (req, res) => {
  const { round_type, scheduled_at, conducted_by } = req.body;

  const candidate = await Candidate.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  });

  if (!candidate) {
    return res.status(404).json({ success: false, message: "Candidate not found" });
  }

  const round_number = candidate.interview_rounds.length + 1;
  candidate.interview_rounds.push({ round_number, round_type, scheduled_at, conducted_by });
  await candidate.save();

  return res.status(200).json({
    success: true,
    message: `Round ${round_number} scheduled`,
    data: candidate.interview_rounds[candidate.interview_rounds.length - 1],
  });
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
  updateCandidateStage, scheduleInterview, submitInterviewFeedback,
};