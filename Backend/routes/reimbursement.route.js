const express = require("express");
const reimbursementRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const managermiddleware = require("../middleware/auth/manager.middleware");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const superadminmiddleware = require("../middleware/auth/superadmin.middleware");
const supportUpload = require("../middleware/upload/Supportattachments.middleware");

const { restrictPlanFeature } = require("../middleware/auth/planFeatureGate.middleware");
// Reimbursements are part of the Self Service Portal bundle: locked on
// Basic, fully open on Advance/enterprise (or during the free trial).
const selfServicePlanGate = restrictPlanFeature("selfService");

const {
  employeeApply,
  employeeUpdate,
  employeeDelete,
  employeeGetMy,
  managerApply,
  managerUpdate,
  managerDelete,
  managerGetMy,
  adminApply,
  adminUpdate,
  adminDelete,
  adminGetMy,
  adminGetPending,
  adminGetAll,
  adminApprove,
  adminReject,
  adminMarkPaid,
  superadminGetPending,
  superadminGetAll,
  superadminApprove,
  superadminReject,
  superadminMarkPaid,
} = require("../controllers/reimbursement.controller");

// Accepts up to 5 receipt files + 5 supporting-document files per claim.
const claimAttachments = supportUpload.fields([
  { name: "receipts", maxCount: 5 },
  { name: "supportingDocuments", maxCount: 5 },
]);

// ---- Employee ---------------------------------------------------------
reimbursementRouter.post(
  "/employee/apply",
  employeemiddleware, selfServicePlanGate,
  claimAttachments,
  asyncHandler(employeeApply),
);
reimbursementRouter.put(
  "/employee/update/:id",
  employeemiddleware, selfServicePlanGate,
  claimAttachments,
  asyncHandler(employeeUpdate),
);
reimbursementRouter.delete(
  "/employee/delete/:id",
  employeemiddleware, selfServicePlanGate,
  asyncHandler(employeeDelete),
);
reimbursementRouter.get("/employee/my", employeemiddleware, selfServicePlanGate, asyncHandler(employeeGetMy));

// ---- Manager ------------------------------------------------------------
reimbursementRouter.post(
  "/manager/apply",
  managermiddleware, selfServicePlanGate,
  claimAttachments,
  asyncHandler(managerApply),
);
reimbursementRouter.put(
  "/manager/update/:id",
  managermiddleware, selfServicePlanGate,
  claimAttachments,
  asyncHandler(managerUpdate),
);
reimbursementRouter.delete(
  "/manager/delete/:id",
  managermiddleware, selfServicePlanGate,
  asyncHandler(managerDelete),
);
reimbursementRouter.get("/manager/my", managermiddleware, selfServicePlanGate, asyncHandler(managerGetMy));

// ---- Admin ---------------------------------------------------------------
// Own claims (escalate to SuperAdmin)
reimbursementRouter.post(
  "/admin/apply",
  adminauthmiddleware, selfServicePlanGate,
  claimAttachments,
  asyncHandler(adminApply),
);
reimbursementRouter.put(
  "/admin/update/:id",
  adminauthmiddleware, selfServicePlanGate,
  claimAttachments,
  asyncHandler(adminUpdate),
);
reimbursementRouter.delete(
  "/admin/delete/:id",
  adminauthmiddleware, selfServicePlanGate,
  asyncHandler(adminDelete),
);
reimbursementRouter.get("/admin/my", adminauthmiddleware, selfServicePlanGate, asyncHandler(adminGetMy));

// Reviewing Employee + Manager claims
reimbursementRouter.get("/admin/pending", adminauthmiddleware, selfServicePlanGate, asyncHandler(adminGetPending));
reimbursementRouter.get("/admin/all", adminauthmiddleware, selfServicePlanGate, asyncHandler(adminGetAll));
reimbursementRouter.post("/admin/approve", adminauthmiddleware, selfServicePlanGate, asyncHandler(adminApprove));
reimbursementRouter.post("/admin/reject", adminauthmiddleware, selfServicePlanGate, asyncHandler(adminReject));
reimbursementRouter.post("/admin/markPaid", adminauthmiddleware, selfServicePlanGate, asyncHandler(adminMarkPaid));

// ---- SuperAdmin ----------------------------------------------------------
// Reviewing Admin claims
reimbursementRouter.get(
  "/superadmin/pending",
  superadminmiddleware, selfServicePlanGate,
  asyncHandler(superadminGetPending),
);
reimbursementRouter.post(
  "/superadmin/approve",
  superadminmiddleware, selfServicePlanGate,
  asyncHandler(superadminApprove),
);
reimbursementRouter.post(
  "/superadmin/reject",
  superadminmiddleware, selfServicePlanGate,
  asyncHandler(superadminReject),
);
reimbursementRouter.post(
  "/superadmin/markPaid",
  superadminmiddleware, selfServicePlanGate,
  asyncHandler(superadminMarkPaid),
);

// Org-wide visibility: Employee + Manager + Admin claims, any status.
reimbursementRouter.get("/superadmin/all", superadminmiddleware, selfServicePlanGate, asyncHandler(superadminGetAll));

module.exports = reimbursementRouter;