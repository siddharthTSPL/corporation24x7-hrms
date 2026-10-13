const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────
// TorchX Policy — core Policy document.
//
// A Policy is metadata + assignment rules. The actual readable content
// (PDF / images) lives in PolicyVersion (see policyVersion.model.js) so
// that a published version can stay immutable forever while the org keeps
// creating new versions over time (see policyAcknowledgement.model.js for
// how re-acknowledgement on a new version works).
// ─────────────────────────────────────────────────────────────────────────

const ASSIGNMENT_TYPES = ["ALL", "DEPARTMENT", "LOCATION", "EMPLOYEE"];
const TARGET_ROLE_GROUPS = ["employee", "manager", "admin", "super_admin"];

const policySchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true, default: null },
    category: { type: String, trim: true, default: "General" },
    description: { type: String, trim: true, default: "" },

    // mandatory  -> employee must acknowledge before continuing
    // optional   -> employee can read, acknowledgement not enforced
    // informational -> shown, no acknowledgement tracked at all
    priority: {
      type: String,
      enum: ["mandatory", "optional", "informational"],
      default: "mandatory",
    },
    acknowledgementRequired: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    assignment: {
      type: {
        type: String,
        enum: ASSIGNMENT_TYPES,
        default: "ALL",
      },
      // Which role-groups this policy is even relevant to.
      roles: {
        type: [String],
        enum: TARGET_ROLE_GROUPS,
        default: ["employee", "manager", "admin"],
      },
      departments: { type: [String], default: [] },
      locations: { type: [String], default: [] },
      employees: [
        {
          id: { type: mongoose.Schema.Types.ObjectId, required: true },
          model: { type: String, enum: ["User", "Manager", "Admin"], required: true },
          _id: false,
        },
      ],
    },

    effectiveFrom: { type: Date, default: Date.now },

    currentVersion: { type: mongoose.Schema.Types.ObjectId, ref: "PolicyVersion", default: null },
    versionCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByModel: { type: String, enum: ["Admin", "SuperAdmin"], required: true },

    publishedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    publishedByModel: { type: String, enum: ["Admin", "SuperAdmin", null], default: null },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

policySchema.index({ organisation_id: 1, status: 1, createdAt: -1 });
policySchema.index(
  { organisation_id: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } }
);

const PolicyModel = mongoose.models.Policy || mongoose.model("Policy", policySchema);
PolicyModel.ASSIGNMENT_TYPES = ASSIGNMENT_TYPES;
PolicyModel.TARGET_ROLE_GROUPS = TARGET_ROLE_GROUPS;

module.exports = PolicyModel;