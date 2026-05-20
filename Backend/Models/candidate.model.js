const mongoose = require("mongoose");

const interviewRoundSchema = new mongoose.Schema(
  {
    round_number: { type: Number },
    round_type: {
      type: String,
      enum: ["Screening", "Technical", "HR Round", "Final Round", "Other"],
    },
    scheduled_at: { type: Date },
    conducted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    feedback: { type: String, default: "" },
    score: { type: Number, default: null },
    outcome: {
      type: String,
      enum: ["Pending", "Passed", "Failed", "No Show"],
      default: "Pending",
    },
  },
  { _id: true }
);

const candidateSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
    },

    requisition_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HiringRequisition",
      required: true,
    },

    full_name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    resume_url: {
      type: String,
      default: null,
    },

    experience: {
      type: String,
      trim: true,
    },

    current_company: {
      type: String,
      trim: true,
      default: null,
    },

    skills: {
      type: [String],
      default: [],
    },

    source: {
      type: String,
      enum: ["Portal", "Referral", "LinkedIn", "Walk-in", "Agency", "Other"],
      default: "Portal",
    },

    current_stage: {
      type: String,
      enum: [
        "APPLIED",
        "SCREENING",
        "SHORTLISTED",
        "INTERVIEW",
        "HR_ROUND",
        "SELECTED",
        "REJECTED",
        "OFFER_RELEASED",
        "JOINED",
      ],
      default: "APPLIED",
    },

    interview_rounds: {
      type: [interviewRoundSchema],
      default: [],
    },

    overall_feedback: {
      type: String,
      default: "",
    },

    rejection_reason: {
      type: String,
      default: null,
    },

    offered_salary: {
      type: Number,
      default: null,
    },

    joining_date: {
      type: Date,
      default: null,
    },

    added_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Candidate", candidateSchema);