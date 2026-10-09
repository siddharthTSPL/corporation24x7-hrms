const axios = require("axios");
const Training = require("../Models/training.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");
const imagekit = require("../utils/imagekit.utils");
const { sendEmail } = require("../utils/nodemailer.utils");
const { createBulkNotifications } = require("../utils/Notification.utils");
const { validateTemplate, fillCertificate, createDefaultCertificate } = require("../utils/trainingCertificate.utils");
const { buildTrainingEmail, dateTime } = require("../utils/trainingEmail.utils");

const PERSON_MODELS = { User, Manager, Admin };
const actorModel = (req) => req.actor?.recipientModel;
const isAdmin = (req) => actorModel(req) === "Admin" && req.tokenPayload?.role !== "super_admin";
const isSuper = (req) => req.tokenPayload?.role === "super_admin";
const orgId = (req) => isSuper(req) ? req.user?._id : (req.user?.organisation_id || req.user?._id);
const personLabel = (p) => `${p.f_name || ""} ${p.l_name || ""}`.trim();
const respondError = (res, status, message) => res.status(status).json({ success: false, message });
const actorStamp = (req) => ({ actor_id: req.actor.id, actor_model: req.actor.recipientModel });

async function getPerson(ref, organisation_id) {
  const Model = PERSON_MODELS[ref?.model];
  if (!Model) return null;
  return Model.findOne({ _id: ref.id, organisation_id, working_status: "working" }).select("f_name l_name work_email organisation_id").lean();
}

async function notifyPeople(training, title, message) {
  await createBulkNotifications({
    recipients: [
      { recipientModel: training.trainer.model, recipientId: training.trainer.id },
      { recipientModel: training.trainee.model, recipientId: training.trainee.id },
    ], organisation_id: training.organisation_id, type: "training", title, message, link: "/training",
  });
}

async function sendBestEffortEmail(to, subject, content, attachments) {
  try { await sendEmail({ to, subject, html: content.html, text: content.text, attachments }); }
  catch (error) { console.error("[training] email delivery failed:", error.message); }
}

async function getCompany(organisation_id) {
  return SuperAdmin.findById(organisation_id).select("organisation_name company_address profile_image").lean();
}

async function getBrandImage(url, label) {
  if (!url) throw new Error(`Upload an organisation logo and authorised signature in Certificate setup before approval.`);
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 10000, maxContentLength: 2 * 1024 * 1024 });
    const bytes = Buffer.from(response.data);
    const valid = (bytes[0] === 0x89 && bytes[1] === 0x50) || (bytes[0] === 0xff && bytes[1] === 0xd8);
    if (!valid) throw new Error("Unsupported image format");
    return bytes;
  } catch {
    throw new Error(`${label} image could not be loaded. Please upload it again in Certificate setup.`);
  }
}

exports.listEmployees = async (req, res) => {
  if (!isAdmin(req)) return respondError(res, 403, "Admin access required");
  const organisation_id = orgId(req);
  const results = await Promise.all(Object.entries(PERSON_MODELS).map(async ([model, Model]) =>
    (await Model.find({ organisation_id, working_status: "working" }).select("f_name l_name empid work_email").lean())
      .map((p) => ({ id: p._id, model, name: personLabel(p), empid: p.empid, email: p.work_email }))));
  res.json({ success: true, employees: results.flat() });
};

exports.list = async (req, res) => {
  let filter = {};
  if (isAdmin(req)) filter.organisation_id = orgId(req);
  else if (isSuper(req)) filter.organisation_id = orgId(req);
  else {
    filter.organisation_id = orgId(req);
    filter.$or = [{ "trainee.id": req.actor.id, "trainee.model": actorModel(req) }, { "trainer.id": req.actor.id, "trainer.model": actorModel(req) }];
  }
  const records = await Training.find(filter).sort({ createdAt: -1 }).lean();
  const withParticipants = await Promise.all(records.map(async (t) => {
    const [trainee, trainer] = await Promise.all([
      getPerson(t.trainee, t.organisation_id), getPerson(t.trainer, t.organisation_id),
    ]);
    return { ...t, participant_details: { trainee: trainee ? personLabel(trainee) : "Unavailable", trainer: trainer ? personLabel(trainer) : "Unavailable" } };
  }));
  const privateRecords = withParticipants.map((t) => ({ ...t, certificate: { ...t.certificate, url: "" } }));
  const organisation = await SuperAdmin.findById(orgId(req)).select("organisation_name profile_image company_address").lean();
  const organisationDetails = organisation ? { name: organisation.organisation_name, logo: organisation.profile_image || "", address: organisation.company_address || "" } : null;
  res.json({ success: true, organisation: organisationDetails, trainings: privateRecords });
};

