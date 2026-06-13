const mongoose = require("mongoose");

const wfhSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
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
    currentHandler: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "currentHandlerModel",
      default: null,
    },
    currentHandlerModel: {
      type: String,
      enum: ["Manager", "Admin", "SuperAdmin"],
      default: null,
    },
    handlerChain: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
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
    "pending_reporting_manager",
    "pending_admin",
    "pending_superadmin",
    "approved_manager",
    "approved_reporting_manager",
    "approved_admin",
    "approved_superadmin",
    "rejected_reporting_manager",
    "rejected_admin",
    "rejected_superadmin",
  ],
  default: "pending_manager",
},
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    forwardedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    remarks: { type: String, trim: true, maxlength: 500, default: "" },
    deleteAt: { type: Date, default: null, index: { expires: 0 } },
  },
  { timestamps: true }
);

wfhSchema.index({ requester: 1, status: 1 });
wfhSchema.index({ requester: 1, startDate: 1, endDate: 1 });
wfhSchema.index({ currentHandler: 1, status: 1 });
wfhSchema.index({ superadmin: 1, status: 1 });
wfhSchema.index({ handlerChain: 1 });
wfhSchema.index({ createdAt: -1 });

module.exports = mongoose.models.WFH || mongoose.model("WFH", wfhSchema);