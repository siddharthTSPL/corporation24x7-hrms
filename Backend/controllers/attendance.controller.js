const jwt = require("jsonwebtoken");
const Attendance = require("../Models/attendance.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");



const checkin = async (req, res) => {

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { latitude, longitude, selfie } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      employee: decoded.id,
      role: decoded.role,
      date: today
    });

    if (existing) {
      return res.json({ message: "Already checked in" });
    }

    const newAttendance = new Attendance({
      employee: decoded.id,
      role: decoded.role,
      date: today,
      checkIn: new Date(),
      latitude,
      longitude,
      selfie
    });

    await newAttendance.save();

    res.json({
      message: "Check-in successful",
      attendance: newAttendance
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



const activity = async (req, res) => {

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { status } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: decoded.id,
      role: decoded.role,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ message: "Check-in first" });
    }

    if (status === "active") {
      attendance.activeMinutes += 1;
    }

    if (status === "idle") {
      attendance.idleMinutes += 1;
    }

    await attendance.save();

    res.json({ message: "Activity updated" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



const checkout = async (req, res) => {

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: decoded.id,
      role: decoded.role,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    attendance.checkOut = new Date();


    const status = calculateStatus(attendance.activeMinutes);

    attendance.status = status;

    await attendance.save();

    await updateSummary(attendance);

    res.json({
      message: "Checkout successful",
      status,
      activeMinutes: attendance.activeMinutes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = { checkin, activity, checkout };