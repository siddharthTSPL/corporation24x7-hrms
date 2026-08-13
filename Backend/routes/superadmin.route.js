const express = require("express");
const superAdminRouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const supportUpload = require("../middleware/upload/supportAttachments.middleware");
const { sendSupportRequest } = require("../controllers/support.controller");
const {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  getMe,
  logoutSuperAdmin,
  updateSuperAdmin,
  changePassword,
  setKioskPassword,
  getKioskPasswordStatus,
  forgotPassword,
  verifyOtp,
  resetPassword,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  addmanager,
  addemployee,
  findallmanagers,
  getallemployee,
  editemployee,
  getperticularemployee,
  getperticularemanager,
  deleteemployee,
  showallleaves,
  acceptleavebyadmin,
  rejectleavebyadmin,
  noofemployee,
  createannouncement,
  getallannouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reviewtoadmin,
  getAllReviewsForSuperAdmin,
  getTodayCheckins,
  getAttendanceOverview,
  getAttendanceHistory,
  getOrgInfo,
  getAllPersonalDocumentsSuperAdmin,
  getAllExpenseDocumentsSuperAdmin,
  getDocumentDetailsSuperAdmin,
  updatePermissions,
  getPermissions,
  setAdminWorkingStatus,
  getInactiveUsers,
  getActiveUserCount,
  getLeavePolicy,
  setLeavePolicy,
  getperticularadmin

} = require("../controllers/superadmin.controller");


const {
  createAssetSuperAdmin,
  updateAssetSuperAdmin,
  assignAssetToAdminSuperAdmin,
  revokeAssetFromAdminSuperAdmin,
  getAllAssetsSuperAdmin,
  getAssetByIdSuperAdmin,
  deleteAssetSuperAdmin,
  getAssetsOfPerson,
  getEmployeesWithAssets,
  getEmployeeAssetHistory,
} = require("../controllers/asset.controller");

superAdminRouter.post("/register", asyncHandler(registerSuperAdmin));
superAdminRouter.get("/verify/:token", asyncHandler(verifySuperAdmin));
superAdminRouter.post("/login", asyncHandler(loginSuperAdmin));
superAdminRouter.post("/forgot-password", asyncHandler(forgotPassword));
superAdminRouter.post("/verify-otp", asyncHandler(verifyOtp));
superAdminRouter.post("/resetpassword", asyncHandler(resetPassword));

superAdminRouter.get("/me", superAdminAuth, asyncHandler(getMe));
superAdminRouter.put("/update-profile", superAdminAuth, asyncHandler(updateSuperAdmin));
superAdminRouter.put(
  "/changepassword",
  superAdminAuth,
  asyncHandler(changePassword),
);
superAdminRouter.post(
  "/logout",
  superAdminAuth,
  asyncHandler(logoutSuperAdmin),
);
superAdminRouter.put(
  "/kiosk-password",
  superAdminAuth,
  asyncHandler(setKioskPassword),
);
superAdminRouter.get(
  "/kiosk-password/status",
  superAdminAuth,
  asyncHandler(getKioskPasswordStatus),
);
superAdminRouter.get("/getorginfo", superAdminAuth, asyncHandler(getOrgInfo));

superAdminRouter.post(
  "/admin/create",
  superAdminAuth,
  asyncHandler(createAdmin),
);
superAdminRouter.get("/admin/all", superAdminAuth, asyncHandler(getAllAdmins));
superAdminRouter.put(
  "/admin/update/:id",
  superAdminAuth,
  asyncHandler(updateAdmin),
);
superAdminRouter.delete(
  "/admin/delete/:id",
  superAdminAuth,
  asyncHandler(deleteAdmin),
);

superAdminRouter.post("/addmanager", superAdminAuth, asyncHandler(addmanager));
superAdminRouter.post(
  "/addemployee",
  superAdminAuth,
  asyncHandler(addemployee),
);
superAdminRouter.get(
  "/findallmanagers",
  superAdminAuth,
  asyncHandler(findallmanagers),
);
superAdminRouter.get(
  "/getallemployee",
  superAdminAuth,
  asyncHandler(getallemployee),
);
superAdminRouter.put(
  "/editemployee/:uid",
  superAdminAuth,
  asyncHandler(editemployee),
);
superAdminRouter.get(
  "/getperticularemployee/:uid",
  superAdminAuth,
  asyncHandler(getperticularemployee),
);
superAdminRouter.get(
  "/getperticularemanager/:uid",
  superAdminAuth,
  asyncHandler(getperticularemanager),
);
superAdminRouter.delete(
  "/deleteuser/:uid",
  superAdminAuth,
  asyncHandler(deleteemployee),
);

