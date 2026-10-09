const express = require("express");
const adminrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");
const leaveDocumentUpload = require("../middleware/upload/Leavedocument.middleware");
const checkPermission = require("../middleware/auth/Checkpermission.middleware");
const adminDelegatedAccess = require("../middleware/auth/adminDelegatedAccess.middleware");
const {
  restrictPlanFeature,
} = require("../middleware/auth/planFeatureGate.middleware");
const { cacheRoute } = require("../middleware/cache/cache.middleware");

// Performance Management (Review), Asset Management, and TorchX Voice are
// plan-gated features: fully locked on the Basic plan, fully open on
// Advance/enterprise (or during the free trial).
const reviewPlanGate = restrictPlanFeature("review");
const ticketsPlanGate = restrictPlanFeature("tickets");
const onboardingAccess = adminDelegatedAccess("onboarding");
const onboardingOrTorchXAccess = adminDelegatedAccess(["onboarding", "torchx_management"]);
const assetManagementAccess = adminDelegatedAccess("asset_management");
// Self Service Portal — Leave, Reimbursements, and Document/File
// self-management — is likewise fully locked on Basic and fully open on
// Advance/enterprise (or during the free trial).
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
const { sendSupportRequest } = require("../controllers/support.controller");
const supportUpload = require("../middleware/upload/supportAttachments.middleware");
const bulkOnboardingUpload = require("../middleware/upload/Bulkonboarding.middleware");
const {
  downloadEmployeeTemplate,
  bulkUploadEmployees,
  bulkImportFromGoogleSheet,
} = require("../controllers/bulkOnboarding.controller");

const {
  verifyAdmin,
  adminlogin,
  adminlogout,
  getMyAttendanceHistory,
  addmanager,
  addemployee,
  findallmanagers,
  findallemployeesfull,
  getallemployee,
  getMyTeamOverview,
  editemployee,
  editmanager,
  promoteEmployeeToManager,
  promoteManagerToAdmin,
  promoteEmployeeToAdmin,
  demoteManagerToEmployee,
  demoteAdminToManager,
  demoteAdminToEmployee,
  changeManagerRole,
  getperticularemployee,
  getperticularemanager,
  deleteemployee,
  showallleaves,
  forwardAdminLeave,
  acceptLeave,
  rejectLeave,
  applyleave,
  editleaveadmin,
  deleteleaveadmin,
  getmyleavehistory,
  noofemployee,
  createannouncement,
  getallannouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reviewtomanager,
  getAllReviewsForAdmin,
  forgetpasswordloginotp,
  verifyAotp,
  resetAdminPassword,
  getme,
  editadminprofile,
  changepassword,
  getTodayCheckins,
  getAttendanceOverview,
  getAttendanceHistory,
  getOrgInfo,
  getAllPersonalDocumentsAdmin,
  getAllExpenseDocumentsAdmin,
  getDocumentDetailsAdmin,
  adminActionOnLeave,
  adminSubmitTicket,
  adminGetMyTickets,
  adminRateTicket,
  adminGetTicketDetail,
  findallmanagerswoadmin,
  setEmployeeWorkingStatus,
  setManagerWorkingStatus,
  getInactiveUsers,
  getActiveUserCount,
  getAllAdminsForOrg,
  respondToMyReview,
  hrAcknowledgeReviewHandler,
} = require("../controllers/admin.controller");

const {
  uploadDocument,
  getDocuments,
  editDocument,
  deleteDocument,
} = require("../controllers/uploaddocument.controller");

const {
  createAssetAdmin,
  updateAssetAdmin,
  assignAssetToEmployee,
  assignAssetToManager,
  revokeAssetAdmin,
  getAllAssetsAdmin,
  getAssetByIdAdmin,
  deleteAssetAdmin,
  getAssetsOfPerson,
  getEmployeesWithAssets,
  getEmployeeAssetHistory,
  getMyAssets,
} = require("../controllers/asset.controller");

