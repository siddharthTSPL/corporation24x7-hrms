const mongoose = require("mongoose");

// One agent key per organisation. Only the hash is stored; the plain key is
// shown once inside the downloaded agent-config.json.
const biometricOrgKeySchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, unique: true },
    keyHash: { type: String, required: true, select: false },
    rotatedAt: { type: Date, default: Date.now },
    lastUsedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("BiometricOrgKey", biometricOrgKeySchema);
