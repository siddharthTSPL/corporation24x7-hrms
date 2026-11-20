const mongoose = require("mongoose");

// Spoken lines of one chat call. Each participant's browser transcribes only THEIR OWN microphone
// and uploads it here, so the merged document is the whole conversation. Auto-deleted after 30 days.
const callTranscriptSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    callId: { type: String, required: true, unique: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    lines: { type: [{ _id: false, k: String, n: String, t: { type: String, maxlength: 600 }, at: Date }], default: [] },
    notesMessage: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: undefined },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
  },
  { minimize: false }
);

module.exports = mongoose.models.CallTranscript || mongoose.model("CallTranscript", callTranscriptSchema);
