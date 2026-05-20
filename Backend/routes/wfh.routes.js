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
} = require("../controllers/wfh.controller");

wfhRouter.get("/getPendingWFH", managermiddleware, asyncHandler(getPendingWFH));
wfhRouter.get("/getAllTeamWFH", managermiddleware, asyncHandler(getAllTeamWFH));
wfhRouter.post("/approveWFH", managermiddleware, asyncHandler(approveWFH));
wfhRouter.post("/rejectWFH", managermiddleware, asyncHandler(rejectWFH));
wfhRouter.post(
  "/forwardWFH",
  managermiddleware,
  asyncHandler(forwardWFHToReportingManager),
);

wfhRouter.post("/applyWFH", managermiddleware, asyncHandler(managerApplyWFH));
wfhRouter.get("/getMyWFH", managermiddleware, asyncHandler(managerGetMyWFH));

wfhRouter.get(
  "/getForwardedWFH",
  managermiddleware,
  asyncHandler(getForwardedWFH),
);
wfhRouter.post(
  "/approveForwardedWFH",
  managermiddleware,
  asyncHandler(approveForwardedWFH),
);
wfhRouter.post(
  "/rejectForwardedWFH",
  managermiddleware,
  asyncHandler(rejectForwardedWFH),
);

wfhRouter.post("/applyWFH", employeemiddleware, asyncHandler(applyWFH));
wfhRouter.put("/editWFH/:id", employeemiddleware, asyncHandler(editWFH));
wfhRouter.delete("/deleteWFH/:id", employeemiddleware, asyncHandler(deleteWFH));
wfhRouter.get("/getMyWFH", employeemiddleware, asyncHandler(getMyWFH));

wfhRouter.post("/applyWFH", adminauthmiddleware, asyncHandler(adminApplyWFH));
wfhRouter.get("/getMyWFH", adminauthmiddleware, asyncHandler(adminGetMyWFH));

wfhRouter.get(
  "/getPendingWFH",
  superadminmiddleware,
  asyncHandler(superadminGetPendingWFH),
);
wfhRouter.post(
  "/approveWFH",
  superadminmiddleware,
  asyncHandler(superadminApproveWFH),
);
wfhRouter.post(
  "/rejectWFH",
  superadminmiddleware,
  asyncHandler(superadminRejectWFH),
);

module.exports = wfhRouter;
