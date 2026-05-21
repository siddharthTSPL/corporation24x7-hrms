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
  forwardWFHToReportingManager,
  managerApplyWFH,
  managerGetMyWFH,
  getForwardedWFH,
  approveForwardedWFH,
  rejectForwardedWFH,
  adminApplyWFH,
  adminGetMyWFH,
  superadminGetPendingWFH,
  superadminApproveWFH,
  superadminRejectWFH,
adminGetForwardedWFH,
adminApproveForwardedWFH,
adminRejectForwardedWFH

} = require("../controllers/wfh.controller");


wfhRouter.post("/employee/applyWFH", employeemiddleware, asyncHandler(applyWFH));
wfhRouter.put("/employee/editWFH/:id", employeemiddleware, asyncHandler(editWFH));
wfhRouter.delete("/employee/deleteWFH/:id", employeemiddleware, asyncHandler(deleteWFH));
wfhRouter.get("/employee/getMyWFH", employeemiddleware, asyncHandler(getMyWFH));


wfhRouter.post("/manager/applyWFH", managermiddleware, asyncHandler(managerApplyWFH));
wfhRouter.get("/manager/getMyWFH", managermiddleware, asyncHandler(managerGetMyWFH));
wfhRouter.get("/manager/getPendingWFH", managermiddleware, asyncHandler(getPendingWFH));
wfhRouter.get("/manager/getAllTeamWFH", managermiddleware, asyncHandler(getAllTeamWFH));
wfhRouter.post("/manager/approveWFH", managermiddleware, asyncHandler(approveWFH));
wfhRouter.post("/manager/rejectWFH", managermiddleware, asyncHandler(rejectWFH));
wfhRouter.post("/manager/forwardWFH", managermiddleware, asyncHandler(forwardWFHToReportingManager));
wfhRouter.get("/manager/getForwardedWFH", managermiddleware, asyncHandler(getForwardedWFH));
wfhRouter.post("/manager/approveForwardedWFH", managermiddleware, asyncHandler(approveForwardedWFH));
wfhRouter.post("/manager/rejectForwardedWFH", managermiddleware, asyncHandler(rejectForwardedWFH));


wfhRouter.post("/admin/applyWFH", adminauthmiddleware, asyncHandler(adminApplyWFH));
wfhRouter.get("/admin/getMyWFH", adminauthmiddleware, asyncHandler(adminGetMyWFH));
wfhRouter.get("/admin/getForwardedWFH", adminauthmiddleware, asyncHandler(adminGetForwardedWFH));
wfhRouter.post("/admin/approveForwardedWFH", adminauthmiddleware, asyncHandler(adminApproveForwardedWFH));
wfhRouter.post("/admin/rejectForwardedWFH", adminauthmiddleware, asyncHandler(adminRejectForwardedWFH));


wfhRouter.get("/superadmin/getPendingWFH", superadminmiddleware, asyncHandler(superadminGetPendingWFH));
wfhRouter.post("/superadmin/approveWFH", superadminmiddleware, asyncHandler(superadminApproveWFH));
wfhRouter.post("/superadmin/rejectWFH", superadminmiddleware, asyncHandler(superadminRejectWFH));

module.exports = wfhRouter;