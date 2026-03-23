const express = require("express");
const { checkin, activity, checkout } = require("../controllers/attendance.controller");

const attendancerouter = express.Router();

attendancerouter.post("/checkin", checkin);
attendancerouter.post("/activity", activity);
attendancerouter.post("/checkout", checkout);

module.exports = attendancerouter;