const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, default: "custom" },
    title: { type: String, default: "", maxlength: 200 },
    body: { type: String, default: "", maxlength: 6000 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const offerLetterSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    requisition_id: { type: mongoose.Schema.Types.ObjectId, ref: "HiringRequisition", required: true },

    ref_no: { type: String, required: true },
    version: { type: Number, default: 1 },

    status: {
      type: String,
      enum: ["DRAFT", "REVIEW_DONE", "FINAL", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
      default: "DRAFT",
      index: true,
    },

    template_key: { type: String, default: "classic" },
    accent_color: { type: String, default: null },
    logo_url: { type: String, default: null },
    signature_url: { type: String, default: null },

    company: {
      name: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      website: { type: String, default: "" },
    },

    signatory: {
      name: { type: String, default: "" },
      designation: { type: String, default: "" },
    },

    letter_date: { type: Date, default: Date.now },
    designation: { type: String, default: "" },
    department: { type: String, default: "" },
    employment_type: { type: String, default: "" },
    work_mode: { type: String, default: "" },
    work_location: { type: String, default: "" },
    joining_date: { type: Date, default: null },
    valid_till: { type: Date, required: true },
    probation_months: { type: Number, default: 6 },
    notice_period_days: { type: Number, default: 30 },

    ctc: { type: mongoose.Schema.Types.Mixed, default: {} },
    ctc_overrides: { type: mongoose.Schema.Types.Mixed, default: {} },

    sections: { type: [sectionSchema], default: [] },

    token: { type: String, default: null, select: false, index: true, sparse: true },
    token_used_at: { type: Date, default: null },

    sent_at: { type: Date, default: null },
    sent_via: { type: [String], default: [] },
    resend_count: { type: Number, default: 0 },
    reminder_count: { type: Number, default: 0 },
    last_reminder_at: { type: Date, default: null },

    response: {
      action: { type: String, enum: ["ACCEPTED", "REJECTED"], default: null },
      at: { type: Date, default: null },
      ip: { type: String, default: null },
      user_agent: { type: String, default: null },
      reason: { type: String, default: null },
      comment: { type: String, default: null },
    },

    change_requests: {
      type: [
        {
          message: { type: String, maxlength: 1500 },
          requested_at: { type: Date, default: Date.now },
          ip: { type: String, default: null },
        },
      ],
      default: [],
    },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    reviewed_at: { type: Date, default: null },
    finalized_at: { type: Date, default: null },
  },
  { timestamps: true }
);

offerLetterSchema.index({ organisation_id: 1, ref_no: 1 }, { unique: true });

module.exports = mongoose.model("OfferLetter", offerLetterSchema);