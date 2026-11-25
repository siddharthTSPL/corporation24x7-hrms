const mongoose = require("mongoose");

// Organisation-specific badges (e.g. "Hackathon Winner"), granted manually.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: "", trim: true, maxlength: 200 },
    icon: { type: String, default: "award", maxlength: 24 },
    color: { type: String, default: "#c026d3" },
    xp: { type: Number, default: 50, min: 0, max: 5000 },
    coins: { type: Number, default: 10, min: 0, max: 5000 },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.models.GamCustomBadge || mongoose.model("GamCustomBadge", schema);
