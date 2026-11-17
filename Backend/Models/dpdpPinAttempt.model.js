const mongoose = require("mongoose");

// Brute-force guard for the access PIN. One row per (org, actor); expires
// on its own so stale rows never pile up.
const schema = new mongoose.Schema({
  organisation_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  count: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
});
schema.index({ organisation_id: 1, actorId: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("DpdpPinAttempt", schema);
