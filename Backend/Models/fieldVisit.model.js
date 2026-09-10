const mongoose = require("mongoose");

const visitPointSchema = new mongoose.Schema(
  { latitude: Number, longitude: Number, accuracy: Number, capturedAt: { type: Date, default: Date.now } },
  { _id: false }
);

const fieldVisitSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "FieldDutySession", required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "FieldTeam", default: null },
    customerName: { type: String, required: true, trim: true, maxlength: 160 },
    organisationName: { type: String, trim: true, maxlength: 160, default: "" },
    contactNumber: { type: String, trim: true, maxlength: 30, default: "" },
    purpose: { type: String, trim: true, maxlength: 300, default: "" },
    status: { type: String, enum: ["in_progress", "completed", "skipped", "follow_up_required"], default: "in_progress", index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    startLocation: { type: visitPointSchema, required: true },
    endLocation: { type: visitPointSchema, default: null },
    notes: { type: String, trim: true, maxlength: 3000, default: "" },
    outcome: { type: String, trim: true, maxlength: 1000, default: "" },
    followUpAt: { type: Date, default: null },
    clientEventId: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

fieldVisitSchema.index({ organisation_id: 1, employee: 1, startedAt: -1 });
fieldVisitSchema.index({ organisation_id: 1, employee: 1, clientEventId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("FieldVisit", fieldVisitSchema);
