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

module.exports = router;
