const mongoose = require("mongoose");

// Shout-outs given during a meeting ("Priya saved the demo!").
const BADGES = ["star", "teamwork", "helper", "idea", "fast", "clutch", "calm", "funny"];

const meetingKudosSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
    fromKey: { type: String, required: true, index: true },
    fromName: { type: String, default: "" },
    toKey: { type: String, required: true, index: true },
    toName: { type: String, default: "" },
    badge: { type: String, enum: BADGES, default: "star" },
    message: { type: String, trim: true, maxlength: 140, default: "" },
  },
  { timestamps: true }
);

meetingKudosSchema.index({ organisation_id: 1, toKey: 1, createdAt: -1 });
meetingKudosSchema.statics.BADGES = BADGES;

module.exports = mongoose.models.MeetingKudos || mongoose.model("MeetingKudos", meetingKudosSchema);
