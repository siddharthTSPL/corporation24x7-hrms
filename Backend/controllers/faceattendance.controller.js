const multer = require("multer");
const FaceProfile = require("../Models/faceprofile.model");
const Attendance = require("../Models/attendance.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const AdminUser = require("../Models/Admin.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");
const { getEmbedding, cosineSimilarity } = require("../utils/faceService");
const {
  resolveEmployeeShift,
  evaluateCheckinWindow,
  evaluateCheckoutWindow,
  getShiftThresholds,
} = require("../utils/shift.utils");

const MODEL_BY_ONMODEL = { User, Manager, Admin: AdminUser };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const SIMILARITY_THRESHOLD = 0.62;

const minutesToLabel = (mins) => {
  const m = Math.round(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
};

const enrollFace = async (req, res) => {
  try {
    const { employeeId, onModel, role } = req.body;

    if (!employeeId || !onModel || !role)
      return res
        .status(400)
        .json({ message: "employeeId, onModel and role are required" });

    if (!["User", "Manager", "Admin"].includes(onModel))
      return res.status(400).json({ message: "onModel must be User, Manager or Admin" });

    if (!req.file)
      return res.status(400).json({ message: "A photo file is required (field name: photo)" });

    const organisation_id = req.admin.organisation_id;
    const imageBase64 = req.file.buffer.toString("base64");

    const embedding = await getEmbedding(imageBase64);

    const profile = await FaceProfile.findOneAndUpdate(
      { organisation_id, employee: employeeId },
      {
        organisation_id,
        employee: employeeId,
        onModel,
        role,
        embedding,
        enrolledBy: req.admin._id,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: "Face enrolled successfully",
      profileId: profile._id,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const listEnrolled = async (req, res) => {
  try {
    const organisation_id = req.admin.organisation_id;
    const profiles = await FaceProfile.find({ organisation_id })
      .select("employee onModel role createdAt")
      .lean();
    res.json({ count: profiles.length, profiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeFace = async (req, res) => {
  try {
    const organisation_id = req.admin.organisation_id;
    await FaceProfile.findOneAndDelete({ organisation_id, employee: req.params.employeeId });
    res.json({ message: "Face profile removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const scanFace = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "image (base64) is required" });

    const { organisation_id } = req.kiosk;

    const liveEmbedding = await getEmbedding(image);

    const profiles = await FaceProfile.find({ organisation_id }).lean();
    if (!profiles.length)
      return res.status(404).json({
        message: "No employees are registered for face attendance yet. Please register first.",
        reason: "not_registered",
      });

    let best = null;
    let bestScore = 0;
    for (const profile of profiles) {
      const score = cosineSimilarity(liveEmbedding, profile.embedding);
      if (score > bestScore) {
        bestScore = score;
        best = profile;
      }
    }

    if (!best || bestScore < SIMILARITY_THRESHOLD)
      return res.status(404).json({
        message: "Face not recognized. If you're new here, please register first.",
        reason: "not_registered",
      });

    const EmployeeModel = MODEL_BY_ONMODEL[best.onModel];
    const employeeDoc = await EmployeeModel.findById(best.employee)
      .select("f_name l_name shift")
      .lean();

    if (!employeeDoc)
      return res.status(404).json({ message: "Matched employee record no longer exists" });

    const employeeName = `${employeeDoc.f_name || ""} ${employeeDoc.l_name || ""}`.trim();
    const shift = await resolveEmployeeShift(employeeDoc, organisation_id);
    const shiftInfo = { name: shift.name, startTime: shift.startTime, endTime: shift.endTime };

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: best.employee,
      role: best.role,
      date: today,
      organisation_id,
    });

    if (!attendance) {
      const { allowed, isLate, lateMinutes } = evaluateCheckinWindow(shift, now);

      if (!allowed) {
        const earlyBuffer = shift.earlyBufferMinutes ?? 60;
        return res.status(403).json({
          message: `Not allowed. ${employeeName || "Your"} shift starts at ${shift.startTime}. Check-in opens ${earlyBuffer} minute(s) before that.`,
          reason: "shift_not_started",
          employeeName,
          shift: shiftInfo,
        });
      }

      attendance = await Attendance.create({
        organisation_id,
        employee: best.employee,
        onModel: best.onModel,
        role: best.role,
        date: today,
        checkIn: now,
        shift: shift._id,
        isLate,
        lateMinutes,
        source: "face",
      });

      const grace = shift.graceMinutes ?? 15;
      return res.json({
        message: isLate
          ? `Checked in — late by ${minutesToLabel(lateMinutes)} (grace period was ${shift.startTime} to +${grace} min)`
          : "Checked in on time",
        action: "checkin",
        employeeName,
        matchConfidence: Number(bestScore.toFixed(3)),
        time: attendance.checkIn,
        isLate,
        lateMinutes,
        shift: shiftInfo,
      });
    }

    if (attendance.checkOut)
      return res.status(400).json({
        message: `Today's attendance is already done for ${employeeName || "this employee"} — checked in and checked out.`,
        reason: "attendance_completed",
        employeeName,
        shift: shiftInfo,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
      });

    const checkoutWindow = evaluateCheckoutWindow(shift, now, attendance.checkIn);

    if (!checkoutWindow.allowed) {
      const who = employeeName || "You";
      const verb = employeeName ? "is" : "are";
      return res.status(400).json({
        message: `${who} ${verb} already checked in for today. Checkout opens ${shift.minHoursBeforeCheckout ?? 3} hour(s) after check-in, or shortly before your shift ends.`,
        reason: "checkin_already_done",
        employeeName,
        shift: shiftInfo,
        checkIn: attendance.checkIn,
      });
    }

    const { remark, isOvertime, overtimeMinutes } = checkoutWindow;

    attendance.checkOut = now;
    const durationMinutes = Math.round((attendance.checkOut - attendance.checkIn) / 60000);
    attendance.activeMinutes = durationMinutes;
    attendance.status = calculateStatus(durationMinutes, getShiftThresholds(shift));
    attendance.checkoutRemark = remark;
    attendance.overtimeMinutes = isOvertime ? overtimeMinutes : 0;
    await attendance.save();
    await updateSummary(attendance);

    const remarkMessage = {
      on_time: "Checked out on time. Have a good day!",
      overtime: `Checked out — overtime of ${minutesToLabel(overtimeMinutes)}`,
      early_checkout: "Checked out early, before your shift ended",
    }[remark];

    return res.json({
      message: remarkMessage,
      action: "checkout",
      employeeName,
      matchConfidence: Number(bestScore.toFixed(3)),
      status: attendance.status,
      checkoutRemark: remark,
      overtimeMinutes: attendance.overtimeMinutes,
      time: attendance.checkOut,
      workedMinutes: durationMinutes,
      shift: shiftInfo,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = { enrollFace, listEnrolled, removeFace, scanFace, upload };