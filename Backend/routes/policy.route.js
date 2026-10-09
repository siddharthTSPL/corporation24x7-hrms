const express = require("express");
const policyrouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminDelegatedAccess = require("../middleware/auth/adminDelegatedAccess.middleware");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const { policyDocumentUpload } = require("../middleware/auth/PolicyDocument.middleware");

const {
  createPolicy,
  addPolicyVersion,
  publishPolicyVersion,
  listPolicies,
  getPolicyDetail,
  updatePolicyMeta,
  archivePolicy,
  deletePolicy,
  getAcknowledgementReport,
  exportAcknowledgementReportCsv,
  getDashboardSummary,
} = require("../controllers/policy.controller");

const {
  getGateStatus,
  getMyPolicies,
  getMyPendingPolicies,
  viewPolicy,
  acknowledgePolicy,
  getMyAcknowledgementHistory,
  downloadCertificate,
} = require("../controllers/policyMe.controller");

const uploadFields = policyDocumentUpload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

// ── Management (SuperAdmin or Admin) ─────────────────────────────────────
const policyManagementAccess = adminDelegatedAccess("policy_management");
policyrouter.get("/manage/dashboard", policyManagementAccess, asyncHandler(getDashboardSummary));
policyrouter.get("/manage", policyManagementAccess, asyncHandler(listPolicies));
policyrouter.post("/manage", policyManagementAccess, uploadFields, asyncHandler(createPolicy));
policyrouter.get("/manage/:id", policyManagementAccess, asyncHandler(getPolicyDetail));
policyrouter.put("/manage/:id", policyManagementAccess, asyncHandler(updatePolicyMeta));
policyrouter.delete("/manage/:id", policyManagementAccess, asyncHandler(deletePolicy));
policyrouter.post("/manage/:id/versions", policyManagementAccess, uploadFields, asyncHandler(addPolicyVersion));
policyrouter.post("/manage/:id/publish", policyManagementAccess, asyncHandler(publishPolicyVersion));
policyrouter.post("/manage/:id/archive", policyManagementAccess, asyncHandler(archivePolicy));
policyrouter.get("/manage/:id/report", policyManagementAccess, asyncHandler(getAcknowledgementReport));
policyrouter.get("/manage/:id/report/export", policyManagementAccess, asyncHandler(exportAcknowledgementReportCsv));

// ── Viewer (any authenticated role: employee, manager, admin, super_admin) ──
policyrouter.get("/me/gate-status", anyRoleAuth, asyncHandler(getGateStatus));
policyrouter.get("/me/list", anyRoleAuth, asyncHandler(getMyPolicies));
policyrouter.get("/me/pending", anyRoleAuth, asyncHandler(getMyPendingPolicies));
policyrouter.get("/me/acknowledgements", anyRoleAuth, asyncHandler(getMyAcknowledgementHistory));
policyrouter.get("/me/:policyId/certificate", anyRoleAuth, asyncHandler(downloadCertificate));
policyrouter.get("/me/:policyId", anyRoleAuth, asyncHandler(viewPolicy));
policyrouter.post("/me/:policyId/acknowledge", anyRoleAuth, asyncHandler(acknowledgePolicy));

module.exports = policyrouter;
