const mongoose = require("mongoose");

// Field Operations deliberately keeps its hierarchy separate from attendance.
// A team only contains employees who are allowed to start field-duty sessions.
const fieldTeamSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, uppercase: true, maxlength: 32 },

    // Optional link to the organisation's existing Department module — lets
    // Field Teams be grouped/filtered by department the same way the rest
    // of TorchX Management already does, without inventing a parallel
    // hierarchy just for Field Work.
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    territory: { type: String, trim: true, maxlength: 160, default: "" },
    geofence: {
      latitude: { type: Number, default: null, min: -90, max: 90 },
      longitude: { type: Number, default: null, min: -180, max: 180 },
      radiusMeters: { type: Number, default: null, min: 25, max: 50000 },
    },
    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Manager" }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    active: { type: Boolean, default: true },
    color: { type: String, trim: true, maxlength: 16, default: "" },
    notifyOnGeofenceExit: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

fieldTeamSchema.index({ organisation_id: 1, name: 1 }, { unique: true });
fieldTeamSchema.index({ organisation_id: 1, managers: 1 });
fieldTeamSchema.index({ organisation_id: 1, members: 1 });
fieldTeamSchema.index({ organisation_id: 1, department: 1 });

module.exports = mongoose.model("FieldTeam", fieldTeamSchema);

