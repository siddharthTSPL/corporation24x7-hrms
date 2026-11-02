const mongoose = require("mongoose");

const callPreferenceSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    key: { type: String, required: true },
    effect: { type: String, enum: ["none", "blur", "image"], default: "none" },
    blurIntensity: { type: Number, min: 10, max: 100, default: 50 },
    backgroundId: { type: mongoose.Schema.Types.ObjectId, ref: "MeetingBackground", default: null },
    mirrorVideo: { type: Boolean, default: true },
    joinMuted: { type: Boolean, default: false },
    joinCameraOff: { type: Boolean, default: false },
    noiseSuppression: { type: Boolean, default: true },
    echoCancellation: { type: Boolean, default: true },
    autoGainControl: { type: Boolean, default: true },
  },
  { timestamps: true }
);

callPreferenceSchema.index({ organisation_id: 1, key: 1 }, { unique: true });

module.exports = mongoose.models.CallPreference || mongoose.model("CallPreference", callPreferenceSchema);
