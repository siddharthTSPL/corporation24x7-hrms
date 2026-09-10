const mongoose = require("mongoose");

// One doc per logged-in device/browser for accounts belonging to an
// organisation that has Single Sign-In enabled. Accounts on orgs where the
// feature is off never get rows here — login stays exactly as before.
const ACCOUNT_MODELS = ["SuperAdmin", "Admin", "Manager", "User"];

const deviceInfoSchema = new mongoose.Schema(
  {
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    label: { type: String, default: "" },
  },
  { _id: false }
);

const challengeSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["none", "pending", "approved", "denied"],
      default: "none",
    },
    device_info: deviceInfoSchema,
    requested_at: Date,
    expires_at: Date,
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    account_model: {
      type: String,
      enum: ACCOUNT_MODELS,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },
    device_info: deviceInfoSchema,
    challenge: {
      type: challengeSchema,
      default: () => ({ status: "none" }),
    },
    last_seen_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

sessionSchema.index({ account_id: 1, status: 1 });

sessionSchema.methods.isChallengeExpired = function () {
  return (
    this.challenge?.status === "pending" &&
    this.challenge.expires_at &&
    new Date() > new Date(this.challenge.expires_at)
  );
};

module.exports = mongoose.model("Session", sessionSchema);
module.exports.ACCOUNT_MODELS = ACCOUNT_MODELS;