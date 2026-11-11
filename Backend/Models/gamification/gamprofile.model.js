const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    personModel: { type: String, enum: ["User", "Manager", "Admin"], required: true },
    person: { type: mongoose.Schema.Types.ObjectId, required: true },
    personKey: { type: String, required: true, unique: true }, // "User:<id>"

    // Identity snapshot (refreshed lazily) so leaderboards never need joins.
    name: { type: String, default: "" },
    department: { type: String, default: "", index: true },
    designation: { type: String, default: "" },
    photo: { type: String, default: "" },
    managerKey: { type: String, default: "" },
    joinedAt: { type: Date, default: null },
    dob: { type: Date, default: null },
    identityAt: { type: Date, default: null },

    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    coins: { type: Number, default: 0 },
    lifetimeCoins: { type: Number, default: 0 },
    spentCoins: { type: Number, default: 0 },

    stats: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { attendance:{current,longest,lastKey,startKey}, login:{...}, quiz:{...}, ... }
    streaks: { type: mongoose.Schema.Types.Mixed, default: {} },
    freezes: { type: Number, default: 0 },

    badgeKeys: { type: [String], default: [] },
    unlockedCosmetics: { type: [String], default: [] }, // "frame:neon"
    equipped: {
      frame: { type: String, default: "none" },
      title: { type: String, default: "level" },
      theme: { type: String, default: "default" },
    },

    daily: { type: mongoose.Schema.Types.Mixed, default: {} }, // {key, xp, counts:{event:n}}
    spin: { type: mongoose.Schema.Types.Mixed, default: {} }, // {key, count, extra}
    dailyClaim: { type: mongoose.Schema.Types.Mixed, default: {} }, // {lastKey, day}
    questKeys: { type: mongoose.Schema.Types.Mixed, default: {} }, // {daily, weekly, monthly, onboarding}
    kudosBudget: { type: mongoose.Schema.Types.Mixed, default: {} }, // {monthKey, used}
    awardBudget: { type: mongoose.Schema.Types.Mixed, default: {} }, // {monthKey, xp, coins} for managers/admins awarding

    optedOut: { type: Boolean, default: false },
    showOnLeaderboard: { type: Boolean, default: true },
    frozenAccount: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
);

schema.index({ organisation_id: 1, xp: -1 });
schema.index({ organisation_id: 1, managerKey: 1 });

module.exports = mongoose.models.GamProfile || mongoose.model("GamProfile", schema);
