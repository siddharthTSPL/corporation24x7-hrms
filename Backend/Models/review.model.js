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

    // Reviewer document id
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "reviewerRoleModel",
      required: true,
    },

    // Reviewer collection/model name
    reviewerRoleModel: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Manager", "User"],
      required: true,
    },

    // Actual role of employee being reviewed
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

    // Employee document id
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "revieweeRoleModel",
      required: true,
    },

    // Reviewee collection/model name
    revieweeRoleModel: {
      type: String,
      enum: ["Admin", "Manager", "User"],
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
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

// Prevent duplicate reviews for the same person in the same month
reviewSchema.index(
  {
    reviewer: 1,
    reviewee: 1,
    monthYear: 1,
  },
  {
    unique: true,
  }
);

// Fetch latest reviews efficiently
reviewSchema.index({
  reviewee: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Review", reviewSchema);