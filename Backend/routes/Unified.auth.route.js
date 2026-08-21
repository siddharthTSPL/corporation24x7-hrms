const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const {
  unifiedLogin,
  unifiedSendForgotPasswordOtp,
  unifiedVerifyForgotPasswordOtp,
  unifiedResetPassword,
  dismissWelcomeMessage,
  generateCompanionLink,
  redeemCompanionLink,
} = require("../controllers/Unified.auth.controller");

// POST /auth/login  — auto-detects role from email
router.post("/login", asyncHandler(unifiedLogin));

// POST /auth/forgot-password/send-otp — auto-detects role from email
router.post("/forgot-password/send-otp", asyncHandler(unifiedSendForgotPasswordOtp));

// POST /auth/forgot-password/verify-otp — auto-detects role from email
router.post("/forgot-password/verify-otp", asyncHandler(unifiedVerifyForgotPasswordOtp));

// POST /auth/forgot-password/reset-password — uses the resetToken cookie set by verify-otp
router.post("/forgot-password/reset-password", asyncHandler(unifiedResetPassword));

// POST /auth/dismiss-welcome — marks the first-login welcome popup as seen
router.post("/dismiss-welcome", anyRoleAuth, asyncHandler(dismissWelcomeMessage));

// GET /auth/companion-link — from an already logged-in browser (any role),
// mints a short-lived link that can be opened in a different browser to
// sign in there too, so activity pings (and everything else) work from
// that browser as well without retyping the password.
router.get("/companion-link", anyRoleAuth, asyncHandler(generateCompanionLink));

// POST /auth/companion-login — called from the OTHER browser after opening
// the link above; sets a normal session cookie on that browser. No auth
// middleware here on purpose — this browser has no session yet.
router.post("/companion-login", asyncHandler(redeemCompanionLink));

module.exports = router;