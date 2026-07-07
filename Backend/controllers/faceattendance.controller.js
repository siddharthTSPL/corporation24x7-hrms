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

// Which mongoose model a FaceProfile.onModel value points at.
const MODEL_BY_ONMODEL = { User, Manager, Admin: AdminUser };

// Accepts the enrollment photo in memory (not saved to disk) — we only need
// it long enough to send to the face service and get back an embedding.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// How close a live scan must be to a stored face to count as a match.
// 1.0 = identical, 0 = unrelated. Start at 0.62 and tune after testing
// with your own kiosk/camera — raise it if random people get matched,
// lower it if real employees keep getting rejected.
const SIMILARITY_THRESHOLD = 0.62;

const minutesToLabel = (mins) => {
  const m = Math.round(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
};

// ---------------------------------------------------------------------
// ENROLLMENT — this is the "training" step, in the loosest sense.
// There is no per-employee model training here: an admin uploads one
// clear, front-facing photo, and a general-purpose pretrained face model
// (already trained by its authors on millions of unrelated faces) turns
// it into a 512-number embedding — a numeric fingerprint of THIS face.
// We store that fingerprint, tagged with organisation_id so it's only
// ever compared within that org. Recognizing someone later is just
// "whose stored fingerprint is closest to this live one", not training.
// ---------------------------------------------------------------------
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

// List who has/hasn't been enrolled yet, for an admin dashboard.
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

// ---------------------------------------------------------------------
// LIVE SCAN — called by the kiosk, authenticated as a device (not a
// person). It only ever compares against faces belonging to the kiosk's
// own organisation_id, and every checkin/checkout is evaluated against
// the matched employee's own shift timing.
// ---------------------------------------------------------------------
const scanFace = async (req, res) => {
  try {
    const { image } = req.body; // base64 frame captured by the tablet camera
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

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: best.employee,
      role: best.role,
      date: today,
      organisation_id,
    });

    // -----------------------------------------------------------------
    // FIRST SCAN TODAY -> CHECK-IN
    // -----------------------------------------------------------------
    if (!attendance) {
      const { allowed, isLate } = evaluateCheckinWindow(shift, now);

      if (!allowed) {
        const earlyBuffer = shift.earlyBufferMinutes ?? 60;
        return res.status(403).json({
          message: `Not allowed. ${employeeName || "Your"} shift starts at ${shift.startTime}. Check-in opens ${earlyBuffer} minute(s) before that.`,
          reason: "shift_not_started",
          employeeName,
          shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
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
        source: "face",
      });

      const grace = shift.graceMinutes ?? 15;
      return res.json({
        message: isLate
          ? `Checked in — late (grace period was ${shift.startTime} to +${grace} min)`
          : "Checked in on time",
        action: "checkin",
        employeeName,
        matchConfidence: Number(bestScore.toFixed(3)),
        time: attendance.checkIn,
        isLate,
        shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
      });
    }

    if (attendance.checkOut)
      return res.status(400).json({
        message: `Today's attendance is already done for ${employeeName || "this employee"} — checked in and checked out.`,
        reason: "attendance_completed",
        employeeName,
      });

    // -----------------------------------------------------------------
    // SECOND SCAN TODAY -> CHECKOUT (only once the checkout window is
    // actually open — otherwise this is just a stray re-scan of someone
    // who already checked in today, not a real attempt to leave)
    // -----------------------------------------------------------------
    const checkoutWindow = evaluateCheckoutWindow(shift, now, attendance.checkIn);

    if (!checkoutWindow.allowed) {
      const who = employeeName || "You";
      const verb = employeeName ? "is" : "are";
      return res.status(400).json({
        message: `${who} ${verb} already checked in for today. Checkout opens ${shift.minHoursBeforeCheckout ?? 3} hour(s) after check-in, or shortly before your shift ends.`,
        reason: "checkin_already_done",
        employeeName,
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
      shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = { enrollFace, listEnrolled, removeFace, scanFace, upload };