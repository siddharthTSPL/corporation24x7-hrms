const express = require("express");
const recruitmentrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const managermiddleware = require("../middleware/auth/manager.middleware");

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
} = require("../controllers/recruitment.controller");

recruitmentrouter.post(
  "/manager/create",
  managermiddleware,
  asyncHandler(createRequisition)
);

recruitmentrouter.get(
  "/manager/my-requests",
  managermiddleware,
  asyncHandler(getMyRequisitions)
);

recruitmentrouter.get(
  "/admin/all",
  adminauthmiddleware,
  asyncHandler(getAllRequisitions)
);

recruitmentrouter.get(
  "/admin/pending",
  adminauthmiddleware,
  asyncHandler(getPendingRequisitions)
);

recruitmentrouter.get(
  "/admin/detail/:id",
  adminauthmiddleware,
  asyncHandler(getRequisitionById)
);

recruitmentrouter.patch(
  "/admin/approve/:id",
  adminauthmiddleware,
  asyncHandler(approveRequisition)
);

recruitmentrouter.patch(
  "/admin/reject/:id",
  adminauthmiddleware,
  asyncHandler(rejectRequisition)
);

recruitmentrouter.patch(
  "/admin/hold/:id",
  adminauthmiddleware,
  asyncHandler(holdRequisition)
);

recruitmentrouter.patch(
  "/admin/revision/:id",
  adminauthmiddleware,
  asyncHandler(requestRevision)
);

recruitmentrouter.post(
  "/admin/candidate/add",
  adminauthmiddleware,
  asyncHandler(addCandidate)
);

recruitmentrouter.get(
  "/admin/candidate/list/:requisition_id",
  adminauthmiddleware,
  asyncHandler(getCandidatesByRequisition)
);

recruitmentrouter.get(
  "/admin/candidate/detail/:id",
  adminauthmiddleware,
  asyncHandler(getCandidateById)
);

recruitmentrouter.patch(
  "/admin/candidate/stage/:id",
  adminauthmiddleware,
  asyncHandler(updateCandidateStage)
);

recruitmentrouter.post(
  "/admin/candidate/schedule/:id",
  adminauthmiddleware,
  asyncHandler(scheduleInterview)
);

recruitmentrouter.patch(
  "/admin/candidate/feedback/:candidateId/:roundId",
  adminauthmiddleware,
  asyncHandler(submitInterviewFeedback)
);

module.exports = recruitmentrouter;