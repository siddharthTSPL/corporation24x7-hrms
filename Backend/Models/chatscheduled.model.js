const mongoose = require("mongoose");

// "Schedule message": a text message that will be sent later, as the person who scheduled it.
// A background job (automatic/Chatjobs.js) sends whatever is due.
const chatScheduledSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderKey: { type: String, required: true }, // `${model}:${id}`
    text: { type: String, required: true, maxlength: 5000 },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: undefined },
    mentions: { type: [String], default: [] }, // person keys

    sendAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "sending", "sent", "failed", "cancelled"], default: "pending" },
    claimedAt: { type: Date, default: null }, // when the job picked it up (used to recover a crashed run)
    attempts: { type: Number, default: 0 },
    error: { type: String, default: "" },
    sentMessage: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: undefined },
    finishedAt: { type: Date, default: undefined }, // set when sent / failed / cancelled -> row is auto-deleted a week later
  },
  { timestamps: true }
);

chatScheduledSchema.index({ status: 1, sendAt: 1 });
chatScheduledSchema.index({ senderKey: 1, status: 1, sendAt: 1 });
chatScheduledSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.models.ChatScheduled || mongoose.model("ChatScheduled", chatScheduledSchema);
