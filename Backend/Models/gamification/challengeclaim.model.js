const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: "GamChallenge", required: true },
    personKey: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ challenge: 1, personKey: 1 }, { unique: true });

module.exports = mongoose.models.GamChallengeClaim || mongoose.model("GamChallengeClaim", schema);