adminrouter.get("/verify/:token", asyncHandler(verifyAdmin));
adminrouter.post("/login", asyncHandler(adminlogin));
adminrouter.post("/forgetpassword", asyncHandler(forgetpasswordloginotp));
adminrouter.post("/verifyotp", asyncHandler(verifyAotp));
adminrouter.post("/resetpassword", asyncHandler(resetAdminPassword));

adminrouter.post("/logout", adminauthmiddleware, asyncHandler(adminlogout));
// getme is the "who am I / what's my dashboard" call — fired on nearly
// every page load and hits Admin + LeaveBalance + Review in parallel.
// Cached 30s per admin (never per-org — this is one person's own data,
// so the key MUST be their own _id or two admins in the same org would
// see each other's profile/reviews).
adminrouter.get(
  "/getme",
  adminauthmiddleware,
  cacheRoute(30_000, (req) => `user:${req.admin._id}:${req.originalUrl}`),
  asyncHandler(getme),
);
adminrouter.get(
  "/getattendance",
  adminauthmiddleware,
  asyncHandler(getMyAttendanceHistory),
);
adminrouter.put(
  "/editadminprofile",
  adminauthmiddleware,
  asyncHandler(editadminprofile),
);
adminrouter.put(
  "/changepassword",
  adminauthmiddleware,
  asyncHandler(changepassword),
);
adminrouter.get("/getorginfo", adminauthmiddleware, asyncHandler(getOrgInfo));
adminrouter.get(
  "/noofemployee",
  adminauthmiddleware,
  asyncHandler(noofemployee),
);
adminrouter.get(
  "/gettodaycheckins",
  adminauthmiddleware,
  asyncHandler(getTodayCheckins),
);
adminrouter.get(
  "/attendance-overview",
  adminauthmiddleware,
  asyncHandler(getAttendanceOverview),
);
adminrouter.get(
  "/attendance-history/:employeeId",
  adminauthmiddleware,
  asyncHandler(getAttendanceHistory),
);

adminrouter.post("/addmanager", onboardingAccess, asyncHandler(addmanager));
adminrouter.post(
  "/addemployee",
  onboardingAccess,
  asyncHandler(addemployee),
);

adminrouter.get(
  "/employees/bulk-template",
  onboardingAccess,
  asyncHandler(downloadEmployeeTemplate),
);
adminrouter.post(
  "/employees/bulk-upload",
  onboardingAccess,
  bulkOnboardingUpload.single("file"),
  asyncHandler(bulkUploadEmployees),
);
adminrouter.post(
  "/employees/bulk-import-sheet",
  onboardingAccess,
  asyncHandler(bulkImportFromGoogleSheet),
);
adminrouter.get(
  "/findallmanagers",
  onboardingAccess,
  asyncHandler(findallmanagers),
);

adminrouter.get(
  "/findallemployeesfull",
  onboardingOrTorchXAccess,
  asyncHandler(findallemployeesfull),
);

adminrouter.get(
  "/getallemployee",
  onboardingOrTorchXAccess,
  asyncHandler(getallemployee),
);
adminrouter.get(
  "/dashboard/myteam",
  adminauthmiddleware,
  asyncHandler(getMyTeamOverview),
);
adminrouter.put(
  "/editemployee/:id",
  onboardingAccess,
  asyncHandler(editemployee),
);
adminrouter.put(
  "/editmanager/:id",
  onboardingAccess,
  asyncHandler(editmanager),
);
adminrouter.get(
  "/getperticularemployee/:id",
  onboardingAccess,
  asyncHandler(getperticularemployee),
);
adminrouter.get(
  "/getperticularemanager/:id",
  onboardingAccess,
  asyncHandler(getperticularemanager),
);
adminrouter.delete(
  "/deleteuser/:id",
  onboardingAccess,
  asyncHandler(deleteemployee),
);

