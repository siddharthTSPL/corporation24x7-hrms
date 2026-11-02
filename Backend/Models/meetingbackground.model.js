const mongoose = require("mongoose");

const meetingBackgroundSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    scope: { type: String, enum: ["organisation", "personal"], required: true },
    ownerKey: { type: String, required: true, index: true },
    name: { type: String, trim: true, maxlength: 80, default: "Background" },
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    mime: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
);

meetingBackgroundSchema.index({ organisation_id: 1, scope: 1, ownerKey: 1, createdAt: -1 });

module.exports = mongoose.models.MeetingBackground || mongoose.model("MeetingBackground", meetingBackgroundSchema);
