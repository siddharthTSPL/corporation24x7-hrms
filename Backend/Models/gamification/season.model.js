const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    theme: { type: String, default: "🏟️", maxlength: 8 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ["upcoming", "active", "finalised"], default: "active" },
    prizes: {
      type: [{ rank: Number, xp: { type: Number, default: 0 }, coins: { type: Number, default: 0 }, label: { type: String, default: "" } }],
      default: [
        { rank: 1, xp: 500, coins: 250, label: "Season Champion" },
        { rank: 2, xp: 300, coins: 150, label: "Runner-up" },
        { rank: 3, xp: 150, coins: 75, label: "Third place" },
      ],
    },
    winners: { type: mongoose.Schema.Types.Mixed, default: [] }, // hall-of-fame snapshot
    departmentWinners: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);
schema.index({ organisation_id: 1, startsAt: -1 });

module.exports = mongoose.models.GamSeason || mongoose.model("GamSeason", schema);
