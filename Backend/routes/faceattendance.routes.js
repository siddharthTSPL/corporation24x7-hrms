const express = require("express");
const {
  enrollFace,
  listEnrolled,
  removeFace,
  scanFace,
  upload,
} = require("../controllers/faceattendance.controller");
const adminAuth = require("../middleware/auth/admin.middleware");
const kioskAuth = require("../middleware/auth/kiosk.middleware");

const router = express.Router();

// Admin-only: enroll/remove/list employee faces
router.post("/enroll", adminAuth, upload.single("photo"), enrollFace);
router.get("/enrolled", adminAuth, listEnrolled);
router.delete("/enrolled/:employeeId", adminAuth, removeFace);

// Kiosk-only: live scan for attendance
router.post("/scan", kioskAuth, scanFace);

module.exports = router;
