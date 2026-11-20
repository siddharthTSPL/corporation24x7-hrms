const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    personKey: { type: String, required: true, index: true },
    badgeKey: { type: String, required: true }, // catalogue key or "custom:<id>"
    grantedBy: { type: String, default: "" }, // "" = earned automatically
    note: { type: String, default: "", maxlength: 200 },
    seen: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "earnedAt", updatedAt: false } }
);
schema.index({ personKey: 1, badgeKey: 1 }, { unique: true });
schema.index({ organisation_id: 1, earnedAt: -1 });

module.exports = mongoose.models.GamUserBadge || mongoose.model("GamUserBadge", schema);