exports.report = async (req, res) => {
  if (!isAdmin(req) && !isSuper(req)) return respondError(res, 403, "Admin access required");
  const records = await Training.find({ organisation_id: orgId(req) }).select("status mandatory due_at trainee stages estimated_hours").lean();
  const people = await Promise.all(Object.entries(PERSON_MODELS).map(async ([model, Model]) => {
    const ids = records.filter((record) => record.trainee.model === model).map((record) => record.trainee.id);
    return Model.find({ _id: { $in: ids }, organisation_id: orgId(req) }).select("_id department").lean();
  }));
  const departmentById = new Map(people.flat().map((person) => [String(person._id), person.department || "Unassigned"]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const active = records.filter((record) => record.status !== "approved");
  const overdueRecords = active.filter((record) => record.due_at && new Date(record.due_at) < today);
  const overdueIds = new Set(overdueRecords.map((record) => String(record._id)));
  const byDepartment = new Map();
  const byLevel = [0, 1, 2].map((index) => ({ level: `L${index + 1}`, passed: 0, attempts: 0, scoreTotal: 0, scored: 0 }));
  for (const record of records) {
    const department = departmentById.get(String(record.trainee.id)) || "Unassigned";
    const dept = byDepartment.get(department) || { department, assigned: 0, completed: 0, overdue: 0 };
    dept.assigned += 1;
    if (record.status === "approved") dept.completed += 1;
    if (overdueIds.has(String(record._id))) dept.overdue += 1;
    byDepartment.set(department, dept);
    (record.stages || []).forEach((stage, index) => {
      if (!byLevel[index]) return;
      if (stage.review_status === "passed" || stage.completed_at) byLevel[index].passed += 1;
      byLevel[index].attempts += stage.attempt_count || (stage.submitted_at ? 1 : 0);
      if (stage.score !== null && stage.score !== undefined) { byLevel[index].scoreTotal += stage.score; byLevel[index].scored += 1; }
    });
  }
  const completed = records.filter((record) => record.status === "approved").length;
  const expiryHorizon = new Date();
  expiryHorizon.setDate(expiryHorizon.getDate() + 30);
  const certificatesExpiring = await Training.countDocuments({ organisation_id: orgId(req), status: "approved", "certificate.valid_until": { $gte: new Date(), $lte: expiryHorizon } });
  res.json({ success: true, report: {
    summary: { assigned: records.length, active: active.length, awaitingApproval: records.filter((record) => record.status === "pending_approval").length, completed, overdue: overdueRecords.length, mandatory: records.filter((record) => record.mandatory).length, certificatesExpiring, completionRate: records.length ? Math.round((completed / records.length) * 100) : 0 },
    byDepartment: [...byDepartment.values()].sort((a, b) => a.department.localeCompare(b.department)),
    byLevel: byLevel.map(({ scoreTotal, scored, ...level }) => ({ ...level, averageScore: scored ? Math.round(scoreTotal / scored) : null })),
  } });
};

exports.create = async (req, res) => {
  if (!isAdmin(req)) return respondError(res, 403, "Admin access required");
  const { title, details = "", trainee, trainer } = req.body;
  if (!String(title || "").trim() || !trainee?.id || !trainer?.id) return respondError(res, 400, "Title, trainee and trainer are required");
  if (String(trainee.id) === String(trainer.id) && trainee.model === trainer.model) return respondError(res, 400, "Trainee and trainer must be different employees");
  const organisation_id = orgId(req);
  const [traineePerson, trainerPerson] = await Promise.all([getPerson(trainee, organisation_id), getPerson(trainer, organisation_id)]);
  if (!traineePerson || !trainerPerson) return respondError(res, 400, "Choose active trainee and trainer from your organisation");
  const stageDetails = Array.isArray(req.body.stages) ? req.body.stages : [];
  if (stageDetails.length && stageDetails.length !== 3) return respondError(res, 400, "Configure all three learning levels, L1 through L3.");
  if (stageDetails.some((stage) => !String(stage.objective || "").trim())) return respondError(res, 400, "Add a learning objective for each level.");
  if (stageDetails.some((stage) => !["none", "quiz", "practical", "attendance"].includes(stage.assessment_type))) return respondError(res, 400, "Choose a valid assessment type for every level.");
  if (stageDetails.some((stage) => Number(stage.pass_score) < 0 || Number(stage.pass_score) > 100)) return respondError(res, 400, "Pass scores must be between 0 and 100.");
  const due_at = req.body.due_at ? new Date(req.body.due_at) : null;
  if (due_at && (Number.isNaN(due_at.getTime()) || due_at.getTime() < Date.now())) return respondError(res, 400, "Training due date must be today or in the future.");
  const stageCodes = ["T1", "T2", "T3"];
  const stages = stageCodes.map((code, index) => {
    const stage = stageDetails[index] || {};
    return {
      code,
      objective: String(stage.objective || "").trim(),
      materials_url: String(stage.materials_url || "").trim(),
      assessment_type: stage.assessment_type || "none",
      pass_score: Math.max(0, Math.min(100, Number(stage.pass_score) || 0)),
    };
  });
  if (stages.some((stage) => stage.materials_url && !/^https?:\/\//i.test(stage.materials_url))) return respondError(res, 400, "Learning material links must use http or https.");
  if (stages.some((stage) => stage.assessment_type === "quiz" && stage.pass_score < 1)) return respondError(res, 400, "Set a passing score between 1 and 100 for every quiz level.");
  const skills = [...new Set((Array.isArray(req.body.skills) ? req.body.skills : []).map((skill) => String(skill).trim()).filter(Boolean))].slice(0, 20);
  const estimated_hours = Number(req.body.estimated_hours) || 0;
  const certificate_validity_months = Number(req.body.certificate_validity_months) || 0;
  if (estimated_hours < 0 || estimated_hours > 500) return respondError(res, 400, "Estimated duration must be between 0 and 500 hours.");
  if (certificate_validity_months < 0 || certificate_validity_months > 120) return respondError(res, 400, "Certificate validity must be between 0 and 120 months.");
  const training = await Training.create({ organisation_id, title: title.trim(), details, trainee, trainer,
    category: String(req.body.category || "General").trim().slice(0, 80), mandatory: req.body.mandatory === true,
    due_at, estimated_hours, certificate_validity_months, skills, stages,
    audit: [{ action: "assigned", ...actorStamp(req), details: { category: String(req.body.category || "General"), due_at, mandatory: req.body.mandatory === true } }] });
  await notifyPeople(training, "Training assigned", `${training.title} has been assigned to you.`);
  const company = await getCompany(organisation_id);
  const commonRows = [["Trainee", personLabel(traineePerson)], ["Trainer", personLabel(trainerPerson)], ["Programme", "Three learning levels: L1, L2 and L3"], ["Due date", dateTime(due_at)], ["Mandatory", req.body.mandatory === true ? "Yes" : "No"]];
  await Promise.all([
    [trainerPerson, "Trainer", "You have been assigned as the trainer for this learning programme."],
    [traineePerson, "Trainee", "You have been enrolled in this learning programme."],
  ].map(([person, role, intro]) => sendBestEffortEmail(person.work_email,
    `${training.title} · Training assignment · ${company?.organisation_name || "Your organisation"}`,
    buildTrainingEmail({ companyName: company?.organisation_name, recipientName: personLabel(person), heading: "A training programme has been assigned", intro, training,
      rows: [["Your role", role], ...commonRows], action: "Your assigned training and future session updates are available in the Training section of your HRMS." }),
  )));
  res.status(201).json({ success: true, training });
};

exports.updateDetails = async (req, res) => {
  if (!isAdmin(req)) return respondError(res, 403, "Admin access required");
  const training = await Training.findOne({ _id: req.params.id, organisation_id: orgId(req) });
  if (!training) return respondError(res, 404, "Training not found");
  if (["pending_approval", "approved"].includes(training.status)) return respondError(res, 409, "Training details are locked after completion submission");
  const title = String(req.body.title || "").trim();
  const details = String(req.body.details || "");
  if (!title || title.length > 160 || details.length > 4000) return respondError(res, 400, "Enter a title (max 160 characters) and details (max 4,000 characters)");
  const due_at = req.body.due_at ? new Date(req.body.due_at) : null;
  if (due_at && (Number.isNaN(due_at.getTime()) || due_at.getTime() < Date.now())) return respondError(res, 400, "Training due date must be today or in the future.");
  const estimated_hours = Number(req.body.estimated_hours) || 0;
  const certificate_validity_months = Number(req.body.certificate_validity_months) || 0;
  if (estimated_hours < 0 || estimated_hours > 500 || certificate_validity_months < 0 || certificate_validity_months > 120) return respondError(res, 400, "Check the estimated hours and certificate validity values.");
  if (Array.isArray(req.body.stages)) {
    if (req.body.stages.length !== 3) return respondError(res, 400, "Keep exactly three levels: L1, L2 and L3.");
    if (req.body.stages.some((stage) => !["none", "quiz", "practical", "attendance"].includes(stage.assessment_type))) return respondError(res, 400, "Choose a valid assessment type for every level.");
    if (req.body.stages.some((stage) => Number(stage.pass_score) < 0 || Number(stage.pass_score) > 100)) return respondError(res, 400, "Pass scores must be between 0 and 100.");
    const stages = req.body.stages.map((stage, index) => ({
      ...training.stages[index].toObject(),
      objective: String(stage.objective || "").trim(), materials_url: String(stage.materials_url || "").trim(),
      assessment_type: stage.assessment_type,
      pass_score: Math.max(0, Math.min(100, Number(stage.pass_score) || 0)),
    }));
    if (stages.some((stage) => stage.materials_url && !/^https?:\/\//i.test(stage.materials_url))) return respondError(res, 400, "Learning material links must use http or https.");
    if (stages.some((stage) => stage.assessment_type === "quiz" && stage.pass_score < 1)) return respondError(res, 400, "Set a passing score between 1 and 100 for every quiz level.");
    const stagesLocked = training.stages.some((stage) => stage.scheduled_at || stage.submitted_at || stage.completed_at);
    const stageDesignChanged = stages.some((stage, index) => {
      const existing = training.stages[index];
      return stage.objective !== existing.objective || stage.materials_url !== existing.materials_url || stage.assessment_type !== existing.assessment_type || stage.pass_score !== existing.pass_score;
    });
    if (stageDesignChanged && stages.some((stage) => !stage.objective)) return respondError(res, 400, "Add a learning objective for each level.");
    if (stagesLocked && stageDesignChanged) return respondError(res, 409, "Level objectives and assessments are locked after scheduling or evidence activity begins.");
    if (!stagesLocked) training.stages = stages;
  }
  training.title = title;
  training.details = details;
  training.category = String(req.body.category || "General").trim().slice(0, 80);
  training.mandatory = req.body.mandatory === true;
  training.due_at = due_at;
  training.estimated_hours = estimated_hours;
  training.certificate_validity_months = certificate_validity_months;
  training.skills = [...new Set((Array.isArray(req.body.skills) ? req.body.skills : []).map((skill) => String(skill).trim()).filter(Boolean))].slice(0, 20);
  training.audit.push({ action: "details_updated", ...actorStamp(req), details: { title, category: training.category, due_at, mandatory: training.mandatory } });
  await training.save();
  await notifyPeople(training, "Training details updated", `${training.title} training details or due date have changed. Review the latest learning path in HRMS.`);
  res.json({ success: true, message: "Training details updated.", training });
};

async function getParticipantTraining(req, res) {
  const training = await Training.findOne({ _id: req.params.id, organisation_id: orgId(req) });
  if (!training) return respondError(res, 404, "Training not found");
  const who = req.actor;
  const trainer = String(training.trainer.id) === String(who.id) && training.trainer.model === who.recipientModel;
  const trainee = String(training.trainee.id) === String(who.id) && training.trainee.model === who.recipientModel;
  return { training, trainer, trainee };
}

exports.schedule = async (req, res) => {
  if (isSuper(req)) return respondError(res, 403, "Super Admin access is read-only");
  const access = await getParticipantTraining(req, res);
  if (res.headersSent) return;
  if (!access.trainer) return respondError(res, 403, "Only the assigned trainer can schedule this training");
  if (["pending_approval", "approved"].includes(access.training.status)) return respondError(res, 409, "Training completion has already been submitted");
  const { stage, scheduled_at, mode = "", location = "", meeting_link = "" } = req.body;
  if (!["T1", "T2", "T3"].includes(stage) || !scheduled_at || Number.isNaN(Date.parse(scheduled_at))) return respondError(res, 400, "Choose a valid stage and date/time");
  if (new Date(scheduled_at).getTime() <= Date.now()) return respondError(res, 400, "Session date and time must be in the future. Choose a later time.");
  if (access.training.due_at && new Date(scheduled_at) > access.training.due_at) return respondError(res, 400, "Schedule the session on or before the training due date.");
  if (!["", "online", "in_person"].includes(mode)) return respondError(res, 400, "Choose online or in-person delivery.");
  if (meeting_link && !/^https?:\/\//i.test(meeting_link)) return respondError(res, 400, "Meeting links must use http or https");
  if (String(location).length > 250 || String(meeting_link).length > 2048) return respondError(res, 400, "Location or meeting link is too long");
  const session = access.training.stages.find((s) => s.code === stage);
  if (access.training.stages.every((item) => item.completed_at)) return respondError(res, 409, "All three stages are complete. Scheduling is closed for this training.");
  if (session.completed_at) return respondError(res, 409, "Completed stages cannot be rescheduled");
  const wasScheduled = !!session.scheduled_at;
  const previousScheduledAt = session.scheduled_at;
  Object.assign(session, { scheduled_at: new Date(scheduled_at), mode, location, meeting_link });
  access.training.status = "in_progress";
  access.training.audit.push({ action: "stage_scheduled", ...actorStamp(req), details: { stage, scheduled_at, mode, location, meeting_link } });
  await access.training.save();
  await notifyPeople(access.training, "Training session scheduled", `${access.training.title} ${stage} has been scheduled.`);
  const [trainer, trainee] = await Promise.all([getPerson(access.training.trainer, orgId(req)), getPerson(access.training.trainee, orgId(req))]);
  const company = await getCompany(orgId(req));
  await Promise.all([[trainer, "Trainer"], [trainee, "Trainee"]].filter(([p]) => p).map(([person, role]) => sendBestEffortEmail(person.work_email,
    `${stage} ${wasScheduled ? "rescheduled" : "scheduled"} · ${access.training.title} · ${company?.organisation_name || "Your organisation"}`,
    buildTrainingEmail({ companyName: company?.organisation_name, recipientName: personLabel(person), heading: `Training session ${wasScheduled ? "updated" : "scheduled"}`,
      intro: wasScheduled ? "A training session has been rescheduled. Please review the updated details." : "A training session has been scheduled. Please review the session details.", training: access.training,
      rows: [["Your role", role], ["Trainee", personLabel(trainee)], ["Trainer", personLabel(trainer)], ["Session", stage], ...(wasScheduled ? [["Previous date and time", dateTime(previousScheduledAt)]] : []), ["Date and time", dateTime(scheduled_at)], ["Format", mode === "online" ? "Online" : mode === "in_person" ? "In person" : "Not specified"], ["Location", location || "Not specified"], ["Meeting link", meeting_link || "Not provided"]],
      action: "You can review the full programme and schedule in the Training section of your HRMS." }),
  )));
  res.json({ success: true, message: `Session ${wasScheduled ? "rescheduled" : "scheduled"}.`, training: access.training });
};

exports.submitStageEvidence = async (req, res) => {
  if (isSuper(req)) return respondError(res, 403, "Super Admin access is read-only");
  const access = await getParticipantTraining(req, res);
  if (res.headersSent) return;
  if (!access.trainee) return respondError(res, 403, "Only the assigned trainee can submit learning evidence.");
  if (["pending_approval", "approved"].includes(access.training.status)) return respondError(res, 409, "Training completion has already been submitted");
  const stage = access.training.stages.find((item) => item.code === req.params.stage);
  if (!stage) return respondError(res, 404, "Learning level not found.");
  const stageIndex = access.training.stages.indexOf(stage);
  if (stageIndex > 0 && !access.training.stages.slice(0, stageIndex).every((item) => item.completed_at)) return respondError(res, 409, "Pass the previous learning level before submitting this one.");
  if (stage.review_status === "passed") return respondError(res, 409, "This learning level has already been passed.");
  if (stage.review_status === "submitted") return respondError(res, 409, "Your evidence is already waiting for trainer review.");
  const evidence_note = String(req.body.note || "").trim();
  if (evidence_note.length > 2000) return respondError(res, 400, "Evidence notes must be 2,000 characters or fewer.");
  if (!req.file && !evidence_note) return respondError(res, 400, "Add a short completion note or attach evidence before submitting.");
  let uploaded;
  if (req.file) {
    try {
      const originalname = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      uploaded = await imagekit.upload({ file: req.file.buffer.toString("base64"), fileName: `training-evidence-${access.training._id}-${stage.code}-${Date.now()}-${originalname}`, folder: `/training/${orgId(req)}/evidence` });
    } catch (error) {
      console.error("[training] evidence upload failed:", error.message);
      return respondError(res, 502, "Evidence could not be stored. Please retry your submission.");
    }
  }
  Object.assign(stage, {
    evidence_url: uploaded?.url || "", evidence_file_id: uploaded?.fileId || "",
    evidence_name: req.file?.originalname || "", evidence_note,
    submitted_at: new Date(), review_status: "submitted", score: null,
    attempt_count: (stage.attempt_count || 0) + 1, trainer_feedback: "", completed_at: null,
  });
  access.training.audit.push({ action: "stage_evidence_submitted", ...actorStamp(req), details: { stage: stage.code, evidence_file_id: uploaded?.fileId || "" } });
  await access.training.save();
  const trainee = await getPerson(access.training.trainee, orgId(req));
  const trainer = await getPerson(access.training.trainer, orgId(req));
  const company = await getCompany(orgId(req));
  const noticeRows = [["Trainee", trainee ? personLabel(trainee) : "Employee"], ["Learning level", stage.code.replace("T", "L")], ["Submitted on", dateTime(stage.submitted_at)], ["Evidence note", evidence_note || "File attached"]];
  await Promise.all([
    createBulkNotifications({ recipients: [
      { recipientModel: access.training.trainer.model, recipientId: access.training.trainer.id },
      { recipientModel: access.training.trainee.model, recipientId: access.training.trainee.id },
    ], organisation_id: orgId(req), type: "training", title: "Learning evidence submitted", message: `${access.training.title} · ${stage.code.replace("T", "L")} is ready for trainer review.`, link: "/training" }),
    trainer && sendBestEffortEmail(trainer.work_email, `Evidence review needed · ${access.training.title} · ${company?.organisation_name || "Your organisation"}`,
      buildTrainingEmail({ companyName: company?.organisation_name, recipientName: personLabel(trainer), heading: "A learning level is ready for review", intro: "The trainee submitted evidence for review.", training: access.training, rows: noticeRows, action: "Open Training in HRMS to pass this level or request another attempt." })),
  ]);
  res.json({ success: true, message: "Evidence submitted. Your trainer has been notified.", training: access.training });
};

exports.reviewStage = async (req, res) => {
  if (isSuper(req)) return respondError(res, 403, "Super Admin access is read-only");
  const access = await getParticipantTraining(req, res);
  if (res.headersSent) return;
  if (!access.trainer) return respondError(res, 403, "Only the assigned trainer can review this learning level.");
  if (["pending_approval", "approved"].includes(access.training.status)) return respondError(res, 409, "Training completion has already been submitted.");
  const stage = access.training.stages.find((item) => item.code === req.params.stage);
  if (!stage) return respondError(res, 404, "Learning level not found.");
  if (stage.review_status !== "submitted") return respondError(res, 409, "There is no evidence waiting for review.");
  const outcome = req.body.outcome;
  const trainer_feedback = String(req.body.trainer_feedback || "").trim();
  const score = req.body.score === "" || req.body.score == null ? null : Number(req.body.score);
  if (!["passed", "needs_retry"].includes(outcome)) return respondError(res, 400, "Choose pass or request another attempt.");
  if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) return respondError(res, 400, "Score must be between 0 and 100.");
  if (outcome === "passed" && stage.pass_score > 0 && (score === null || score < stage.pass_score)) return respondError(res, 400, `A score of at least ${stage.pass_score}% is required to pass this level.`);
  if (outcome === "needs_retry" && !trainer_feedback) return respondError(res, 400, "Add trainer feedback so the trainee knows what to improve.");
  stage.review_status = outcome;
  stage.score = score;
  stage.trainer_feedback = trainer_feedback;
  stage.completed_at = outcome === "passed" ? new Date() : null;
  access.training.status = "in_progress";
  access.training.audit.push({ action: outcome === "passed" ? "stage_passed" : "stage_retry_requested", ...actorStamp(req), details: { stage: stage.code, score, trainer_feedback } });
  await access.training.save();
  const [trainee, trainer, company] = await Promise.all([getPerson(access.training.trainee, orgId(req)), getPerson(access.training.trainer, orgId(req)), getCompany(orgId(req))]);
  await Promise.all([
    createBulkNotifications({ recipients: [{ recipientModel: access.training.trainee.model, recipientId: access.training.trainee.id }], organisation_id: orgId(req), type: "training", title: outcome === "passed" ? "Learning level passed" : "Another attempt requested", message: `${access.training.title} · ${stage.code.replace("T", "L")}: ${outcome === "passed" ? "passed" : trainer_feedback}`, link: "/training" }),
    trainee && sendBestEffortEmail(trainee.work_email, `${outcome === "passed" ? "Level passed" : "Trainer feedback"} · ${access.training.title} · ${company?.organisation_name || "Your organisation"}`,
      buildTrainingEmail({ companyName: company?.organisation_name, recipientName: personLabel(trainee), heading: outcome === "passed" ? "You passed this learning level" : "Please review your trainer’s feedback", intro: outcome === "passed" ? "Your trainer reviewed and passed this learning level." : "Your trainer has requested another attempt before this level can be passed.", training: access.training, rows: [["Learning level", stage.code.replace("T", "L")], ...(score !== null ? [["Score", `${score}%`]] : []), ["Trainer feedback", trainer_feedback || "No additional feedback"]], action: outcome === "passed" ? "Continue with the next learning level when it is available." : "Review the feedback, update your evidence, and submit another attempt." })),
  ]);
  res.json({ success: true, message: outcome === "passed" ? `${stage.code.replace("T", "L")} passed.` : `Another attempt requested for ${stage.code.replace("T", "L")}.`, training: access.training });
};

exports.submitCompletion = async (req, res) => {
  if (isSuper(req)) return respondError(res, 403, "Super Admin access is read-only");
  const access = await getParticipantTraining(req, res);
  if (res.headersSent) return;
  if (!access.trainer) return respondError(res, 403, "Only the assigned trainer can submit this training");
  if (!access.training.stages.every((s) => s.completed_at)) return respondError(res, 400, "Complete T1, T2 and T3 before submitting");
  if (access.training.status === "pending_approval" || access.training.status === "approved") return respondError(res, 409, "Completion was already submitted");
  access.training.status = "pending_approval";
  access.training.completion_submitted_at = new Date();
  access.training.audit.push({ action: "completion_submitted", ...actorStamp(req) });
  await access.training.save();
  res.json({ success: true, training: access.training });
};

exports.decide = async (req, res) => {
  if (!isAdmin(req)) return respondError(res, 403, "Admin access required");
  const training = await Training.findOne({ _id: req.params.id, organisation_id: orgId(req) });
  if (!training) return respondError(res, 404, "Training not found");
  if (training.status !== "pending_approval") return respondError(res, 409, "Training is not awaiting approval");
  const decision = req.body.decision;
  const reason = String(req.body.reason || "").trim();
  if (!["approved", "rejected"].includes(decision)) return respondError(res, 400, "Choose approve or reject");
  if (decision === "rejected" && !reason) return respondError(res, 400, "A rejection reason is required");
  let certificateBytes;
  let settings;
  let companyDetails;
  let trainee;
  let trainer;
  let certificateValidUntil = null;
  if (decision === "approved") {
    settings = await TrainingTemplate.findOne({ organisation_id: orgId(req) });
    if (!settings?.signatory_name || !settings?.signatory_title) return respondError(res, 400, "Complete Certificate setup with an authorised signatory before approving.");
    [trainee, trainer] = await Promise.all([getPerson(training.trainee, orgId(req)), getPerson(training.trainer, orgId(req))]);
    if (!trainee || !trainer) return respondError(res, 409, "Training participant is no longer active");
    companyDetails = await getCompany(orgId(req));
    let brandAssets;
    try {
      brandAssets = {
        logo: await getBrandImage(settings.logo_url || companyDetails?.profile_image, "Organisation logo"),
        signature: await getBrandImage(settings.signature_url, "Signatory signature"),
      };
    } catch (error) { return respondError(res, 400, error.message); }
    if (training.certificate_validity_months > 0) {
      certificateValidUntil = new Date();
      certificateValidUntil.setMonth(certificateValidUntil.getMonth() + training.certificate_validity_months);
    }
    const certificateValues = {
      employee_name: personLabel(trainee), training_name: training.title, trainer_name: personLabel(trainer),
      completion_date: new Date(training.completion_submitted_at).toLocaleDateString("en-IN"), issue_date: new Date().toLocaleDateString("en-IN"),
      company_name: companyDetails?.organisation_name || "", company_address: companyDetails?.company_address || "",
      signatory_name: settings.signatory_name, signatory_title: settings.signatory_title,
      learning_levels: "L1, L2, L3",
      valid_until: certificateValidUntil ? certificateValidUntil.toLocaleDateString("en-IN") : "No expiry",
      certificate_id: `TR-${String(training._id).slice(-10).toUpperCase()}`,
    };
    try {
      if (settings.url) {
        const template = await axios.get(settings.url, { responseType: "arraybuffer", timeout: 15000, maxContentLength: 5 * 1024 * 1024 });
        certificateBytes = await fillCertificate(Buffer.from(template.data), certificateValues, brandAssets);
      } else {
        certificateBytes = await createDefaultCertificate(certificateValues, brandAssets);
      }
    } catch (error) { return respondError(res, 400, `Certificate generation failed: ${error.message}`); }
  }
  if (decision === "approved") {
    const issuanceLock = `${req.actor.id}:${Date.now()}:${Math.random()}`;
    const reserved = await Training.findOneAndUpdate(
      { _id: training._id, organisation_id: orgId(req), status: "pending_approval", issuance_lock: "" },
      { $set: { issuance_lock: issuanceLock } }, { new: true },
    );
    if (!reserved) return respondError(res, 409, "Training is already being approved or has already been decided");
    let uploaded;
    try {
      uploaded = await imagekit.upload({ file: certificateBytes.toString("base64"), fileName: `training-${training._id}-${Date.now()}.pdf`, folder: `/training/${orgId(req)}/certificates` });
    } catch (error) {
      await Training.updateOne({ _id: training._id, issuance_lock: issuanceLock }, { $set: { issuance_lock: "" } });
      console.error("[training] certificate upload failed:", error.message);
      return respondError(res, 502, "Approval was not recorded because the certificate could not be stored. Please retry.");
    }
    const decidedAt = new Date();
    const issuedAt = decidedAt;
    const claimed = await Training.findOneAndUpdate(
      { _id: training._id, organisation_id: orgId(req), status: "pending_approval", issuance_lock: issuanceLock },
      { $set: { status: "approved", decision: "approved", decision_reason: "", decision_by: req.actor.id, decision_at: decidedAt,
        issuance_lock: "", certificate: { url: uploaded.url, file_id: uploaded.fileId, issued_at: issuedAt, valid_until: certificateValidUntil, template_file_id: settings.file_id } },
        $push: { approval_history: { decision: "approved", reason: "", by: req.actor.id, at: decidedAt }, audit: { $each: [
          { action: "approved", ...actorStamp(req), at: decidedAt, details: {} },
          { action: "certificate_issued", ...actorStamp(req), at: issuedAt, details: { file_id: uploaded.fileId } },
        ] } } },
      { new: true },
    );
    if (!claimed) return respondError(res, 409, "Training changed while approval was processing");
    Object.assign(training, claimed.toObject());
    await sendBestEffortEmail(trainee.work_email,
      `Certificate of completion · ${training.title} · ${companyDetails?.organisation_name || "Your organisation"}`,
      buildTrainingEmail({ companyName: companyDetails?.organisation_name, recipientName: personLabel(trainee), heading: "Congratulations on completing your training",
        intro: `Your completion has been approved by ${companyDetails?.organisation_name || "your organisation"}. Your certificate is attached.`, training,
        rows: [["Trainee", personLabel(trainee)], ["Trainer", personLabel(trainer)], ["Learning levels", "L1, L2, L3"], ["Completion date", dateTime(training.completion_submitted_at)], ["Issue date", dateTime(training.certificate.issued_at)], ...(certificateValidUntil ? [["Valid until", dateTime(certificateValidUntil)]] : []), ["Certificate ID", `TR-${String(training._id).slice(-10).toUpperCase()}`]], certificate: true }),
      [{ filename: `certificate-${training._id}.pdf`, content: certificateBytes, contentType: "application/pdf" }],
    );
    await sendBestEffortEmail(trainer.work_email, `Training completion approved · ${training.title} · ${companyDetails?.organisation_name || "Your organisation"}`,
      buildTrainingEmail({ companyName: companyDetails?.organisation_name, recipientName: personLabel(trainer), heading: "Training completion approved",
        intro: "The Admin has approved the training completion you submitted.", training, rows: [["Trainee", personLabel(trainee)], ["Completion date", dateTime(training.completion_submitted_at)], ["Decision", "Approved"]] }));
  } else {
    const decidedAt = new Date();
    const claimed = await Training.findOneAndUpdate(
      { _id: training._id, organisation_id: orgId(req), status: "pending_approval", issuance_lock: "" },
      { $set: { status: "rejected", decision: "rejected", decision_reason: reason, decision_by: req.actor.id, decision_at: decidedAt },
        $push: { approval_history: { decision: "rejected", reason, by: req.actor.id, at: decidedAt }, audit: { action: "rejected", ...actorStamp(req), at: decidedAt, details: { reason } } } },
      { new: true },
    );
    if (!claimed) return respondError(res, 409, "Training has already been decided");
    Object.assign(training, claimed.toObject());
  }
  if (decision === "rejected") {
    const [traineeForNotice, trainerForNotice, company] = await Promise.all([getPerson(training.trainee, orgId(req)), getPerson(training.trainer, orgId(req)), getCompany(orgId(req))]);
    await Promise.all([[traineeForNotice, "Trainee"], [trainerForNotice, "Trainer"]].filter(([person]) => person).map(([person, participantRole]) =>
      sendBestEffortEmail(person.work_email, `Training review update · ${training.title} · ${company?.organisation_name || "Your organisation"}`,
        buildTrainingEmail({ companyName: company?.organisation_name, recipientName: personLabel(person), heading: "Training completion needs review",
          intro: "The Admin has returned this completion for follow up.", training, rows: [["Your role", participantRole], ["Trainee", traineeForNotice ? personLabel(traineeForNotice) : "Employee"], ["Trainer", trainerForNotice ? personLabel(trainerForNotice) : "Employee"], ["Decision", "Changes requested"]], reason,
          action: "Your trainer can review the note, make any required updates, and resubmit the completed training." }))));
  }
  res.json({ success: true, training: { ...training.toObject(), certificate: { ...training.toObject().certificate, url: "" } } });
};

const TrainingTemplate = require("../Models/trainingTemplate.model");
exports.getTemplate = async (req, res) => {
  if (!isAdmin(req)) return respondError(res, 403, "Admin access required");
  const [template, organisation] = await Promise.all([
    TrainingTemplate.findOne({ organisation_id: orgId(req) }).select("updatedAt signatory_name signatory_title url logo_url signature_url").lean(),
    SuperAdmin.findById(orgId(req)).select("organisation_name profile_image company_address").lean(),
  ]);
  res.json({ success: true, template: template ? { hasCustomTemplate: !!template.url, updatedAt: template.updatedAt, signatory_name: template.signatory_name, signatory_title: template.signatory_title, logo_url: template.logo_url, signature_url: template.signature_url } : null, organisation: organisation ? { name: organisation.organisation_name, logo: organisation.profile_image || "", address: organisation.company_address || "" } : null });
};

exports.uploadTemplate = async (req, res) => {
  if (!isAdmin(req)) return respondError(res, 403, "Admin access required");
  const signatory_name = String(req.body.signatory_name || "").trim();
  const signatory_title = String(req.body.signatory_title || "").trim();
  if (!signatory_name || !signatory_title) return respondError(res, 400, "Enter the certificate signatory name and designation.");
  const organisation_id = orgId(req);
  const current = await TrainingTemplate.findOne({ organisation_id });
  const company = await getCompany(organisation_id);
  const customTemplate = req.files?.template?.[0];
  const logoFile = req.files?.logo?.[0];
  const signatureFile = req.files?.signature?.[0];
  if (!(logoFile || current?.logo_url || company?.profile_image)) return respondError(res, 400, "Upload your organisation logo or add one to the company profile before saving certificate setup.");
  if (!(signatureFile || current?.signature_url)) return respondError(res, 400, "Upload the authorised signatory's signature before saving certificate setup.");
  let uploadedTemplate = null;
  let uploadedLogo = null;
  let uploadedSignature = null;
  if (customTemplate) {
    try { await validateTemplate(customTemplate.buffer); } catch (error) { return respondError(res, 400, error.message); }
    uploadedTemplate = await imagekit.upload({ file: customTemplate.buffer.toString("base64"), fileName: `training-template-${organisation_id}-${Date.now()}.pdf`, folder: `/training/${organisation_id}/templates` });
  }
  if (logoFile) uploadedLogo = await imagekit.upload({ file: logoFile.buffer.toString("base64"), fileName: `training-logo-${organisation_id}-${Date.now()}-${logoFile.originalname}`, folder: `/training/${organisation_id}/branding` });
  if (signatureFile) uploadedSignature = await imagekit.upload({ file: signatureFile.buffer.toString("base64"), fileName: `training-signature-${organisation_id}-${Date.now()}-${signatureFile.originalname}`, folder: `/training/${organisation_id}/branding` });
  const logo_url = uploadedLogo?.url || current?.logo_url || company?.profile_image || "";
  const signature_url = uploadedSignature?.url || current?.signature_url || "";
  const template = await TrainingTemplate.findOneAndUpdate({ organisation_id }, {
    organisation_id, updated_by: req.actor.id, signatory_name, signatory_title,
    url: uploadedTemplate?.url || current?.url || "", file_id: uploadedTemplate?.fileId || current?.file_id || "",
    logo_url, logo_file_id: uploadedLogo?.fileId || current?.logo_file_id || "",
    signature_url, signature_file_id: uploadedSignature?.fileId || current?.signature_file_id || "",
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ success: true, message: "Certificate setup saved.", template: { hasCustomTemplate: !!template.url, updatedAt: template.updatedAt, signatory_name: template.signatory_name, signatory_title: template.signatory_title, logo_url: template.logo_url, signature_url: template.signature_url } });
};

exports.downloadCertificate = async (req, res) => {
  if (isSuper(req)) return respondError(res, 403, "Certificate downloads are not available to Super Admin");
  const training = await Training.findOne({ _id: req.params.id, organisation_id: orgId(req), "trainee.id": req.actor.id, "trainee.model": actorModel(req), status: "approved", "certificate.url": { $ne: "" } }).lean();
  if (!training) return respondError(res, 404, "Issued certificate not found");
  res.redirect(training.certificate.url);
};
