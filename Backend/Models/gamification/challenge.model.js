const mongoose = require("mongoose");

// Time-boxed competitions. Progress is computed from the points ledger, so a
// challenge never needs write-side hooks.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 400 },
    icon: { type: String, default: "trophy", maxlength: 24 },
    scope: { type: String, enum: ["individual", "department"], default: "individual" },
    // What to measure: number of times an event happened, or XP earned (optionally from certain events)
    metric: { type: String, enum: ["count", "xp"], default: "count" },
    events: { type: [String], default: [] }, // empty with metric xp = all XP
    target: { type: Number, required: true, min: 1 }, // goal to "complete" the challenge
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    departments: { type: [String], default: [] }, // restrict to these (empty = all)
    optIn: { type: Boolean, default: false }, // people must join first
    participants: { type: [String], default: [] }, // personKeys, for optIn challenges
    rewardXp: { type: Number, default: 100, min: 0, max: 20000 },
    rewardCoins: { type: Number, default: 20, min: 0, max: 20000 },
    rewardBadgeKey: { type: String, default: "" },
    podiumXp: { type: [Number], default: [0, 0, 0] }, // extra XP for 1st/2nd/3rd when finalised
    podiumCoins: { type: [Number], default: [0, 0, 0] },
    status: { type: String, enum: ["active", "finalised", "cancelled"], default: "active" },
    winners: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);
schema.index({ organisation_id: 1, endsAt: -1 });

module.exports = mongoose.models.GamChallenge || mongoose.model("GamChallenge", schema);
