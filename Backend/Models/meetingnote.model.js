const mongoose = require("mongoose");

const meetingNoteSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
    content: { type: String, default: "", maxlength: 20000 },
    decisions: { type: [String], default: [] },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    sharedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
    updatedByKey: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MeetingNote || mongoose.model("MeetingNote", meetingNoteSchema);