adminrouter.post(
  "/employee/:id/promote/manager",
  onboardingAccess,
  asyncHandler(promoteEmployeeToManager),
);
adminrouter.post(
  "/employee/:id/promote/admin",
  adminauthmiddleware,
  asyncHandler(promoteEmployeeToAdmin),
);
adminrouter.post(
  "/manager/:id/promote/admin",
  adminauthmiddleware,
  asyncHandler(promoteManagerToAdmin),
);
adminrouter.post(
  "/manager/:id/demote/employee",
  onboardingAccess,
  asyncHandler(demoteManagerToEmployee),
);
adminrouter.post(
  "/admin/:id/demote/manager",
  adminauthmiddleware,
  asyncHandler(demoteAdminToManager),
);
adminrouter.post(
  "/admin/:id/demote/employee",
  adminauthmiddleware,
  asyncHandler(demoteAdminToEmployee),
);
adminrouter.put(
  "/manager/:id/role",
  onboardingAccess,
  asyncHandler(changeManagerRole),
);

adminrouter.get(
  "/showallleaves",
  adminauthmiddleware,
  asyncHandler(showallleaves),
);
adminrouter.post(
  "/applyleave",
  adminauthmiddleware,
  leaveDocumentUpload.single("supportingDocument"),
  asyncHandler(applyleave)
);

adminrouter.put(
  "/editleave/:id",
  adminauthmiddleware,
  leaveDocumentUpload.single("supportingDocument"),
  asyncHandler(editleaveadmin)
);
adminrouter.get(
  "/getmyleavehistory",
  adminauthmiddleware,
  asyncHandler(getmyleavehistory),
);
adminrouter.put(
  "/acceptleave/:id",
  adminauthmiddleware,
  asyncHandler(acceptLeave),
);
adminrouter.put(
  "/rejectleave/:id",
  adminauthmiddleware,
  asyncHandler(rejectLeave),
);
adminrouter.post(
  "/forwardleave",
  adminauthmiddleware,
  asyncHandler(forwardAdminLeave),
);
adminrouter.post(
  "/actionleave",
  adminauthmiddleware,
  asyncHandler(adminActionOnLeave),
);

adminrouter.post(
  "/reviewtomanager",
  adminauthmiddleware,
  reviewPlanGate,
  asyncHandler(reviewtomanager),
);

adminrouter.get(
  "/allreviews",
  adminauthmiddleware,
  reviewPlanGate,
  asyncHandler(getAllReviewsForAdmin),
);

// Step 2 — this Admin, as the *reviewee* of a review a SuperAdmin gave them,
// accepts or disputes it.
adminrouter.post(
  "/review/respond",
  adminauthmiddleware,
  reviewPlanGate,
  asyncHandler(respondToMyReview),
);

// Step 3 — FINAL approval. Only reachable by an Admin flagged isHR === true
// (enforced inside the handler); applies org-wide regardless of who the
// reviewer/reviewee were.
adminrouter.post(
  "/review/hr-acknowledge",
  adminauthmiddleware,
  reviewPlanGate,
  asyncHandler(hrAcknowledgeReviewHandler),
);

adminrouter.get(
  "/getallannouncement",
  adminauthmiddleware,
  checkPermission("announcements.can_view_announcements"),
  asyncHandler(getallannouncement),
);
adminrouter.post(
  "/createannouncement",
  adminauthmiddleware,
  checkPermission("announcements.can_create_announcement"),
  asyncHandler(createannouncement),
);
adminrouter.put(
  "/updateannouncement/:id",
  adminauthmiddleware,
  checkPermission("announcements.can_edit_announcement"),
  asyncHandler(updateAnnouncement),
);
adminrouter.delete(
  "/deleteannouncement/:id",
  adminauthmiddleware,
  checkPermission("announcements.can_delete_announcement"),
  asyncHandler(deleteAnnouncement),
);

adminrouter.post(
  "/upload",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  upload.single("file"),
  uploadDocument,
);
adminrouter.put(
  "/documents/:id",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  upload.single("file"),
  editDocument,
);
adminrouter.delete(
  "/documents/:id",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  deleteDocument,
);
adminrouter.get(
  "/documents/personal",
  adminauthmiddleware,
  checkPermission("documents.can_view_all_documents"),
  asyncHandler(getAllPersonalDocumentsAdmin),
);
adminrouter.get(
  "/documents/expense",
  adminauthmiddleware,
  checkPermission("documents.can_view_all_documents"),
  asyncHandler(getAllExpenseDocumentsAdmin),
);
adminrouter.get(
  "/documents/:documentId",
  adminauthmiddleware,
  checkPermission("documents.can_view_all_documents"),
  asyncHandler(getDocumentDetailsAdmin),
);

