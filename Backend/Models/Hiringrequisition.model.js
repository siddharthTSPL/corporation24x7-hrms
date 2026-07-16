const mongoose = require("mongoose");

const hiringRequisitionSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
    },

    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
    },

    job_title: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      enum: ["OPR", "BPO", "ENG", "HR", "MGMT"],
      required: true,
    },

    openings: {
      type: Number,
      required: true,
      min: 1,
    },

    filled_count: {
      type: Number,
      default: 0,
      min: 0,
    },

    employment_type: {
      type: String,
      enum: ["Full Time", "Part Time", "Contract", "Internship"],
      required: true,
    },

    experience_required: {
      type: String,
      trim: true,
    },

    skills_required: {
      type: [String],
      default: [],
    },

    salary_range: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    work_mode: {
      type: String,
      enum: ["Remote", "Hybrid", "Onsite"],
      required: true,
    },

    job_description: {
      type: String,
      trim: true,
    },

    hiring_reason: {
      type: String,
      enum: [
        "New Position",
        "Replacement",
        "Team Expansion",
        "Project Requirement",
        "Urgent Requirement",
      ],
      required: true,
    },

    expected_joining_date: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "ON_HOLD", "REVISION_REQUIRED", "FILLED"],
      default: "PENDING",
    },

    admin_comment: {
      type: String,
      trim: true,
      default: null,
    },

    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    approved_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HiringRequisition", hiringRequisitionSchema);