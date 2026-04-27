const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  reviewerRole: {
    type: String,
    enum: ["admin", "manager"],
    required: true
  },

  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "reviewerRoleModel",
    required: true
  },

  reviewerRoleModel: {
    type: String,
    enum: ["Admin", "Manager"], 
    required: true
  },

  revieweeRole: {
    type: String,
    enum: ["manager", "employee"],
    required: true
  },

  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "revieweeRoleModel",
    required: true
  },

  revieweeRoleModel: {
    type: String,
    enum: ["Manager", "User"], 
    required: true
  },

  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },

  comment: {
    type: String,
    trim: true
  },

  reviewPeriod: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly"
  },

  monthYear: {
    type: String,
    required: true
  }

}, { timestamps: true });

reviewSchema.index(
  { reviewer: 1, reviewee: 1, monthYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("Review", reviewSchema);