const express = require("express");
const { checkin, activity, checkout } = require("../controllers/attendance.controller");
const authMiddleware = require("../middleware/auth/auth.middleware");
const attendancerouter = express.Router();

attendancerouter.post("/checkin", authMiddleware, checkin);
attendancerouter.post("/activity", authMiddleware, activity);
attendancerouter.post("/checkout", authMiddleware, checkout);

module.exports = attendancerouter;