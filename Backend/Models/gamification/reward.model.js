const mongoose = require("mongoose");

// Rewards Store catalogue.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 400 },
    icon: { type: String, default: "gift", maxlength: 24 },
    category: { type: String, enum: ["perk", "voucher", "time", "swag", "charity", "other"], default: "perk" },
    cost: { type: Number, required: true, min: 1 },
    stock: { type: Number, default: -1 }, // -1 = unlimited
    perUserLimit: { type: Number, default: 0 }, // 0 = unlimited
    minLevel: { type: Number, default: 1 },
    requiresApproval: { type: Boolean, default: true }, // off = fulfilled instantly
    active: { type: Boolean, default: true },
    redeemedCount: { type: Number, default: 0 },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.GamReward || mongoose.model("GamReward", schema);
