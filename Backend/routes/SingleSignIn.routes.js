const express = require("express");
const singleSignInRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const { restrictPlanFeature } = require("../middleware/auth/planFeatureGate.middleware");

const {
  getMyPendingChallenge,
  pollChallengeStatus,
  respondToChallenge,
  finalizeApprovedLogin,
  signOutAllOtherSessions,
  listOrgSessions,
  updateSingleSignInSettings,
  getSingleSignInSettings,
} = require("../controllers/SingleSignIn.controller");

// --- Any logged-in role: acting on a challenge from the OLD device, or
// clearing your own other sessions. ---
singleSignInRouter.get("/challenge/mine", anyRoleAuth, asyncHandler(getMyPendingChallenge));
singleSignInRouter.post("/challenge/respond", anyRoleAuth, asyncHandler(respondToChallenge));
singleSignInRouter.post("/sessions/sign-out-others", anyRoleAuth, asyncHandler(signOutAllOtherSessions));

// --- Unauthenticated: used by the login screen itself, before a full
// session/cookie exists for the new device. ---
singleSignInRouter.get("/challenge/:sessionId", asyncHandler(pollChallengeStatus));
singleSignInRouter.post("/challenge/finalize", asyncHandler(finalizeApprovedLogin));

// --- SuperAdmin only, and gated to Advance/enterprise plans ---
singleSignInRouter.get(
  "/settings",
  superAdminAuth,
  asyncHandler(getSingleSignInSettings)
);
singleSignInRouter.patch(
  "/settings",
  superAdminAuth,
  restrictPlanFeature("single_sign_in"),
  asyncHandler(updateSingleSignInSettings)
);
singleSignInRouter.get(
  "/sessions",
  superAdminAuth,
  restrictPlanFeature("single_sign_in"),
  asyncHandler(listOrgSessions)
);

module.exports = singleSignInRouter;