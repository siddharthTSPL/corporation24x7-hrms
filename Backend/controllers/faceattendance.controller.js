const multer = require("multer");
const FaceProfile = require("../Models/faceprofile.model");
const Attendance = require("../Models/attendance.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");
const { getEmbedding, cosineSimilarity } = require("../utils/faceService");

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

// ---------------------------------------------------------------------
// ENROLLMENT — this is the "training" step.
// An admin uploads one clear, front-facing photo per employee. We don't
// store the photo for matching — we convert it into a 512-number
// embedding (the face's numeric fingerprint) and store THAT, tagged
// with organisation_id so it's only ever compared within that org.
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
// own organisation_id.
// ---------------------------------------------------------------------
const scanFace = async (req, res) => {
  try {
    const { image } = req.body; // base64 frame captured by the tablet camera
    if (!image) return res.status(400).json({ message: "image (base64) is required" });

    const { organisation_id } = req.kiosk;

    const liveEmbedding = await getEmbedding(image);

    const profiles = await FaceProfile.find({ organisation_id }).lean();
    if (!profiles.length)
      return res
        .status(404)
        .json({ message: "No employees enrolled for this organisation yet" });

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
      return res.status(404).json({ message: "Face not recognized, please try again" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: best.employee,
      role: best.role,
      date: today,
      organisation_id,
    });

    // First scan today -> check in.
    if (!attendance) {
      attendance = await Attendance.create({
        organisation_id,
        employee: best.employee,
        onModel: best.onModel,
        role: best.role,
        date: today,
        checkIn: new Date(),
        source: "face",
      });

      return res.json({
        message: "Check-in successful",
        action: "checkin",
        matchConfidence: Number(bestScore.toFixed(3)),
        time: attendance.checkIn,
      });
    }

    if (attendance.checkOut)
      return res.status(400).json({ message: "Attendance already completed for today" });

    // Second scan today -> check out, and compute status from actual
    // time spent between the two scans (not activity pings, since a
    // kiosk only sees entry/exit, not continuous activity).
    attendance.checkOut = new Date();
    const durationMinutes = Math.round((attendance.checkOut - attendance.checkIn) / 60000);
    attendance.activeMinutes = durationMinutes;
    attendance.status = calculateStatus(durationMinutes);
    await attendance.save();
    await updateSummary(attendance);

    return res.json({
      message: "Checkout successful",
      action: "checkout",
      matchConfidence: Number(bestScore.toFixed(3)),
      status: attendance.status,
      time: attendance.checkOut,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = { enrollFace, listEnrolled, removeFace, scanFace, upload };
