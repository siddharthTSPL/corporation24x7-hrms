const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // 24hr "HH:mm" format e.g. "10:00", "19:00"
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    // minutes AFTER shift start still allowed for checkin (marked late, not blocked)
    graceMinutes: {
      type: Number,
      default: 15,
    },
    // minutes BEFORE shift start checkin is allowed
    earlyBufferMinutes: {
      type: Number,
      default: 60,
    },
    // minutes AFTER checkin before a checkout scan is accepted
    minMinutesBeforeCheckout: {
      type: Number,
      default: 10,
    },
    // activeMinutes below this -> absent
    absentBelowMinutes: {
      type: Number,
      default: 120, // 2 hours
    },
    // activeMinutes below this (but >= absentBelowMinutes) -> half day
    halfDayBelowMinutes: {
      type: Number,
      default: 180, // 3 hours
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

shiftSchema.index({ organisation_id: 1, name: 1 }, { unique: true });
// only one default shift per organisation
shiftSchema.index(
  { organisation_id: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

module.exports = mongoose.model("Shift", shiftSchema);