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
    // Parsed from the User-Agent at sign-in time (see parseUserAgent in
    // utils/singleSignIn.utils.js). Older sessions won't have these — the UI
    // falls back to `label` for them.
    // Friendly, owner-based name shown in the UI, e.g. "Ashish's Phone",
    // "Ashish's Desktop", "Ashish's iPhone".
    deviceName: { type: String, default: "" },
    // Technical model behind it, e.g. "Samsung SM-S918B", "Windows PC".
    deviceModel: { type: String, default: "" },
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    browser: { type: String, default: "" }, // e.g. "Chrome 126"
    os: { type: String, default: "" }, // e.g. "Windows 10/11", "Android 14", "iOS 17.5"
    geo: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      city: { type: String, default: null },
      country: { type: String, default: null },
      at: { type: Date, default: null },
    },
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