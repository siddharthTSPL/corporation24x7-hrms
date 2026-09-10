const mongoose = require("mongoose");

const fieldLocationSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "FieldDutySession", required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: {
        type: [Number],
        required: true,
        validate: { validator: (v) => Array.isArray(v) && v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90, message: "Invalid GPS coordinates" },
      },
    },
    accuracy: { type: Number, default: null },
    deviceTimestamp: { type: Date, required: true },
    batteryLevel: { type: Number, default: null },
    networkStatus: { type: String, enum: ["online", "offline", "unknown"], default: "unknown" },
    speedKph: { type: Number, default: null },
    heading: { type: Number, default: null },
    distanceFromPreviousMeters: { type: Number, default: null },
    movementStatus: { type: String, enum: ["moving", "slow_moving", "stationary", "unknown"], default: "unknown" },
    withinTeamGeofence: { type: Boolean, default: null },
    provider: { type: String, enum: ["gps", "network", "fused", "unknown"], default: "unknown" },
    isMocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fieldLocationSchema.index({ location: "2dsphere" });
fieldLocationSchema.index({ organisation_id: 1, session: 1, deviceTimestamp: 1 });
// Retries from IndexedDB are safe: an already-synced event becomes a no-op.
fieldLocationSchema.index({ organisation_id: 1, eventId: 1 }, { unique: true });
fieldLocationSchema.index({ organisation_id: 1, isMocked: 1, deviceTimestamp: -1 });

module.exports = mongoose.model("FieldLocation", fieldLocationSchema);