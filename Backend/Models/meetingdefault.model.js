const mongoose = require("mongoose");

const meetingDefaultSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, unique: true },
    settings: {
      lobby: { type: Boolean, default: false },
      muteOnEntry: { type: Boolean, default: false },
      allowUnmute: { type: Boolean, default: true },
      chatEnabled: { type: Boolean, default: true },
      reactionsEnabled: { type: Boolean, default: true },
      handRaiseEnabled: { type: Boolean, default: true },
      transcript: { type: Boolean, default: true },
      screenShare: { type: String, enum: ["everyone", "host"], default: "everyone" },
    },
    allowJoinBeforeHost: { type: Boolean, default: false },
    reminderMinutes: { type: Number, default: 10, min: 0, max: 1440 },
    updatedByKey: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MeetingDefault || mongoose.model("MeetingDefault", meetingDefaultSchema);
