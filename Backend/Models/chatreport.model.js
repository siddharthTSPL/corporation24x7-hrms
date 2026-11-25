const mongoose = require("mongoose");

const REASONS = ["spam", "harassment", "inappropriate", "impersonation", "other"];

const chatReportSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    reporterKey: { type: String, required: true },
    targetKey: { type: String, required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: undefined },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: undefined },
    reason: { type: String, enum: REASONS, required: true },
    details: { type: String, default: "", maxlength: 500 },
    // a copy of the reported message text, so the report still makes sense if it is deleted later
    messageSnapshot: { type: String, default: "", maxlength: 1000 },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" },
    reviewedByKey: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chatReportSchema.index({ organisation_id: 1, status: 1, createdAt: -1 });
chatReportSchema.index({ reporterKey: 1, createdAt: -1 });
chatReportSchema.statics.REASONS = REASONS;

module.exports = mongoose.models.ChatReport || mongoose.model("ChatReport", chatReportSchema);
