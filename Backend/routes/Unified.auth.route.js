const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const { unifiedLogin } = require("../controllers/unified.auth.controller");
 
// POST /api/auth/login  — auto-detects role from email
router.post("/login", asyncHandler(unifiedLogin));
 
module.exports = router;