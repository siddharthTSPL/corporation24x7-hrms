const mongoose = require("mongoose");

// A personal follow-up / to-do that came out of a chat, a call or a meeting
// (picked by AI notes or added by hand). Shown on Spark's Home as "My follow-ups".
const followupSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    ownerKey: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    dueDate: { type: Date, default: null },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
    source: {
      type: { type: String, enum: ["chat", "call", "meeting", "manual"], default: "manual" },
      conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: undefined },
      meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", default: undefined },
      label: { type: String, default: "", maxlength: 120 },
    },
  },
  { timestamps: true }
);

followupSchema.index({ organisation_id: 1, ownerKey: 1, done: 1, dueDate: 1 });

module.exports = mongoose.models.ChatFollowup || mongoose.model("ChatFollowup", followupSchema);
