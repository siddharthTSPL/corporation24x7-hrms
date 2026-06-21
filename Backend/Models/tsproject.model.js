const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true, maxlength: 2000 },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TSClient",
      default: null,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "created_by_model",
    },
    created_by_model: {
      type: String,
      required: true,
      enum: ["SuperAdmin", "Admin", "Manager"],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "owner_model",
    },
    owner_model: {
      type: String,
      required: true,
      enum: ["SuperAdmin", "Admin", "Manager"],
    },

    members: [
      {
        member: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          refPath: "members.member_model",
        },
        member_model: {
          type: String,
          required: true,
          enum: ["Admin", "Manager", "User"],
        },
        added_at: { type: Date, default: Date.now },
      },
    ],

    billing_type: {
      type: String,
      enum: ["billable", "non_billable", "fixed_cost"],
      default: "non_billable",
    },

    fixed_cost_amount: { type: Number, default: 0, min: 0 },
    default_hourly_rate: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },

    estimated_hours: { type: Number, default: 0, min: 0 },

    start_date: { type: Date },
    end_date: { type: Date },

    color_tag: { type: String, default: "#730042" },

    status: {
      type: String,
      enum: ["active", "on_hold", "completed", "archived"],
      default: "active",
    },

    visibility: {
      type: String,
      enum: ["restricted", "organisation_wide"],
      default: "restricted",
    },
  },
  { timestamps: true }
);

projectSchema.index({ organisation_id: 1, status: 1 });
projectSchema.index({ organisation_id: 1, owner: 1 });
projectSchema.index({ organisation_id: 1, "members.member": 1 });
projectSchema.index({ organisation_id: 1, code: 1 }, { unique: true, sparse: true });
projectSchema.index({ client: 1 });

projectSchema.methods.hasMember = function (memberId) {
  return this.members.some((m) => m.member.toString() === memberId.toString());
};

module.exports = mongoose.models.TSProject || mongoose.model("TSProject", projectSchema);