const mongoose = require("mongoose");

// Data-principal rights & grievances: access, correction, erasure,
// grievance, nomination, consent withdrawal. Each carries a due date so
// the org can track its response deadline.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    requester: {
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      model: { type: String, enum: ["SuperAdmin", "Admin", "Manager", "User"], required: true },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    type: { type: String, enum: ["access", "correction", "erasure", "grievance", "nomination", "consent_withdrawal"], required: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    details: { type: String, default: "", trim: true, maxlength: 4000 },
    status: { type: String, enum: ["open", "in_progress", "resolved", "rejected"], default: "open", index: true },
    dueAt: { type: Date, required: true },
    resolution: { type: String, default: "", trim: true, maxlength: 4000 },
    handledBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: "" },
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ organisation_id: 1, status: 1, dueAt: 1 });

module.exports = mongoose.model("DpdpRequest", schema);
