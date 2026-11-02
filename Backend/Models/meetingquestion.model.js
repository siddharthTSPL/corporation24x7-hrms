const mongoose = require("mongoose");

// Live Q&A (like Slido / Zoom Q&A): people ask, others upvote, host answers.
const meetingQuestionSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
    askerKey: { type: String, required: true },
    askerName: { type: String, default: "" },
    anonymous: { type: Boolean, default: false },
    text: { type: String, trim: true, required: true, maxlength: 300 },
    upvoterKeys: { type: [String], default: [] },
    status: { type: String, enum: ["open", "answered", "dismissed"], default: "open", index: true },
    pinned: { type: Boolean, default: false },
    answerText: { type: String, trim: true, maxlength: 500, default: "" },
    answeredByKey: { type: String, default: "" },
    answeredByName: { type: String, default: "" },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingQuestionSchema.index({ meeting: 1, createdAt: 1 });

module.exports = mongoose.models.MeetingQuestion || mongoose.model("MeetingQuestion", meetingQuestionSchema);
