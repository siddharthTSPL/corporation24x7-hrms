const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    // Actual role of reviewer
    reviewerRole: {
      type: String,
      enum: [
        "super_admin",
        "admin",
        "senior_admin",
        "manager",
        "senior_manager",
        "official",
      ],
      required: true,
    },

    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "reviewerRoleModel",
      required: true,
    },

    reviewerRoleModel: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Manager", "User"],
      required: true,
    },

    revieweeRole: {
      type: String,
      enum: [
        "admin",
        "senior_admin",
        "manager",
        "senior_manager",
        "employee",
        "official",
      ],
      required: true,
    },

    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "revieweeRoleModel",
      required: true,
    },

    revieweeRoleModel: {
      type: String,
      enum: ["Admin", "Manager", "User"],
      required: true,
    },

    // ---- Parameter 1: Task Submission (manager enters days, system computes rest) ----
    taskSubmission: {
      assignedDays: { type: Number, required: true, min: 1 },
      actualDays: { type: Number, required: true, min: 1 },
      percentage: { type: Number, required: true },
      rating: {
        type: String,
        enum: ["Excellent", "Very Good", "Good", "Average", "Poor"],
        required: true,
      },
      score: { type: Number, required: true, min: 0, max: 10 },
    },

    // ---- Parameter 2: Behaviour & Ethics (manual, manager gives score directly) ----
    behaviourEthics: {
      score: { type: Number, required: true, min: 0, max: 10 },
      rating: {
        type: String,
        enum: ["Excellent", "Very Good", "Good", "Average", "Poor"],
        required: true,
      },
    },

    // ---- Parameter 3: Attendance (fully automatic, from AttendanceSummary) ----
    attendance: {
      presentDays: { type: Number, default: 0 },
      halfDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      totalWorkingDays: { type: Number, default: 0 },
      percentage: { type: Number, required: true },
      rating: {
        type: String,
        enum: ["Excellent", "Very Good", "Good", "Average", "Poor"],
        required: true,
      },
      score: { type: Number, required: true, min: 0, max: 10 },
    },

    // ---- Overall (simple average of the 3 scores above) ----
    overallScore: { type: Number, required: true, min: 0, max: 10 },
    overallRating: {
      type: String,
      enum: ["Excellent", "Very Good", "Good", "Average", "Poor"],
      required: true,
    },

    comment: {
      type: String,
      trim: true,
      default: "",
    },

    reviewPeriod: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },

    monthYear: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index(
  { reviewer: 1, reviewee: 1, monthYear: 1 },
  { unique: true }
);

reviewSchema.index({ reviewee: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);