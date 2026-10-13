const mongoose = require("mongoose");

// Generic, lightweight audit trail. Kept deliberately small/schemaless-ish
// (a "module" + "action" string pair plus a free-form `meta` object) so any
// future feature can log into the same collection instead of everyone
// inventing their own audit model. Field Work Management is the first
// consumer (see utils/auditLog.utils.js).
const auditLogSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      model: {
        type: String,
        enum: ["SuperAdmin", "Admin", "Manager", "User"],
        required: true,
      },
      name: { type: String, trim: true, maxlength: 160, default: "" },
    },
    target: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      model: { type: String, trim: true, maxlength: 60, default: "" },
      name: { type: String, trim: true, maxlength: 160, default: "" },
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.index({ organisation_id: 1, module: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
