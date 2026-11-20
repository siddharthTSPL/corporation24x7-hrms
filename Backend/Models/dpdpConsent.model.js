const mongoose = require("mongoose");

// Append-only consent ledger: every grant / withdrawal is a new row so the
// org can prove what was consented to, when, and under which notice version.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    subject: {
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      model: { type: String, enum: ["SuperAdmin", "Admin", "Manager", "User"], required: true },
    },
    purpose: { type: String, required: true, trim: true, maxlength: 60 },
    granted: { type: Boolean, required: true },
    noticeVersion: { type: String, required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: true },
);
schema.index({ organisation_id: 1, "subject.id": 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model("DpdpConsent", schema);
