const HiringRequisition = require("../Models/Hiringrequisition.model");
const Candidate = require("../Models/candidate.model");

const err = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const REQUISITION_FIELDS = [
  "job_title",
  "department",
  "openings",
  "employment_type",
  "experience_required",
  "skills_required",
  "salary_range",
  "priority",
  "work_mode",
  "job_description",
  "hiring_reason",
  "expected_joining_date",
];

const createRequisition = async (req, res) => {
  const data = {};
  for (const field of REQUISITION_FIELDS) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (!data.job_title || !data.department || !data.openings || !data.employment_type || !data.work_mode || !data.hiring_reason)
    throw err("job_title, department, openings, employment_type, work_mode and hiring_reason are required");

  const requisition = await HiringRequisition.create({
    ...data,
    organisation_id: req.manager.organisation_id,
    requested_by: req.manager._id,
  });
  res.status(201).json({ success: true, message: "Hiring requisition submitted", requisition });
};

const getMyRequisitions = async (req, res) => {
  const requisitions = await HiringRequisition.find({
    organisation_id: req.manager.organisation_id,
    requested_by: req.manager._id,
  }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: requisitions.length, requisitions });
};

const getAllRequisitions = async (req, res) => {
  const requisitions = await HiringRequisition.find({ organisation_id: req.admin.organisation_id })
    .populate("requested_by", "f_name l_name work_email")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: requisitions.length, requisitions });
};

const getPendingRequisitions = async (req, res) => {
  const requisitions = await HiringRequisition.find({
    organisation_id: req.admin.organisation_id,
    status: "PENDING",
  })
    .populate("requested_by", "f_name l_name work_email")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: requisitions.length, requisitions });
};

const getRequisitionById = async (req, res) => {
  const requisition = await HiringRequisition.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  }).populate("requested_by", "f_name l_name work_email");
  if (!requisition) throw err("Requisition not found", 404);
  res.status(200).json({ success: true, requisition });
};

const findRequisitionForAdmin = async (req) => {
  const requisition = await HiringRequisition.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  });
  if (!requisition) throw err("Requisition not found", 404);
  return requisition;
};

const approveRequisition = async (req, res) => {
  const requisition = await findRequisitionForAdmin(req);
  requisition.status = "APPROVED";
  requisition.approved_by = req.admin._id;
  requisition.approved_at = new Date();
  if (req.body.admin_comment !== undefined) requisition.admin_comment = req.body.admin_comment;
  await requisition.save();
  res.status(200).json({ success: true, message: "Requisition approved", requisition });
};

const rejectRequisition = async (req, res) => {
  const requisition = await findRequisitionForAdmin(req);
  requisition.status = "REJECTED";
  requisition.admin_comment = req.body.admin_comment || "";
  await requisition.save();
  res.status(200).json({ success: true, message: "Requisition rejected", requisition });
};

const holdRequisition = async (req, res) => {
  const requisition = await findRequisitionForAdmin(req);
  requisition.status = "ON_HOLD";
  if (req.body.admin_comment !== undefined) requisition.admin_comment = req.body.admin_comment;
  await requisition.save();
  res.status(200).json({ success: true, message: "Requisition put on hold", requisition });
};

const requestRevision = async (req, res) => {
  const requisition = await findRequisitionForAdmin(req);
  if (!req.body.admin_comment) throw err("admin_comment is required to request revision");
  requisition.status = "REVISION_REQUIRED";
  requisition.admin_comment = req.body.admin_comment;
  await requisition.save();
  res.status(200).json({ success: true, message: "Revision requested", requisition });
};

const CANDIDATE_FIELDS = [
  "requisition_id",
  "full_name",
  "email",
  "phone",
  "resume_url",
  "experience",
  "current_company",
  "skills",
  "source",
];

const addCandidate = async (req, res) => {
  const data = {};
  for (const field of CANDIDATE_FIELDS) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (!data.requisition_id || !data.full_name || !data.email)
    throw err("requisition_id, full_name and email are required");

  const requisition = await HiringRequisition.findOne({
    _id: data.requisition_id,
    organisation_id: req.admin.organisation_id,
  });
  if (!requisition) throw err("Requisition not found", 404);

  const candidate = await Candidate.create({
    ...data,
    organisation_id: req.admin.organisation_id,
    added_by: req.admin._id,
  });
  res.status(201).json({ success: true, message: "Candidate added", candidate });
};

const getCandidatesByRequisition = async (req, res) => {
  const candidates = await Candidate.find({
    requisition_id: req.params.requisition_id,
    organisation_id: req.admin.organisation_id,
  }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: candidates.length, candidates });
};

const getCandidateById = async (req, res) => {
  const candidate = await Candidate.findOne({
    _id: req.params.id,
    organisation_id: req.admin.organisation_id,
  }).populate("requisition_id", "job_title department");
  if (!candidate) throw err("Candidate not found", 404);
  res.status(200).json({ success: true, candidate });
};

const findCandidateForAdmin = async (req, idParam = "id") => {
  const candidate = await Candidate.findOne({
    _id: req.params[idParam],
    organisation_id: req.admin.organisation_id,
  });
  if (!candidate) throw err("Candidate not found", 404);
  return candidate;
};

const updateCandidateStage = async (req, res) => {
  const candidate = await findCandidateForAdmin(req);
  const { current_stage, rejection_reason, offered_salary, joining_date, overall_feedback } = req.body;
  if (!current_stage) throw err("current_stage is required");
  candidate.current_stage = current_stage;
  if (rejection_reason !== undefined) candidate.rejection_reason = rejection_reason;
  if (offered_salary !== undefined) candidate.offered_salary = offered_salary;
  if (joining_date !== undefined) candidate.joining_date = joining_date;
  if (overall_feedback !== undefined) candidate.overall_feedback = overall_feedback;
  await candidate.save();
  res.status(200).json({ success: true, message: "Candidate stage updated", candidate });
};

const scheduleInterview = async (req, res) => {
  const candidate = await findCandidateForAdmin(req);
  const { round_type, scheduled_at, next_stage } = req.body;
  if (!round_type || !scheduled_at) throw err("round_type and scheduled_at are required");

  candidate.interview_rounds.push({
    round_number: candidate.interview_rounds.length + 1,
    round_type,
    scheduled_at,
    conducted_by: req.body.conducted_by || null,
  });
  if (next_stage) candidate.current_stage = next_stage;
  await candidate.save();
  res.status(201).json({ success: true, message: "Interview scheduled", candidate });
};

const submitInterviewFeedback = async (req, res) => {
  const candidate = await findCandidateForAdmin(req, "candidateId");
  const round = candidate.interview_rounds.id(req.params.roundId);
  if (!round) throw err("Interview round not found", 404);

  const { feedback, score, outcome } = req.body;
  if (feedback !== undefined) round.feedback = feedback;
  if (score !== undefined) round.score = score;
  if (outcome !== undefined) round.outcome = outcome;
  round.conducted_by = req.admin._id;

  await candidate.save();
  res.status(200).json({ success: true, message: "Interview feedback submitted", candidate });
};

module.exports = {
  createRequisition,
  getMyRequisitions,
  getAllRequisitions,
  getPendingRequisitions,
  getRequisitionById,
  approveRequisition,
  rejectRequisition,
  holdRequisition,
  requestRevision,
  addCandidate,
  getCandidatesByRequisition,
  getCandidateById,
  updateCandidateStage,
  scheduleInterview,
  submitInterviewFeedback,
};