const Attendance = require("../Models/attendance.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");

const getUserId = (user) => user._id || user.id;

const getOnModel = (role) => {
  if (role === "manager") return "Manager";
  if (role === "admin")   return "Admin";
  return "User";
};


const checkin = async (req, res) => {
  try {
    const { latitude, longitude, selfie } = req.body;
    const user   = req.user;
    const userId = getUserId(user);

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location required" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: userId,
      role:     user.role,
      date:     today,
    });

    if (attendance) {

      if (attendance.checkOut) {
        return res.status(400).json({
          message: "You have already completed your attendance for today.",
          alreadyDone: true,
        });
      }

      if (attendance.source === "agent") {
        attendance.latitude      = latitude;
        attendance.longitude     = longitude;
        attendance.selfie        = selfie || attendance.selfie;
        attendance.checkIn       = new Date();
        attendance.source        = "manual";
        attendance.onModel       = getOnModel(user.role);
        attendance.activeMinutes = 0;
        attendance.idleMinutes   = 0;
        attendance.lastUpdated   = Date.now();

        await attendance.save();
        return res.json({ message: "Check-in successful", attendance });
      }

      return res.status(400).json({ message: "Already checked in" });
    }

    const newAttendance = await Attendance.create({
      employee:      userId,
      onModel:       getOnModel(user.role),
      role:          user.role,
      date:          today,
      checkIn:       new Date(),
      latitude,
      longitude,
      selfie,
      activeMinutes: 0,
      idleMinutes:   0,
      lastUpdated:   Date.now(),
      source:        "manual",
    });

    res.json({ message: "Check-in successful", attendance: newAttendance });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const activity = async (req, res) => {
  try {
    const { status } = req.body;
    const user   = req.user;
    const userId = getUserId(user);

    if (!["active", "idle"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: userId,
      role:     user.role,
      date:     today,
    });

    if (!attendance) {
      attendance = await Attendance.create({
        employee:      userId,
        onModel:       getOnModel(user.role),
        role:          user.role,
        date:          today,
        checkIn:       new Date(),
        activeMinutes: 0,
        idleMinutes:   0,
        lastUpdated:   0,
        source:        "agent",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: "Already checked out" });
    }

    const now = Date.now();
    if (attendance.lastUpdated && now - attendance.lastUpdated < 60000) {
      return res.status(429).json({ message: "Too many requests" });
    }

    if (attendance.source === "manual") {
      if (status === "active") {
        attendance.activeMinutes += 1;
      } else {
        attendance.idleMinutes += 1;
      }
    }

    attendance.lastUpdated = now;
    await attendance.save();

    res.json({
      message:       "Activity updated",
      activeMinutes: attendance.activeMinutes,
      idleMinutes:   attendance.idleMinutes,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const checkout = async (req, res) => {
  try {
    const user   = req.user;
    const userId = getUserId(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: userId,
      role:     user.role,
      date:     today,
    });

    if (!attendance) {
      return res.status(404).json({ message: "Please check in first" });
    }

    if (attendance.source === "agent") {
      return res.status(400).json({ message: "Please check in first before checking out" });
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
      message:       "Checkout successful",
      status,
      activeMinutes: attendance.activeMinutes,
      idleMinutes:   attendance.idleMinutes,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getToday = async (req, res) => {
  try {
    const user   = req.user;
    const userId = getUserId(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: userId,
      role:     user.role,
      date:     today,
    });

    if (!attendance) {
      return res.json({ attendance: null, isCheckedIn: false, isCheckedOut: false });
    }

    res.json({
      attendance,
      isCheckedIn:  attendance.source === "manual" && !attendance.checkOut,
      isCheckedOut: !!attendance.checkOut,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const autoCheckoutAll = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openSessions = await Attendance.find({
      date:     today,
      source:   "manual",
      checkIn:  { $exists: true },
      checkOut: { $exists: false },
    });

    console.log(`[Cron] Auto checkout: ${openSessions.length} open sessions found`);

    for (const attendance of openSessions) {
      attendance.checkOut = new Date();
      const status = calculateStatus(attendance.activeMinutes);
      attendance.status = status;
      await attendance.save();
      await updateSummary(attendance);
      console.log(`[Cron] Auto checked out employee: ${attendance.employee}`);
    }

  } catch (error) {
    console.error("[Cron] Auto checkout failed:", error.message);
  }
};

module.exports = { checkin, activity, checkout, getToday, autoCheckoutAll };