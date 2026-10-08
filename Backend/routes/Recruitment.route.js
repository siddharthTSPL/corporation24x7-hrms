const express = require("express");
const recruitmentrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");
const managermiddleware = require("../middleware/auth/manager.middleware");
const checkPermission = require("../middleware/auth/Checkpermission.middleware");
const { restrictPlanFeature } = require("../middleware/auth/planFeatureGate.middleware");
const offerAssetsUpload = require("../middleware/upload/Offerassets.middleware");
const publicRateLimit = require("../utils/recruitment/publicRateLimit.utils");

// Recruitment Management is one of the three plan-gated features: fully
// locked on the Basic plan, fully open on Advance/enterprise (or during
// the free trial). Runs right after auth, before permission checks.
const recruitmentPlanGate = restrictPlanFeature("recruitment");

const {
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
  resendInterviewInvite,
  submitInterviewFeedback,
} = require("../controllers/Recruitment.controller");

const {
  getApprovers,
  getInterviewers,
  submitForApproval,
  withdrawApproval,
  listMyApprovals,
  pendingCount,
  previewForApprover,
  approveLetter,
  rejectLetter,
} = require("../controllers/OfferApproval.controller");

const {
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
} = require("../controllers/Offer.controller");

recruitmentrouter.post("/manager/create", managermiddleware, recruitmentPlanGate, checkPermission("recruitment.can_create_hiring_requisition"), asyncHandler(createRequisition));
recruitmentrouter.get("/manager/my-requests", managermiddleware, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getMyRequisitions));

recruitmentrouter.get("/admin/all", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getAllRequisitions));
recruitmentrouter.get("/admin/pending", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getPendingRequisitions));
recruitmentrouter.get("/admin/detail/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getRequisitionById));
recruitmentrouter.patch("/admin/approve/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(approveRequisition));
recruitmentrouter.patch("/admin/reject/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(rejectRequisition));
recruitmentrouter.patch("/admin/hold/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(holdRequisition));
recruitmentrouter.patch("/admin/revision/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(requestRevision));

recruitmentrouter.post("/admin/candidate/add", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(addCandidate));
recruitmentrouter.get("/admin/candidate/list/:requisition_id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_candidates"), asyncHandler(getCandidatesByRequisition));
recruitmentrouter.get("/admin/candidate/detail/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_candidates"), asyncHandler(getCandidateById));
recruitmentrouter.patch("/admin/candidate/stage/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(updateCandidateStage));
recruitmentrouter.post("/admin/candidate/schedule/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(scheduleInterview));
recruitmentrouter.patch("/admin/candidate/feedback/:candidateId/:roundId", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(submitInterviewFeedback));

recruitmentrouter.post("/admin/candidate/:candidateId/round/:roundId/resend-invite", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(resendInterviewInvite));
recruitmentrouter.get("/admin/interviewers", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(getInterviewers));

// ---- Offer / appointment letter approval ---------------------------------
// Creator side (the admin managing recruitment): pick an approver and send.
recruitmentrouter.get("/admin/approvers", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(getApprovers));
recruitmentrouter.patch("/admin/approval/:kind/:id/submit", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(submitForApproval));
recruitmentrouter.patch("/admin/approval/:kind/:id/withdraw", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(withdrawApproval));

// Approver side: the chosen Admin or the SuperAdmin. No recruitment
// permission is needed on purpose, being picked as approver is the grant.
recruitmentrouter.get("/approvals/mine", adminOrSuperAdminAuth, recruitmentPlanGate, asyncHandler(listMyApprovals));
recruitmentrouter.get("/approvals/pending-count", adminOrSuperAdminAuth, recruitmentPlanGate, asyncHandler(pendingCount));
recruitmentrouter.get("/approvals/:kind/:id/preview", adminOrSuperAdminAuth, recruitmentPlanGate, asyncHandler(previewForApprover));
recruitmentrouter.patch("/approvals/:kind/:id/approve", adminOrSuperAdminAuth, recruitmentPlanGate, offerAssetsUpload, asyncHandler(approveLetter));
recruitmentrouter.patch("/approvals/:kind/:id/reject", adminOrSuperAdminAuth, recruitmentPlanGate, asyncHandler(rejectLetter));

recruitmentrouter.get("/admin/offer/meta", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_candidates"), asyncHandler(getTemplatesMeta));
recruitmentrouter.post("/admin/offer/ctc-preview", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(previewCtc));
recruitmentrouter.post("/admin/offer/generate/:candidateId", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(generateOffer));
recruitmentrouter.get("/admin/offer/candidate/:candidateId", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_candidates"), asyncHandler(getCandidateOfferBundle));
recruitmentrouter.patch("/admin/offer/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(updateOffer));
recruitmentrouter.post("/admin/offer/:id/assets", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), offerAssetsUpload, asyncHandler(uploadOfferAssets));
recruitmentrouter.patch("/admin/offer/:id/review-done", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(reviewDone));
recruitmentrouter.patch("/admin/offer/:id/finalize", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(finalizeOffer));
recruitmentrouter.patch("/admin/offer/:id/reopen", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(reopenOffer));
recruitmentrouter.get("/admin/offer/:id/download", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_candidates"), asyncHandler(downloadOffer));
recruitmentrouter.post("/admin/offer/:id/send-email", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(sendOfferByEmail));
recruitmentrouter.post("/admin/offer/:id/send-whatsapp", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(sendOfferByWhatsapp));
recruitmentrouter.post("/admin/offer/:id/resend", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(resendOffer));
recruitmentrouter.patch("/admin/offer/:id/extend-validity", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(extendOfferValidity));
recruitmentrouter.patch("/admin/candidate/join/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(joinCandidate));

recruitmentrouter.post("/admin/appointment/:candidateId/generate", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(generateAppointment));
recruitmentrouter.patch("/admin/appointment/:id", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(updateAppointment));
recruitmentrouter.post("/admin/appointment/:id/assets", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), offerAssetsUpload, asyncHandler(uploadAppointmentAssets));
recruitmentrouter.patch("/admin/appointment/:id/finalize", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(finalizeAppointment));
recruitmentrouter.get("/admin/appointment/:id/download", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_view_candidates"), asyncHandler(downloadAppointment));
recruitmentrouter.post("/admin/appointment/:id/send-email", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(sendAppointmentByEmail));
recruitmentrouter.post("/admin/appointment/:id/send-whatsapp", adminOrSuperAdminAuth, recruitmentPlanGate, checkPermission("recruitment.can_add_candidate"), asyncHandler(sendAppointmentByWhatsapp));

recruitmentrouter.get("/public/offer/:token", publicRateLimit(60), asyncHandler(getPublicOffer));
recruitmentrouter.get("/public/offer/:token/pdf", publicRateLimit(30), asyncHandler(getPublicOfferPdf));
recruitmentrouter.post("/public/offer/:token", publicRateLimit(20), asyncHandler(respondToPublicOffer));
recruitmentrouter.get("/public/appointment/:token/pdf", publicRateLimit(30), asyncHandler(getPublicAppointmentPdf));

module.exports = recruitmentrouter;