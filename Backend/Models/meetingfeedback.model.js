const mongoose = require("mongoose");

const meetingFeedbackSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true },
    key: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: "" },
    anonymous: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

meetingFeedbackSchema.index({ meeting: 1, key: 1 }, { unique: true });

module.exports = mongoose.models.MeetingFeedback || mongoose.model("MeetingFeedback", meetingFeedbackSchema);
