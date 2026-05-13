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
} = require("../controllers/superadmin.controller");

superAdminRouter.post("/register", asyncHandler(registerSuperAdmin));
superAdminRouter.get("/verify/:token", asyncHandler(verifySuperAdmin));
superAdminRouter.post("/login", asyncHandler(loginSuperAdmin));
superAdminRouter.get("/getme", superAdminAuth, asyncHandler(getMe));
superAdminRouter.post("/logout", superAdminAuth, asyncHandler(logoutSuperAdmin));

module.exports = superAdminRouter;