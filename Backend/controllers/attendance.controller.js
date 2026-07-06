const Attendance = require("../Models/attendance.model");
const AdminModel = require("../Models/Admin.model");
const Shift = require("../Models/shift.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");
const { resolveEmployeeShift, evaluateCheckinWindow, getShiftThresholds } = require("../utils/shift.utils");

const getUserId = (user) => user._id || user.id;

const getOnModel = (role) => {
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin";
  if (role === "employee") return "User";
  return "User";
};

const resolveOrganisationId = async (user) => {
  if (user.organisation_id) return user.organisation_id;
  if (user.role === "admin") {
    const admin = await AdminModel.findById(getUserId(user)).select("organisation_id").lean();
    return admin?.organisation_id || null;
  }
  return null;
};

const displayMinutes = (mins) => Math.round(mins || 0);

const checkin = async (req, res) => {
  try {
    const { latitude, longitude, selfie } = req.body;
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    if (!latitude || !longitude)
      return res.status(400).json({ message: "Location required" });

    const shift = await resolveEmployeeShift(user, organisation_id);
    const { allowed, isLate } = evaluateCheckinWindow(shift, new Date());

    if (!allowed) {
      return res.status(400).json({
        message: `Check-in is only allowed between ${shift.earlyBufferMinutes ?? 60} minutes before your shift (${shift.startTime}) and your shift end (${shift.endTime}).`,
        shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id });

    if (attendance) {
      if (attendance.checkOut)
        return res.status(400).json({ message: "You have already completed your attendance for today.", alreadyDone: true });
      if (attendance.source === "agent") {
        attendance.latitude = latitude;
        attendance.longitude = longitude;
        attendance.selfie = selfie || attendance.selfie;
        attendance.checkIn = new Date();
        attendance.source = "manual";
        attendance.onModel = getOnModel(user.role);
        attendance.shift = shift._id;
        attendance.isLate = isLate;
        attendance.activeMinutes = 0;
        attendance.idleMinutes = 0;
        attendance.lastUpdated = Date.now();
        await attendance.save();
        return res.json({ message: "Check-in successful", attendance, isLate });
      }
      return res.status(400).json({ message: "Already checked in" });
    }

    const newAttendance = await Attendance.create({
      organisation_id,
      employee: userId,
      onModel: getOnModel(user.role),
      role: user.role,
      date: today,
      checkIn: new Date(),
      latitude,
      longitude,
      selfie,
      shift: shift._id,
      isLate,
      activeMinutes: 0,
      idleMinutes: 0,
      lastUpdated: Date.now(),
      source: "manual",
    });

    res.json({ message: "Check-in successful", attendance: newAttendance, isLate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const activity = async (req, res) => {
  try {
    const { status } = req.body;
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    if (!["active", "idle"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id });

    if (!attendance) {
      const shift = await resolveEmployeeShift(user, organisation_id);
      attendance = await Attendance.create({
        organisation_id,
        employee: userId,
        onModel: getOnModel(user.role),
        role: user.role,
        date: today,
        checkIn: new Date(),
        shift: shift._id,
        activeMinutes: 0,
        idleMinutes: 0,
        lastUpdated: Date.now(),
        source: "agent",
      });
      return res.json({ message: "Activity started", activeMinutes: 0, idleMinutes: 0 });
    }

    if (attendance.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    const now = Date.now();
    const elapsedMs = now - (attendance.lastUpdated || now);
    const elapsedMinutes = Math.min(elapsedMs / 60000, 3);

    if (attendance.source === "manual") {
      if (status === "active") attendance.activeMinutes += elapsedMinutes;
      else attendance.idleMinutes += elapsedMinutes;
    }

    attendance.lastUpdated = now;
    await attendance.save();

    res.json({
      message: "Activity updated",
      activeMinutes: displayMinutes(attendance.activeMinutes),
      idleMinutes: displayMinutes(attendance.idleMinutes),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkout = async (req, res) => {
  try {
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id });

    if (!attendance)
      return res.status(404).json({ message: "Please check in first" });
    if (attendance.source === "agent")
      return res.status(400).json({ message: "Please check in first before checking out" });
    if (attendance.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    // Use the shift stamped at checkin so a later shift change doesn't
    // retroactively alter today's thresholds; fall back if it's missing
    // (e.g. old records created before this feature existed).
    const shiftDoc = attendance.shift
      ? await Shift.findById(attendance.shift).lean()
      : await resolveEmployeeShift(user, organisation_id);
    const thresholds = getShiftThresholds(shiftDoc);

    attendance.checkOut = new Date();
    const status = calculateStatus(attendance.activeMinutes, thresholds);
    attendance.status = status;
    await attendance.save();
    await updateSummary(attendance);

    res.json({
      message: "Checkout successful",
      status,
      activeMinutes: displayMinutes(attendance.activeMinutes),
      idleMinutes: displayMinutes(attendance.idleMinutes),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getToday = async (req, res) => {
  try {
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id }).lean();

    if (!attendance)
      return res.json({ attendance: null, isCheckedIn: false, isCheckedOut: false });

    res.json({
      attendance: {
        ...attendance,
        activeMinutes: displayMinutes(attendance.activeMinutes),
        idleMinutes: displayMinutes(attendance.idleMinutes),
      },
      isCheckedIn: attendance.source === "manual" && !attendance.checkOut,
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
      date: today,
      source: "manual",
      checkIn: { $exists: true },
      checkOut: { $exists: false },
    }).select("_id activeMinutes organisation_id shift employee role").lean();

    if (!openSessions.length) return;

    // Resolve thresholds per session (per shift), defaulting to the org's
    // default shift for any legacy records missing a `shift` reference.
    const shiftCache = new Map();
    const getThresholdsFor = async (session) => {
      if (session.shift) {
        if (!shiftCache.has(String(session.shift))) {
          const shift = await Shift.findById(session.shift).lean();
          shiftCache.set(String(session.shift), shift);
        }
        const shift = shiftCache.get(String(session.shift));
        if (shift) return getShiftThresholds(shift);
      }
      const fallback = await resolveEmployeeShift({}, session.organisation_id);
      return getShiftThresholds(fallback);
    };

    const now = new Date();
    const ops = [];
    const summaryPayloads = [];

    for (const a of openSessions) {
      const thresholds = await getThresholdsFor(a);
      const status = calculateStatus(a.activeMinutes, thresholds);
      ops.push({
        updateOne: {
          filter: { _id: a._id, organisation_id: a.organisation_id },
          update: { $set: { checkOut: now, status } },
        },
      });
      summaryPayloads.push({ ...a, checkOut: now, status });
    }

    await Attendance.bulkWrite(ops, { ordered: false });
    await Promise.all(summaryPayloads.map((a) => updateSummary(a)));
  } catch (error) {
    console.error("[Cron] Auto checkout failed:", error.message);
  }
};

const getMyShift = async (req, res) => {
  try {
    const user = req.user;
    const organisation_id = await resolveOrganisationId(user);
    const shift = await resolveEmployeeShift(user, organisation_id);

    res.json({
      shift: {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        graceMinutes: shift.graceMinutes ?? 15,
        earlyBufferMinutes: shift.earlyBufferMinutes ?? 60,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkin, activity, checkout, getToday, autoCheckoutAll, getMyShift };