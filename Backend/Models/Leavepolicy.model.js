const mongoose = require("mongoose");

// One document per organisation (organisation_id references the SuperAdmin's
// own _id, same convention used everywhere else in this codebase).
// Lets a SuperAdmin override the default yearly EL/SL entitlement for their
// org. Once `locked` is true, the policy can no longer be edited — this
// happens automatically the moment the first Admin is created under that
// organisation, so entitlements can't be changed after people have already
// started onboarding under them.
const leavePolicySchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      unique: true,
      index: true,
    },
    EL: {
      admin: { type: Number, default: 18 },
      default: { type: Number, default: 15 },
    },
    SL: {
      admin: { type: Number, default: 12 },
      default: { type: Number, default: 12 },
    },
    locked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeavePolicy", leavePolicySchema);