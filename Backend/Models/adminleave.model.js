const mongoose = require("mongoose");

const adminLeaveSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    leaveType: {
      type: String,
      enum: [
        "el",
        "sl",
        "ml",
        "pl",
        "half_day_el",
        "half_day_sl",
      ],
      required: true,
      lowercase: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    days: {
      type: Number,
      required: true,
      min: 0.5,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: [
        "pending_superadmin",
        "approved_superadmin",
        "rejected_superadmin",
      ],
      default: "pending_superadmin",
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    deleteAt: {
      type: Date,
      default: null,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

adminLeaveSchema.index({ admin: 1, status: 1 });
adminLeaveSchema.index({ startDate: 1, endDate: 1 });
adminLeaveSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminLeave", adminLeaveSchema);