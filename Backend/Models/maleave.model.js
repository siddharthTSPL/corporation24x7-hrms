const mongoose = require("mongoose");

const managerLeaveSchema = new mongoose.Schema({
  organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    required: true,
    index: true,
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manager",
    required: true,
  },
  applicantName: { type: String },
  applicantEmail: { type: String },
  applicantRole: { type: String, default: "Manager" },
  leaveType: {
    type: String,
    enum: ["el", "sl", "ml", "pl", "half_day_el", "half_day_sl", "lwp"],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String, required: true },
 status: {
  type: String,
  enum: [
    "pending_reporting_manager",
    "pending_admin",
    "approved_reporting_manager",
    "approved_admin",
    "rejected_reporting_manager",
    "rejected_admin",
  ],
  default: "pending_reporting_manager",
},
  directed_to: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "directed_to_model",
    default: null,
  },
  directed_to_model: {
    type: String,
    enum: ["Manager", "Admin"],
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "approvedByModel",
  },
  approvedByModel: {
    type: String,
    enum: ["Manager", "Admin"],
    default: null,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "rejectedByModel",
  },
  rejectedByModel: {
    type: String,
    enum: ["Manager", "Admin"],
    default: null,
  },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
  deleteAt: { type: Date, default: null, index: { expires: 0 } },
});

managerLeaveSchema.index({ manager: 1, status: 1 });
managerLeaveSchema.index({ directed_to: 1, status: 1 });
managerLeaveSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ManagerLeave", managerLeaveSchema);