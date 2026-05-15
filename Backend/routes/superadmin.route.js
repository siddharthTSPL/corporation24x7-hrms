const express = require("express");
const superAdminRouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  getMe,
  logoutSuperAdmin,
  updateSuperAdmin,
  changePassword,
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
  getTodayCheckins,
  getOrgInfo,
} = require("../controllers/superadmin.controller");

superAdminRouter.post("/register", asyncHandler(registerSuperAdmin));
superAdminRouter.get("/verify/:token", asyncHandler(verifySuperAdmin));
superAdminRouter.post("/login", asyncHandler(loginSuperAdmin));
superAdminRouter.post("/forgotpassword", asyncHandler(forgotPassword));
superAdminRouter.post("/verifyotp", asyncHandler(verifyOtp));
superAdminRouter.post("/resetpassword", asyncHandler(resetPassword));

superAdminRouter.get("/me", superAdminAuth, asyncHandler(getMe));
superAdminRouter.put("/update", superAdminAuth, asyncHandler(updateSuperAdmin));
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
  "/acceptleave/:id",
  superAdminAuth,
  asyncHandler(acceptleavebyadmin),
);
superAdminRouter.put(
  "/rejectleave/:id",
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
  "/gettodaycheckins",
  superAdminAuth,
  asyncHandler(getTodayCheckins),
);

module.exports = superAdminRouter;
