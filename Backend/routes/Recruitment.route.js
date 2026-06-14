const express = require("express");
const recruitmentrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const managermiddleware = require("../middleware/auth/manager.middleware");
const checkPermission = require("../middleware/auth/Checkpermission.middleware");

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
  submitInterviewFeedback,
} = require("../controllers/Recruitment.controller");

recruitmentrouter.post("/manager/create", managermiddleware, checkPermission("recruitment.can_create_hiring_requisition"), asyncHandler(createRequisition));
recruitmentrouter.get("/manager/my-requests", managermiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getMyRequisitions));

recruitmentrouter.get("/admin/all", adminauthmiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getAllRequisitions));
recruitmentrouter.get("/admin/pending", adminauthmiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getPendingRequisitions));
recruitmentrouter.get("/admin/detail/:id", adminauthmiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(getRequisitionById));
recruitmentrouter.patch("/admin/approve/:id", adminauthmiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(approveRequisition));
recruitmentrouter.patch("/admin/reject/:id", adminauthmiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(rejectRequisition));
recruitmentrouter.patch("/admin/hold/:id", adminauthmiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(holdRequisition));
recruitmentrouter.patch("/admin/revision/:id", adminauthmiddleware, checkPermission("recruitment.can_view_hiring_requisitions"), asyncHandler(requestRevision));

recruitmentrouter.post("/admin/candidate/add", adminauthmiddleware, checkPermission("recruitment.can_add_candidate"), asyncHandler(addCandidate));
recruitmentrouter.get("/admin/candidate/list/:requisition_id", adminauthmiddleware, checkPermission("recruitment.can_view_candidates"), asyncHandler(getCandidatesByRequisition));
recruitmentrouter.get("/admin/candidate/detail/:id", adminauthmiddleware, checkPermission("recruitment.can_view_candidates"), asyncHandler(getCandidateById));
recruitmentrouter.patch("/admin/candidate/stage/:id", adminauthmiddleware, checkPermission("recruitment.can_add_candidate"), asyncHandler(updateCandidateStage));
recruitmentrouter.post("/admin/candidate/schedule/:id", adminauthmiddleware, checkPermission("recruitment.can_add_candidate"), asyncHandler(scheduleInterview));
recruitmentrouter.patch("/admin/candidate/feedback/:candidateId/:roundId", adminauthmiddleware, checkPermission("recruitment.can_add_candidate"), asyncHandler(submitInterviewFeedback));

module.exports = recruitmentrouter;