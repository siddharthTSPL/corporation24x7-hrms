const mongoose = require("mongoose");

// One document per (organisation, module). No document, or enabled:false,
// means the org keeps the built-in default routing for that module.
const approvalFlowSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: ["leave", "wfh", "timesheet", "reimbursement"],
      required: true,
    },
    enabled: { type: Boolean, default: false },

    // Phase 1: a single first-approver step. "admin" sends the request to a
    // pool of admins chosen by the org; any one of them can act on it.
    firstApprover: {
      type: String,
      enum: ["reporting_manager", "admin"],
      default: "reporting_manager",
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "Admin" }],

    // Who the custom flow applies to. Admin requests always go to SuperAdmin.
    applyToEmployees: { type: Boolean, default: true },
    applyToManagers: { type: Boolean, default: true },

    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    updatedByModel: { type: String, enum: ["Admin", "SuperAdmin"] },
  },
  { timestamps: true }
);

approvalFlowSchema.index({ organisation_id: 1, module: 1 }, { unique: true });

module.exports =
  mongoose.models.ApprovalFlow || mongoose.model("ApprovalFlow", approvalFlowSchema);