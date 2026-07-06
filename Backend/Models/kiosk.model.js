const mongoose = require("mongoose");

const kioskSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    device_name: {
      type: String,
      required: true,
      trim: true, // e.g. "Main Gate Tablet", "Reception iPad"
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
    },
    isActive: {
      type: Boolean,
      default: true, // set to false to remotely log a stolen/retired tablet out
    },
    lastSeenAt: Date,
  },
  { timestamps: true }
);

kioskSchema.index({ organisation_id: 1, device_name: 1 }, { unique: true });

module.exports = mongoose.model("Kiosk", kioskSchema);