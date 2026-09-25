const mongoose = require("mongoose");

const adminLeaveSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    applicantName: {
      type: String,
      default: "",
      trim: true,
    },

    applicantEmail: {
      type: String,
      default: "",
      trim: true,
    },

    applicantRole: {
      type: String,
      default: "Admin",
      trim: true,
    },

    leaveType: {
      type: String,
      enum: ["el", "sl", "ml", "pl", "half_day_el", "half_day_sl", "lwp"],
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

    supportingDocument: {
      url: {
        type: String,
        default: null,
      },
      fileId: {
        type: String,
        default: null,
      },
      originalName: {
        type: String,
        default: null,
      },
      mimeType: {
        type: String,
        default: null,
      },
      sizeKb: {
        type: Number,
        default: null,
      },
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
  },
);

adminLeaveSchema.index({ admin: 1, status: 1 });
adminLeaveSchema.index({ organisation_id: 1, status: 1 });
adminLeaveSchema.index({ startDate: 1, endDate: 1 });
adminLeaveSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminLeave", adminLeaveSchema);
