const express = require("express");
const { checkin, activity, checkout , getToday,getMyShift, getCalendarMeta} = require("../controllers/attendance.controller");
const authMiddleware = require("../middleware/auth/auth.middleware");
const attendancerouter = express.Router();

attendancerouter.post("/checkin", authMiddleware, checkin);
attendancerouter.post("/activity", authMiddleware, activity);
attendancerouter.post("/checkout", authMiddleware, checkout);
attendancerouter.get("/today", authMiddleware, getToday);
attendancerouter.get("/my-shift", authMiddleware, getMyShift);
attendancerouter.get("/calendar-meta", authMiddleware, getCalendarMeta);


module.exports = attendancerouter;