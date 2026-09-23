const express = require("express");
const policyrouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");
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
policyrouter.get("/manage/dashboard", adminOrSuperAdminAuth, asyncHandler(getDashboardSummary));
policyrouter.get("/manage", adminOrSuperAdminAuth, asyncHandler(listPolicies));
policyrouter.post("/manage", adminOrSuperAdminAuth, uploadFields, asyncHandler(createPolicy));
policyrouter.get("/manage/:id", adminOrSuperAdminAuth, asyncHandler(getPolicyDetail));
policyrouter.put("/manage/:id", adminOrSuperAdminAuth, asyncHandler(updatePolicyMeta));
policyrouter.delete("/manage/:id", adminOrSuperAdminAuth, asyncHandler(deletePolicy));
policyrouter.post("/manage/:id/versions", adminOrSuperAdminAuth, uploadFields, asyncHandler(addPolicyVersion));
policyrouter.post("/manage/:id/publish", adminOrSuperAdminAuth, asyncHandler(publishPolicyVersion));
policyrouter.post("/manage/:id/archive", adminOrSuperAdminAuth, asyncHandler(archivePolicy));
policyrouter.get("/manage/:id/report", adminOrSuperAdminAuth, asyncHandler(getAcknowledgementReport));
policyrouter.get("/manage/:id/report/export", adminOrSuperAdminAuth, asyncHandler(exportAcknowledgementReportCsv));

// ── Viewer (any authenticated role: employee, manager, admin, super_admin) ──
policyrouter.get("/me/gate-status", anyRoleAuth, asyncHandler(getGateStatus));
policyrouter.get("/me/list", anyRoleAuth, asyncHandler(getMyPolicies));
policyrouter.get("/me/pending", anyRoleAuth, asyncHandler(getMyPendingPolicies));
policyrouter.get("/me/acknowledgements", anyRoleAuth, asyncHandler(getMyAcknowledgementHistory));
policyrouter.get("/me/:policyId/certificate", anyRoleAuth, asyncHandler(downloadCertificate));
policyrouter.get("/me/:policyId", anyRoleAuth, asyncHandler(viewPolicy));
policyrouter.post("/me/:policyId/acknowledge", anyRoleAuth, asyncHandler(acknowledgePolicy));

module.exports = policyrouter;