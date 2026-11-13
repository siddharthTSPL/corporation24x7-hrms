const mongoose = require("mongoose");

// Admin-defined quests layered on top of the built-in ones.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    desc: { type: String, default: "", trim: true, maxlength: 240 },
    icon: { type: String, default: "target", maxlength: 24 },
    event: { type: String, required: true }, // any key from catalog/events
    target: { type: Number, required: true, min: 1, max: 1000 },
    period: { type: String, enum: ["daily", "weekly", "monthly", "oneoff"], default: "weekly" },
    xp: { type: Number, default: 30, min: 0, max: 5000 },
    coins: { type: Number, default: 5, min: 0, max: 5000 },
    departments: { type: [String], default: [] }, // empty = everyone
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.GamQuestDef || mongoose.model("GamQuestDef", schema);
