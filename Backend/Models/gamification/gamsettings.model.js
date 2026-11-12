const mongoose = require("mongoose");

// One document per organisation. Anything not set falls back to DEFAULTS in
// utils/gamification/settings.js, so a brand-new org works with zero setup.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, unique: true },
    enabled: { type: Boolean, default: true },
    modules: { type: mongoose.Schema.Types.Mixed, default: {} },
    rules: { type: mongoose.Schema.Types.Mixed, default: {} },
    dailyXpCap: { type: Number, default: 400 },
    levelBase: { type: Number, default: 80 },
    leaderboard: { type: mongoose.Schema.Types.Mixed, default: {} },
    kudos: { type: mongoose.Schema.Types.Mixed, default: {} },
    streaks: { type: mongoose.Schema.Types.Mixed, default: {} },
    spin: { type: mongoose.Schema.Types.Mixed, default: {} },
    manager: { type: mongoose.Schema.Types.Mixed, default: {} },
    seasons: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.models.GamSettings || mongoose.model("GamSettings", schema);
