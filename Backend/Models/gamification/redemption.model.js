const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    reward: { type: mongoose.Schema.Types.ObjectId, ref: "GamReward", required: true },
    rewardName: String,
    rewardIcon: String,
    personKey: { type: String, required: true, index: true },
    personName: String,
    department: String,
    cost: { type: Number, required: true },
    status: { type: String, enum: ["pending", "approved", "fulfilled", "rejected", "cancelled"], default: "pending" },
    note: { type: String, default: "", maxlength: 300 }, // employee's note
    adminNote: { type: String, default: "", maxlength: 300 },
    decidedBy: { type: String, default: "" },
    decidedAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null }, // e.g. mystery box outcome
  },
  { timestamps: true }
);
schema.index({ organisation_id: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.GamRedemption || mongoose.model("GamRedemption", schema);
