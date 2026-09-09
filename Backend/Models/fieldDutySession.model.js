const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, default: null },
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const fieldDutySessionSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "FieldTeam", default: null },
    status: { type: String, enum: ["active", "paused", "offline", "checked_out"], default: "active", index: true },
    startedAt: { type: Date, default: Date.now, required: true },
    endedAt: { type: Date, default: null },
    startLocation: { type: pointSchema, required: true },
    endLocation: { type: pointSchema, default: null },
    lastLocation: { type: pointSchema, default: null },
    lastSeenAt: { type: Date, default: Date.now },
    totalDurationSeconds: { type: Number, default: 0 },
    clientEventId: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

// Exactly one open session is enforced in the controller; this index makes
// live-map and employee history queries fast without a fragile global unique index.
fieldDutySessionSchema.index({ organisation_id: 1, employee: 1, status: 1, startedAt: -1 });
fieldDutySessionSchema.index({ organisation_id: 1, employee: 1, clientEventId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("FieldDutySession", fieldDutySessionSchema);
