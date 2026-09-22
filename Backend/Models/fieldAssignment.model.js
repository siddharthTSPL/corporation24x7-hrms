const mongoose = require("mongoose");

// A field employee's permanent assignment state is one of: NONE, TEAM,
// INDIVIDUAL (spec section 5). TEAM is represented by membership in
// FieldTeam.members — no separate row needed. This model exists only for
// the INDIVIDUAL case: an employee who is a field worker but is not part
// of any team (open-territory worker with an optional reporting manager).
//
// Invariant enforced in the controller (not just here): an employee may
// have at most one active row here, AND cannot simultaneously be an active
// member of any FieldTeam. Switching from one state to another must go
// through an explicit unassign first.
const fieldAssignmentSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      default: null,
    },
    territory: { type: String, trim: true, maxlength: 160, default: "" },
    active: { type: Boolean, default: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    assignedByModel: {
      type: String,
      enum: ["SuperAdmin", "Admin"],
      required: true,
    },
    unassignedAt: { type: Date, default: null },
    unassignedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

// At most one ACTIVE individual assignment per employee. A partial unique
// index (only on active:true) lets history rows (active:false) accumulate
// without violating uniqueness.
fieldAssignmentSchema.index(
  { organisation_id: 1, employee: 1, active: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
fieldAssignmentSchema.index({ organisation_id: 1, manager: 1, active: 1 });

module.exports = mongoose.model("FieldAssignment", fieldAssignmentSchema);
