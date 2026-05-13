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
} = require("../controllers/superadmin.controller");

superAdminRouter.post("/register", asyncHandler(registerSuperAdmin));
superAdminRouter.get("/verify/:token", asyncHandler(verifySuperAdmin));
superAdminRouter.post("/login", asyncHandler(loginSuperAdmin));
superAdminRouter.post("/forgotpassword", asyncHandler(forgotPassword));
superAdminRouter.post("/verifyotp", asyncHandler(verifyOtp));
superAdminRouter.post("/resetpassword", asyncHandler(resetPassword));

superAdminRouter.get("/getme", superAdminAuth, asyncHandler(getMe));
superAdminRouter.put("/update", superAdminAuth, asyncHandler(updateSuperAdmin));
superAdminRouter.put("/changepassword", superAdminAuth, asyncHandler(changePassword));
superAdminRouter.post("/logout", superAdminAuth, asyncHandler(logoutSuperAdmin));

superAdminRouter.post("/admin/create", superAdminAuth, asyncHandler(createAdmin));
superAdminRouter.put("/admin/update/:id", superAdminAuth, asyncHandler(updateAdmin));
superAdminRouter.delete("/admin/delete/:id", superAdminAuth, asyncHandler(deleteAdmin));

module.exports = superAdminRouter;