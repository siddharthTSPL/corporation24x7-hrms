const mongoose = require("mongoose");

const wfhSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "requesterModel",
      required: true,
    },
    requesterModel: {
      type: String,
      required: true,
      enum: ["User", "Manager", "Admin"],
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      default: null,
    },
    superadmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: [
        "pending_manager",
        "approved_manager",
        "rejected_manager",
        "forwarded_reporting_manager",
        "pending_reporting_manager",
        "approved_reporting_manager",
        "rejected_reporting_manager",
        "pending_superadmin",
        "approved_superadmin",
        "rejected_superadmin",
      ],
      default: "pending_manager",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    forwardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Manager", default: null },
    remarks: { type: String, trim: true, maxlength: 500, default: "" },
    deleteAt: { type: Date, default: null, index: { expires: 0 } },
  },
  { timestamps: true }
);

wfhSchema.index({ requester: 1, status: 1 });
wfhSchema.index({ requester: 1, startDate: 1, endDate: 1 });
wfhSchema.index({ manager: 1, status: 1 });
wfhSchema.index({ superadmin: 1, status: 1 });
wfhSchema.index({ createdAt: -1 });

module.exports = mongoose.model("WFH", wfhSchema);