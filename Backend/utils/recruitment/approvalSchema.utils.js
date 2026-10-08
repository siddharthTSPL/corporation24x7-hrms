const mongoose = require("mongoose");

// Shared "send for approval" block used by OfferLetter and AppointmentLetter.
// The creator picks an approver (an Admin or the organisation's SuperAdmin);
// only that person can finalize the letter, and they do it with their own
// signature image.
const approvalDefinition = {
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", null], default: null },
  approver_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  approver_model: { type: String, enum: ["Admin", "SuperAdmin", null], default: null },
  approver_name: { type: String, default: "" },
  approver_designation: { type: String, default: "" },
  requested_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  requested_by_model: { type: String, enum: ["Admin", "SuperAdmin", null], default: null },
  requested_by_name: { type: String, default: "" },
  requested_at: { type: Date, default: null },
  decided_at: { type: Date, default: null },
  rejection_reason: { type: String, default: null },
  signature_url: { type: String, default: null },
  history: {
    type: [
      {
        action: { type: String, enum: ["SUBMITTED", "APPROVED", "REJECTED", "WITHDRAWN"] },
        by_name: { type: String, default: "" },
        approver_name: { type: String, default: "" },
        reason: { type: String, default: null },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    default: [],
  },
};

module.exports = { approvalDefinition };