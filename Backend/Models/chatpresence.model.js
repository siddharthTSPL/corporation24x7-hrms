const mongoose = require("mongoose");

// One row per person: when they last went offline. Survives server restarts.
const chatPresenceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "User:<id>"
    lastSeenAt: { type: Date, required: true },
  },
  { timestamps: false }
);

module.exports = mongoose.models.ChatPresence || mongoose.model("ChatPresence", chatPresenceSchema);
