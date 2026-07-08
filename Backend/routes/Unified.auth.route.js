const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const {
  unifiedLogin,
  unifiedSendForgotPasswordOtp,
  unifiedVerifyForgotPasswordOtp,
} = require("../controllers/Unified.auth.controller");

// POST /auth/login  — auto-detects role from email
router.post("/login", asyncHandler(unifiedLogin));

// POST /auth/forgot-password/send-otp — auto-detects role from email
router.post("/forgot-password/send-otp", asyncHandler(unifiedSendForgotPasswordOtp));

// POST /auth/forgot-password/verify-otp — auto-detects role from email
router.post("/forgot-password/verify-otp", asyncHandler(unifiedVerifyForgotPasswordOtp));

module.exports = router;