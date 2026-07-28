const express = require("express");
const reimbursementRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const managermiddleware = require("../middleware/auth/manager.middleware");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const superadminmiddleware = require("../middleware/auth/superadmin.middleware");
const supportUpload = require("../middleware/upload/Supportattachments.middleware");

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
  employeemiddleware,
  claimAttachments,
  asyncHandler(employeeApply),
);
reimbursementRouter.put(
  "/employee/update/:id",
  employeemiddleware,
  claimAttachments,
  asyncHandler(employeeUpdate),
);
reimbursementRouter.delete(
  "/employee/delete/:id",
  employeemiddleware,
  asyncHandler(employeeDelete),
);
reimbursementRouter.get("/employee/my", employeemiddleware, asyncHandler(employeeGetMy));

// ---- Manager ------------------------------------------------------------
reimbursementRouter.post(
  "/manager/apply",
  managermiddleware,
  claimAttachments,
  asyncHandler(managerApply),
);
reimbursementRouter.put(
  "/manager/update/:id",
  managermiddleware,
  claimAttachments,
  asyncHandler(managerUpdate),
);
reimbursementRouter.delete(
  "/manager/delete/:id",
  managermiddleware,
  asyncHandler(managerDelete),
);
reimbursementRouter.get("/manager/my", managermiddleware, asyncHandler(managerGetMy));

// ---- Admin ---------------------------------------------------------------
// Own claims (escalate to SuperAdmin)
reimbursementRouter.post(
  "/admin/apply",
  adminauthmiddleware,
  claimAttachments,
  asyncHandler(adminApply),
);
reimbursementRouter.put(
  "/admin/update/:id",
  adminauthmiddleware,
  claimAttachments,
  asyncHandler(adminUpdate),
);
reimbursementRouter.delete(
  "/admin/delete/:id",
  adminauthmiddleware,
  asyncHandler(adminDelete),
);
reimbursementRouter.get("/admin/my", adminauthmiddleware, asyncHandler(adminGetMy));

// Reviewing Employee + Manager claims
reimbursementRouter.get("/admin/pending", adminauthmiddleware, asyncHandler(adminGetPending));
reimbursementRouter.get("/admin/all", adminauthmiddleware, asyncHandler(adminGetAll));
reimbursementRouter.post("/admin/approve", adminauthmiddleware, asyncHandler(adminApprove));
reimbursementRouter.post("/admin/reject", adminauthmiddleware, asyncHandler(adminReject));
reimbursementRouter.post("/admin/markPaid", adminauthmiddleware, asyncHandler(adminMarkPaid));

// ---- SuperAdmin ----------------------------------------------------------
// Reviewing Admin claims
reimbursementRouter.get(
  "/superadmin/pending",
  superadminmiddleware,
  asyncHandler(superadminGetPending),
);
reimbursementRouter.post(
  "/superadmin/approve",
  superadminmiddleware,
  asyncHandler(superadminApprove),
);
reimbursementRouter.post(
  "/superadmin/reject",
  superadminmiddleware,
  asyncHandler(superadminReject),
);
reimbursementRouter.post(
  "/superadmin/markPaid",
  superadminmiddleware,
  asyncHandler(superadminMarkPaid),
);

// Org-wide visibility: Employee + Manager + Admin claims, any status.
reimbursementRouter.get("/superadmin/all", superadminmiddleware, asyncHandler(superadminGetAll));

module.exports = reimbursementRouter;