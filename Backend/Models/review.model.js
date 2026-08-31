const mongoose = require("mongoose");

const gradeSubSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    grade: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const achievedGoalSchema = new mongoose.Schema(
  {
    goal: { type: String, trim: true, default: "" },
    target: { type: String, trim: true, default: "" },
    achievement: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Achieved", "Partially Achieved", "Not Achieved"],
      default: "Achieved",
    },
    employeeComments: { type: String, trim: true, default: "" },
    reviewerComments: { type: String, trim: true, default: "" },
    rating: { type: Number, min: 1, max: 5 },
  },
  { _id: false }
);

const nextGoalSchema = new mongoose.Schema(
  {
    goal: { type: String, trim: true, default: "" },
    target: { type: String, trim: true, default: "" },
    dueDate: { type: Date },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    actionPlan: { type: String, trim: true, default: "" },
    supportRequired: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "Pending" },
  },
  { _id: false }
);

const developmentPlanSchema = new mongoose.Schema(
  {
    area: { type: String, trim: true, default: "" },
    trainingRequired: { type: String, trim: true, default: "" },
    expectedImprovement: { type: String, trim: true, default: "" },
    targetDate: { type: Date },
    responsiblePerson: { type: String, trim: true, default: "" },
    reviewDate: { type: Date },
    status: { type: String, trim: true, default: "Pending" },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    // ── Who reviewed whom ──────────────────────────────────────────────
    reviewerRole: {
      type: String,
      enum: ["super_admin", "admin", "senior_admin", "manager", "senior_manager", "official"],
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
    reviewerDesignation: { type: String, trim: true, default: "" },

    revieweeRole: {
      type: String,
      enum: ["admin", "senior_admin", "manager", "senior_manager", "employee", "official"],
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
    revieweeDepartment: { type: String, trim: true, default: "" },
    revieweeDesignation: { type: String, trim: true, default: "" },
    lastReviewDate: { type: Date },

    // ── CHARACTERISTICS (Excel: Plus Points / Minus Points, graded 1-5) ─
    plusPoints: {
      type: [gradeSubSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length === 14,
        message: "plusPoints must contain all 14 criteria",
      },
    },
    minusPoints: {
      type: [gradeSubSchema],
      required: true,
      validate: {
        validator: (arr) => arr.length === 14,
        message: "minusPoints must contain all 14 criteria",
      },
    },

    // Auto-computed from plusPoints/minusPoints — see reviewScoring.utils.js
    overallScore: { type: Number, required: true, min: 1, max: 5 },
    overallRating: {
      type: String,
      enum: ["Excellent", "Very Good", "Good", "Average", "Poor"],
      required: true,
    },

    // ── GOALS & DEVELOPMENT PLAN ─────────────────────────────────────
    achievedGoals: { type: [achievedGoalSchema], default: [] },
    nextGoals: { type: [nextGoalSchema], default: [] },
    developmentPlan: { type: [developmentPlanSchema], default: [] },

    // ── COMMENTS & APPROVAL ──────────────────────────────────────────
    employeeComments: { type: String, trim: true, default: "" },
    reviewerComments: { type: String, trim: true, default: "" },
    recommendation: {
      type: String,
      enum: ["Promotion", "Increment", "Training", "PIP", "No Change"],
      default: "No Change",
    },

    // Step 1: reviewer submission — happens at creation time (see reviewerSubmittedAt).
    reviewerSubmittedAt: { type: Date, default: Date.now },

    // Step 2: reviewee (employee/manager/admin being reviewed) accepts.
    revieweeAcceptance: {
      status: { type: String, enum: ["pending", "accepted", "disputed"], default: "pending" },
      comment: { type: String, trim: true, default: "" },
      respondedAt: { type: Date },
    },

    // Step 3: HR acknowledgement — FINAL approval. Given by any Admin
    // flagged isHR = true (see Admin.model.js). Multiple admins can hold
    // the HR flag; the first one to act finalises the review.
    hrAcknowledgement: {
      status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      hrAdmin: { type: mongoose.Schema.Types.ObjectId, refPath: "hrAcknowledgement.hrAdminModel" },
      hrAdminModel: { type: String, enum: ["Admin", "SuperAdmin"], default: "Admin" },
      comment: { type: String, trim: true, default: "" },
      respondedAt: { type: Date },
    },

    // Overall workflow status, kept in sync by the controllers.
    status: {
      type: String,
      enum: ["submitted", "reviewee_accepted", "reviewee_disputed", "hr_approved", "hr_rejected"],
      default: "submitted",
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

reviewSchema.index({ reviewer: 1, reviewee: 1, monthYear: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ organisation_id: 1, "hrAcknowledgement.status": 1 });

module.exports = mongoose.model("Review", reviewSchema);