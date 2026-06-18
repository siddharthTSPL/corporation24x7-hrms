const express = require("express");
const wfhRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const managermiddleware = require("../middleware/auth/manager.middleware");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const superadminmiddleware = require("../middleware/auth/superadmin.middleware");

const {
  applyWFH,
  editWFH,
  deleteWFH,
  getMyWFH,
  getPendingWFH,
  getAllTeamWFH,
  approveWFH,
  rejectWFH,
  forwardWFH,
  managerApplyWFH,
  managerGetMyWFH,
  getForwardedWFH,
  approveForwardedWFH,
  rejectForwardedWFH,
  adminGetPendingWFH,
  adminApproveWFH,
  adminRejectWFH,
  adminApplyWFH,
  adminGetMyWFH,
  superadminGetPendingWFH,
  superadminApproveWFH,
  superadminRejectWFH,
} = require("../controllers/wfh.controller");

wfhRouter.post(
  "/employee/applyWFH",
  employeemiddleware,
  asyncHandler(applyWFH),
);

wfhRouter.put(
  "/employee/editWFH/:id",
  employeemiddleware,
  asyncHandler(editWFH),
);

wfhRouter.delete(
  "/employee/deleteWFH/:id",
  employeemiddleware,
  asyncHandler(deleteWFH),
);

wfhRouter.get("/employee/getMyWFH", employeemiddleware, asyncHandler(getMyWFH));

wfhRouter.post(
  "/manager/applyWFH",
  managermiddleware,
  asyncHandler(managerApplyWFH),
);

wfhRouter.get(
  "/manager/getMyWFH",
  managermiddleware,
  asyncHandler(managerGetMyWFH),
);

wfhRouter.get(
  "/manager/getPendingWFH",
  managermiddleware,
  asyncHandler(getPendingWFH),
);

wfhRouter.get(
  "/manager/getAllTeamWFH",
  managermiddleware,
  asyncHandler(getAllTeamWFH),
);

wfhRouter.post(
  "/manager/approveWFH",
  managermiddleware,
  asyncHandler(approveWFH),
);

wfhRouter.post(
  "/manager/rejectWFH",
  managermiddleware,
  asyncHandler(rejectWFH),
);

wfhRouter.post(
  "/manager/forwardWFH",
  managermiddleware,
  asyncHandler(forwardWFH),
);

wfhRouter.post(
  "/admin/applyWFH",
  adminauthmiddleware,
  asyncHandler(adminApplyWFH),
);

wfhRouter.get(
  "/admin/getMyWFH",
  adminauthmiddleware,
  asyncHandler(adminGetMyWFH),
);

wfhRouter.get(
  "/admin/getPendingWFH",
  adminauthmiddleware,
  asyncHandler(adminGetPendingWFH),
);

wfhRouter.post(
  "/admin/approveWFH",
  adminauthmiddleware,
  asyncHandler(adminApproveWFH),
);

wfhRouter.post(
  "/admin/rejectWFH",
  adminauthmiddleware,
  asyncHandler(adminRejectWFH),
);

wfhRouter.get(
  "/superadmin/getPendingWFH",
  superadminmiddleware,
  asyncHandler(superadminGetPendingWFH),
);

wfhRouter.post(
  "/superadmin/approveWFH",
  superadminmiddleware,
  asyncHandler(superadminApproveWFH),
);

wfhRouter.post(
  "/superadmin/rejectWFH",
  superadminmiddleware,
  asyncHandler(superadminRejectWFH),
);
wfhRouter.get(
  "/manager/getForwardedWFH",
  managermiddleware,
  asyncHandler(getForwardedWFH),
);

wfhRouter.post(
  "/manager/approveForwardedWFH",
  managermiddleware,
  asyncHandler(approveForwardedWFH),
);

wfhRouter.post(
  "/manager/rejectForwardedWFH",
  managermiddleware,
  asyncHandler(rejectForwardedWFH),
);
module.exports = wfhRouter;
