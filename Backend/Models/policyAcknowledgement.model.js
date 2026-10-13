const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────
// TorchX Policy — PolicyAcknowledgement.
//
// One row per (policy version, person) — the digital proof that a specific
// admin/manager/employee read and acknowledged a specific version of a
// policy. Rows are created lazily (see utils/policyAssignment.utils.js)
// the first time a matching, still-relevant policy is resolved for that
// person — on login, on the policy list screen, or on the access-gate
// check — rather than bulk-generated for every employee at publish time.
// This is what naturally handles new joiners, department transfers, and
// newly published versions without a background job.
//
// A row is NEVER deleted when a person is reassigned or exits — it's the
// audit trail. Only new PENDING rows stop being generated for them going
// forward once they no longer match the policy's assignment rules.
// ─────────────────────────────────────────────────────────────────────────

const policyAcknowledgementSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
    policyVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PolicyVersion",
      required: true,
      index: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "employeeModel",
    },
    employeeModel: {
      type: String,
      enum: ["User", "Manager", "Admin", "SuperAdmin"],
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "VIEWED", "ACKNOWLEDGED"],
      default: "PENDING",
      index: true,
    },

    assignedAt: { type: Date, default: Date.now },
    viewedAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    // Snapshot fields — kept even if the person is later renamed/exited,
    // so admin reports don't have to re-join for basic display info.
    employeeSnapshot: {
      name: { type: String, default: "" },
      empid: { type: String, default: "" },
      department: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

policyAcknowledgementSchema.index(
  { policyVersionId: 1, employee: 1, employeeModel: 1 },
  { unique: true }
);
policyAcknowledgementSchema.index({ employee: 1, employeeModel: 1, status: 1 });
policyAcknowledgementSchema.index({ organisation_id: 1, policyId: 1, status: 1 });

module.exports =
  mongoose.models.PolicyAcknowledgement ||
  mongoose.model("PolicyAcknowledgement", policyAcknowledgementSchema);