superAdminRouter.get(
  "/showallleaves",
  superAdminAuth,
  asyncHandler(showallleaves),
);
superAdminRouter.put(
  "/accept-leave/:id",
  superAdminAuth,
  asyncHandler(acceptleavebyadmin),
);
superAdminRouter.put(
  "/reject-leave/:id",
  superAdminAuth,
  asyncHandler(rejectleavebyadmin),
);

superAdminRouter.get(
  "/noofemployee",
  superAdminAuth,
  asyncHandler(noofemployee),
);

superAdminRouter.post(
  "/createannouncement",
  superAdminAuth,
  asyncHandler(createannouncement),
);
superAdminRouter.get(
  "/getallannouncement",
  superAdminAuth,
  asyncHandler(getallannouncement),
);
superAdminRouter.put(
  "/updateannouncement/:id",
  superAdminAuth,
  asyncHandler(updateAnnouncement),
);
superAdminRouter.delete(
  "/deleteannouncement/:id",
  superAdminAuth,
  asyncHandler(deleteAnnouncement),
);

superAdminRouter.post(
  "/reviewtoadmin",
  superAdminAuth,
  asyncHandler(reviewtoadmin),
);

superAdminRouter.get(
  "/allreviews",
  superAdminAuth,
  asyncHandler(getAllReviewsForSuperAdmin),
);
superAdminRouter.get(
  "/gettodaycheckins",
  superAdminAuth,
  asyncHandler(getTodayCheckins),
);
superAdminRouter.get(
  "/attendance-overview",
  superAdminAuth,
  asyncHandler(getAttendanceOverview),
);
superAdminRouter.get(
  "/attendance-history/:employeeId",
  superAdminAuth,
  asyncHandler(getAttendanceHistory),
);

superAdminRouter.get(
  "/getallpersonaldocuments",
  superAdminAuth,
  asyncHandler(getAllPersonalDocumentsSuperAdmin),
);
superAdminRouter.get(
  "/getallexpensedocuments",
  superAdminAuth,
  asyncHandler(getAllExpenseDocumentsSuperAdmin),
);
superAdminRouter.get(
  "/getdocumentdetails/:id",
  superAdminAuth,
  asyncHandler(getDocumentDetailsSuperAdmin),
);

superAdminRouter.put(
  "/updatepermissions/:id",
  superAdminAuth,
  asyncHandler(updatePermissions),
);

superAdminRouter.get(
  "/getpermissions/:id",
  superAdminAuth,
  asyncHandler(getPermissions),
);

superAdminRouter.patch(
  "/admin/:id/working-status",
  superAdminAuth,
  asyncHandler(setAdminWorkingStatus),
);
superAdminRouter.get(
  "/inactive-users",
  superAdminAuth,
  asyncHandler(getInactiveUsers),
);
superAdminRouter.get(
  "/active-user-count",
  superAdminAuth,
  asyncHandler(getActiveUserCount),
);

superAdminRouter.get(
  "/leave-policy",
  superAdminAuth,
  asyncHandler(getLeavePolicy),
);
superAdminRouter.post(
  "/leave-policy",
  superAdminAuth,
  asyncHandler(setLeavePolicy),
);

superAdminRouter.get("/getperticularadmin/:uid", superAdminAuth, asyncHandler(getperticularadmin));



// assest route
superAdminRouter.post("/assets", superAdminAuth, asyncHandler(createAssetSuperAdmin));
superAdminRouter.get("/assets", superAdminAuth, asyncHandler(getAllAssetsSuperAdmin));
// Employee-wise asset views (kept above "/assets/:id" so "employees" isn't swallowed as an :id)
superAdminRouter.get("/assets/employees", superAdminAuth, asyncHandler(getEmployeesWithAssets));
superAdminRouter.get(
  "/assets/employees/:person_id/:person_model/history",
  superAdminAuth,
  asyncHandler(getEmployeeAssetHistory)
);
superAdminRouter.get("/assets/:id", superAdminAuth, asyncHandler(getAssetByIdSuperAdmin));
superAdminRouter.put("/assets/:id", superAdminAuth, asyncHandler(updateAssetSuperAdmin));
superAdminRouter.delete("/assets/:id", superAdminAuth, asyncHandler(deleteAssetSuperAdmin));
superAdminRouter.patch("/assets/:id/assign-admin", superAdminAuth, asyncHandler(assignAssetToAdminSuperAdmin));
superAdminRouter.patch("/assets/:id/revoke", superAdminAuth, asyncHandler(revokeAssetFromAdminSuperAdmin));
superAdminRouter.get("/assets/person/:person_id/:person_model", superAdminAuth, asyncHandler(getAssetsOfPerson));

// Help & Support form — no permission gate, super admin can reach support too.
superAdminRouter.post("/contact-support", superAdminAuth, supportUpload.array("attachments", 5), asyncHandler(sendSupportRequest));

module.exports = superAdminRouter;