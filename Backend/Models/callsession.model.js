const mongoose = require("mongoose");

const PERSON_MODELS = ["User", "Manager", "Admin", "SuperAdmin"];

// One document per call / live meeting. Live signalling state (who is connected
// right now) lives in memory in utils/chat/callRooms.js; this is the durable
// history that powers "recent calls" and the call summary message in the chat.
const callSessionSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    roomKey: { type: String, required: true, index: true }, // conversation:<id> | meeting:<id>
    kind: { type: String, enum: ["direct", "group", "meeting"], required: true },
    media: { type: String, enum: ["audio", "video"], default: "video" },

    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: undefined },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", default: undefined },

    initiator: { type: mongoose.Schema.Types.ObjectId, refPath: "initiatorModel" },
    initiatorModel: { type: String, enum: PERSON_MODELS },
    initiatorKey: { type: String, default: "" },

    // everyone who was ever in the call (a person with 2 tabs counts once)
    participants: [
      {
        key: String,
        person: { type: mongoose.Schema.Types.ObjectId, refPath: "participants.personModel" },
        personModel: { type: String, enum: PERSON_MODELS },
        joinedAt: Date,
        leftAt: Date,
        _id: false,
      },
    ],
    invitedKeys: { type: [String], default: [] },
    declinedKeys: { type: [String], default: [] },

    status: { type: String, enum: ["ringing", "active", "ended", "missed", "declined"], default: "ringing", index: true },
    startedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    endReason: { type: String, default: "" }, // hangup | all_left | host_ended | timeout | declined | server_restart
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

callSessionSchema.index({ organisation_id: 1, invitedKeys: 1, startedAt: -1 });
callSessionSchema.index({ organisation_id: 1, initiatorKey: 1, startedAt: -1 });

module.exports = mongoose.models.CallSession || mongoose.model("CallSession", callSessionSchema);
