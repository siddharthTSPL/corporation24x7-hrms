const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    personKey: { type: String, required: true },
    questKey: { type: String, required: true }, // catalogue key or "custom:<id>"
    custom: { type: Boolean, default: false },
    period: { type: String, enum: ["daily", "weekly", "monthly", "oneoff", "onboarding"], required: true },
    periodKey: { type: String, required: true }, // 2026-11-05 | 2026-W45 | 2026-11 | once
    title: String,
    desc: String,
    icon: String,
    event: { type: String, required: true },
    target: { type: Number, required: true },
    progress: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    optional: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "completed", "claimed"], default: "active" },
    completedAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
schema.index({ personKey: 1, questKey: 1, periodKey: 1 }, { unique: true });
schema.index({ personKey: 1, status: 1, event: 1 });
schema.index({ organisation_id: 1, period: 1, periodKey: 1, status: 1 });

module.exports = mongoose.models.GamQuestProgress || mongoose.model("GamQuestProgress", schema);
