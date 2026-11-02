const mongoose = require("mongoose");

// "Starred messages": private to the person who starred.
const chatStarSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    key: { type: String, required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatStarSchema.index({ key: 1, message: 1 }, { unique: true });
chatStarSchema.index({ key: 1, _id: -1 });

module.exports = mongoose.models.ChatStar || mongoose.model("ChatStar", chatStarSchema);
