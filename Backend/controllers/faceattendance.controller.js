const multer = require("multer");
const FaceProfile = require("../Models/faceprofile.model");
const Attendance = require("../Models/attendance.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const AdminUser = require("../Models/Admin.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");
const { getEmbedding, cosineSimilarity } = require("../utils/faceService");
const { startOfISTDay } = require("../utils/istDate.utils");
const {
  resolveEmployeeShift,
  evaluateCheckinWindow,
  evaluateCheckoutWindow,
  getShiftThresholds,
  getShiftDurationMinutes,
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
    const { image, gate } = req.body;
    if (!image) return res.status(400).json({ message: "image (base64) is required" });

    // Kiosk sends a preset gate name (Gate 1..5) or a free-text "Other"
    // value. Just cap length/sanitize - this is a location label, not a
    // permission gate, so we don't hard-reject unrecognised values.
    const gateName = typeof gate === "string" && gate.trim() ? gate.trim().slice(0, 40) : null;

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
    const today = startOfISTDay(now); // IST-based day boundary, not server-local

    let attendance = await Attendance.findOne({
      employee: best.employee,
      role: best.role,
      date: today,
      organisation_id,
    });

    // No record yet, OR only a background desktop-agent ping exists.
    // An "agent" record was never a real, window-validated check-in, so
    // it must be treated as "not checked in" here too - otherwise a face
    // scan could silently close out a ping as a completed attendance day
    // (this is how a stray agent ping + one scan produced a full day
    // with no real check-in ever happening).
    const needsRealCheckin = !attendance || attendance.source === "agent";

    // One channel per day: a real System (manual/app) check-in owns the
    // whole day. Face scan must not silently checkout a System-checked-in
    // record - it should just report who already checked them in.
    if (attendance && attendance.source === "manual" && !attendance.checkOut) {
      return res.status(400).json({
        message: `${employeeName || "This employee"} already checked in via System. Please check out from System (app) too.`,
        reason: "checked_in_by_system",
        employeeName,
        shift: shiftInfo,
        checkIn: attendance.checkIn,
      });
    }

    if (needsRealCheckin) {
      const { allowed, isLate, lateMinutes, tooLate } = evaluateCheckinWindow(shift, now);

      if (!allowed) {
        if (tooLate) {
          return res.status(403).json({
            message: `Not allowed — ${employeeName || "you are"} too late. Check-in for ${employeeName || "this"} shift (${shift.startTime}) closed ${shift.lateCheckinCutoffMinutes ?? 60} minute(s) after it started.`,
            reason: "too_late",
            employeeName,
            shift: shiftInfo,
          });
        }
        const earlyBuffer = shift.earlyBufferMinutes ?? 60;
        return res.status(403).json({
          message: `Not allowed. ${employeeName || "Your"} shift starts at ${shift.startTime}. Check-in opens ${earlyBuffer} minute(s) before that.`,
          reason: "too_early",
          employeeName,
          shift: shiftInfo,
        });
      }

      if (attendance) {
        attendance.checkIn = now;
        attendance.source = "face";
        attendance.isLate = isLate;
        attendance.lateMinutes = lateMinutes;
        attendance.shift = shift._id;
        attendance.activeMinutes = 0;
        attendance.idleMinutes = 0;
        attendance.checkInGate = gateName;
        await attendance.save();
      } else {
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
          checkInGate: gateName,
        });
      }

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
        gate: gateName,
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
        message: `${who} ${verb} already checked in for today. Checkout opens in ${checkoutWindow.minutesUntilCheckoutOpens} minute(s).`,
        reason: "checkin_already_done",
        employeeName,
        shift: shiftInfo,
        checkIn: attendance.checkIn,
        minutesUntilCheckoutOpens: checkoutWindow.minutesUntilCheckoutOpens,
      });
    }

    const { remark, isOvertime, overtimeMinutes } = checkoutWindow;

    attendance.checkOut = now;
    attendance.checkOutGate = gateName;
    const durationMinutes = Math.round((attendance.checkOut - attendance.checkIn) / 60000);
    attendance.activeMinutes = durationMinutes;

    // Face attendance has no continuous activity-ping tracking like the
    // manual/agent flow - all we know is the checkin-to-checkout span. So
    // "presence" here is judged against the shift's own length, not the
    // fixed absentBelowMinutes/halfDayBelowMinutes thresholds: checking
    // out before half the shift has elapsed is always Absent, e.g. a
    // 9-hour shift (540 min) checked out at 4h29m (< 270 min) -> Absent,
    // no matter what the fixed thresholds say.
    const shiftDurationMinutes = getShiftDurationMinutes(shift);
    const halfShiftMinutes = shiftDurationMinutes / 2;
    const isBelowHalfShift = durationMinutes < halfShiftMinutes;

    attendance.status = isBelowHalfShift
      ? "absent"
      : calculateStatus(durationMinutes, getShiftThresholds(shift));
    attendance.checkoutRemark = remark;
    attendance.overtimeMinutes = isOvertime ? overtimeMinutes : 0;
    await attendance.save();
    await updateSummary(attendance);

    const remarkMessage = {
      on_time: "Checked out on time. Have a good day!",
      overtime: `Checked out — overtime of ${minutesToLabel(overtimeMinutes)}`,
      early_checkout: "Checked out early, before your shift ended",
      auto_overtime: `You are automatically checked out because you are overtime more than ${Math.floor((shift.maxOvertimeMinutes ?? 60) / 60)} hour(s).`,
    }[remark];

    const finalMessage = isBelowHalfShift
      ? `Checked out after only ${minutesToLabel(durationMinutes)} — less than half your ${minutesToLabel(shiftDurationMinutes)} shift, so today is marked Absent.`
      : remarkMessage;

    return res.json({
      message: finalMessage,
      action: "checkout",
      employeeName,
      matchConfidence: Number(bestScore.toFixed(3)),
      status: attendance.status,
      checkoutRemark: remark,
      overtimeMinutes: attendance.overtimeMinutes,
      time: attendance.checkOut,
      workedMinutes: durationMinutes,
      gate: gateName,
      isBelowHalfShift,
      shift: shiftInfo,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = { enrollFace, listEnrolled, removeFace, scanFace, upload };