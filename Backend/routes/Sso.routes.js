const express = require("express");
const ssoRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const {
  listProviders,
  startSso,
  ssoCallback,
  exchangeSsoTicket,
  getSsoSettings,
  updateSsoSettings,
} = require("../controllers/Sso.controller");

// Public (login screen)
ssoRouter.get("/providers", listProviders);
ssoRouter.post("/exchange", asyncHandler(exchangeSsoTicket));
ssoRouter.get("/:provider/start", startSso);
ssoRouter.get("/:provider/callback", asyncHandler(ssoCallback));

// SuperAdmin: per-organisation settings
ssoRouter.get("/settings", superAdminAuth, getSsoSettings);
ssoRouter.patch("/settings", superAdminAuth, asyncHandler(updateSsoSettings));

module.exports = ssoRouter;