adminrouter.post(
  "/submitTicket",
  adminauthmiddleware,
  ticketsPlanGate,
  checkPermission("tickets.can_raise_ticket"),
  asyncHandler(adminSubmitTicket),
);
adminrouter.get(
  "/getMyTickets",
  adminauthmiddleware,
  ticketsPlanGate,
  checkPermission("tickets.can_view_all_tickets"),
  asyncHandler(adminGetMyTickets),
);
adminrouter.get(
  "/getTicketDetail/:ticketNumber",
  adminauthmiddleware,
  ticketsPlanGate,
  checkPermission("tickets.can_view_all_tickets"),
  asyncHandler(adminGetTicketDetail),
);
adminrouter.post(
  "/rateTicket/:ticketNumber",
  adminauthmiddleware,
  ticketsPlanGate,
  checkPermission("tickets.can_rate_ticket"),
  asyncHandler(adminRateTicket),
);

adminrouter.get(
  "/documents",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  asyncHandler(getDocuments),
);

adminrouter.get(
  "/all-no-admin",
  onboardingAccess,
  asyncHandler(findallmanagerswoadmin),
);

adminrouter.put(
  "/employee/:id/working-status",
  onboardingAccess,
  asyncHandler(setEmployeeWorkingStatus),
);

adminrouter.put(
  "/manager/:id/working-status",
  onboardingAccess,
  asyncHandler(setManagerWorkingStatus),
);
adminrouter.get(
  "/all-admins",
  adminOrSuperAdminAuth,
  asyncHandler(getAllAdminsForOrg),
);

adminrouter.get(
  "/inactive-users",
  onboardingAccess,
  asyncHandler(getInactiveUsers),
);
adminrouter.get("/active-user-count", onboardingAccess, getActiveUserCount);

// ── Asset Management (Admin) — plan-gated: locked on Basic ─────────────────────
adminrouter.post(
  "/assets",
  assetManagementAccess,
  asyncHandler(createAssetAdmin),
);
adminrouter.get(
  "/assets",
  assetManagementAccess,
  asyncHandler(getAllAssetsAdmin),
);
// Employee-wise asset views (kept above "/assets/:id" so "employees" isn't swallowed as an :id)
adminrouter.get(
  "/assets/employees",
  assetManagementAccess,
  asyncHandler(getEmployeesWithAssets),
);
adminrouter.get(
  "/assets/employees/:person_id/:person_model/history",
  assetManagementAccess,
  asyncHandler(getEmployeeAssetHistory),
);
adminrouter.get(
  "/assets/:id",
  assetManagementAccess,
  asyncHandler(getAssetByIdAdmin),
);
adminrouter.put(
  "/assets/:id",
  assetManagementAccess,
  asyncHandler(updateAssetAdmin),
);
adminrouter.delete(
  "/assets/:id",
  assetManagementAccess,
  asyncHandler(deleteAssetAdmin),
);
adminrouter.patch(
  "/assets/:id/assign-employee",
  assetManagementAccess,
  asyncHandler(assignAssetToEmployee),
);
adminrouter.patch(
  "/assets/:id/assign-manager",
  assetManagementAccess,
  asyncHandler(assignAssetToManager),
);
adminrouter.patch(
  "/assets/:id/revoke",
  assetManagementAccess,
  asyncHandler(revokeAssetAdmin),
);
adminrouter.get(
  "/assets/person/:person_id/:person_model",
  assetManagementAccess,
  asyncHandler(getAssetsOfPerson),
);

// Assets assigned to the logged-in admin themself (e.g. by SuperAdmin) — Dashboard / Settings "My Assets" widget
adminrouter.get("/my-assets", adminauthmiddleware, asyncHandler(getMyAssets));

// Help & Support form — no permission gate, every logged-in admin can reach support.
adminrouter.post(
  "/contact-support",
  adminauthmiddleware,
  supportUpload.array("attachments", 5),
  asyncHandler(sendSupportRequest),
);

module.exports = adminrouter;
