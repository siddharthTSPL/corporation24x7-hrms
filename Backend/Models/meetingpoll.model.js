const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, required: true, maxlength: 120 },
    voterKeys: { type: [String], default: [] },
  },
  { _id: true }
);

const meetingPollSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
    question: { type: String, trim: true, required: true, maxlength: 250 },
    options: { type: [optionSchema], default: [] },
    multiple: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    closesAt: { type: Date, default: null },
    createdByKey: { type: String, required: true },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingPollSchema.index({ meeting: 1, createdAt: -1 });

module.exports = mongoose.models.MeetingPoll || mongoose.model("MeetingPoll", meetingPollSchema);
