const Attendance = require("../Models/attendance.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");

const getUserId = (user) => user._id || user.id;

const checkin = async (req, res) => {
  try {
    const { latitude, longitude, selfie } = req.body;
    const user = req.user;
    const userId = getUserId(user);

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location required" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      employee: userId,
      role: user.role,
      date: today,
    });

    if (existing && !existing.checkOut) {
      return res.status(400).json({ message: "Already checked in" });
    }

    const newAttendance = await Attendance.create({
      employee: userId,
      role: user.role,
      date: today,
      checkIn: new Date(),
      latitude,
      longitude,
      selfie,
      activeMinutes: 0,
      idleMinutes: 0,
      lastUpdated: Date.now(),
    });

    res.json({
      message: "Check-in successful",
      attendance: newAttendance,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const activity = async (req, res) => {
  try {
    const { status } = req.body;
    const user = req.user;
    const userId = getUserId(user);

    if (!["active", "idle"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: userId,
      role: user.role,
      date: today,
    });

    // Auto create attendance record if agent pings before manual check-in
    if (!attendance) {
      attendance = await Attendance.create({
        employee: userId,
        role: user.role,
        date: today,
        checkIn: new Date(),
        activeMinutes: 0,
        idleMinutes: 0,
        lastUpdated: 0,
        source: "agent", // mark it came from agent
      });
    }

    // Already checked out — ignore ping
    if (attendance.checkOut) {
      return res.status(400).json({ message: "Already checked out" });
    }

    // Anti-spam (1 minute rule)
    const now = Date.now();
    if (attendance.lastUpdated && now - attendance.lastUpdated < 60000) {
      return res.status(429).json({ message: "Too many requests" });
    }

    if (status === "active") {
      attendance.activeMinutes += 1;
    } else {
      attendance.idleMinutes += 1;
    }

    attendance.lastUpdated = now;
    await attendance.save();

    res.json({
      message: "Activity updated",
      activeMinutes: attendance.activeMinutes,
      idleMinutes: attendance.idleMinutes,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkout = async (req, res) => {
  try {
    const user = req.user;
    const userId = getUserId(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: userId,
      role: user.role,
      date: today,
    });

    if (!attendance) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: "Already checked out" });
    }

    attendance.checkOut = new Date();
    const status = calculateStatus(attendance.activeMinutes);
    attendance.status = status;
    await attendance.save();

    await updateSummary(attendance);

    res.json({
      message: "Checkout successful",
      status,
      activeMinutes: attendance.activeMinutes,
      idleMinutes: attendance.idleMinutes,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkin, activity, checkout };