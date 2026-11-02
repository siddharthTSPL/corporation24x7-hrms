const mongoose = require("mongoose");

const meetingActionItemSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
    title: { type: String, trim: true, required: true, maxlength: 200 },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    assigneeKey: { type: String, required: true, index: true },
    createdByKey: { type: String, required: true },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["open", "done"], default: "open", index: true },
    completedAt: { type: Date, default: null },
    completedByKey: { type: String, default: "" },
    dueReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingActionItemSchema.index({ organisation_id: 1, assigneeKey: 1, status: 1, dueDate: 1 });

module.exports = mongoose.models.MeetingActionItem || mongoose.model("MeetingActionItem", meetingActionItemSchema);
