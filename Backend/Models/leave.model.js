const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    required: true,
    index: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manager",
    required: true,
  },
  applicantName: { type: String },
  applicantEmail: { type: String },
  applicantRole: { type: String, default: "Employee" },
  leaveType: {
    type: String,
    enum: ["el", "sl", "ml", "pl", "half_day_el", "half_day_sl", "lwp"],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  // Of `days`, how many fell outside available EL/SL/ML/PL balance and were
  // auto-converted to LWP by processLeaveDeduction() (see calculateleave.js).
  // 0 for a fully-covered leave or an explicit leaveType:"lwp" application.
  // Convention: balance covers the day range chronologically from
  // startDate, so the LAST `lwpDays` calendar days of [startDate, endDate]
  // are the LWP ones — matches how the balance would be consumed if each
  // day were applied for one at a time. Consumed by the leave-aware
  // absent-day checks in monthattendanceupdate.js, Marknoshowabsent.js,
  // and Reconcileattendancesummaryleaveaware.js.
  lwpDays: { type: Number, default: 0 },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: [
      "pending_manager",
      "approved_manager",
      "rejected_manager",
      "forwarded_reporting_manager",
      "approved_reporting_manager",
      "rejected_reporting_manager",
      "pending_admin",
      "approved_admin",
      "rejected_admin",
    ],
    default: "pending_manager",
  },
  directed_to: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "directed_to_model",
  },
  directed_to_model: {
    type: String,
    enum: ["Manager", "Admin"],
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId },
  approvedByModel: { type: String, enum: ["Manager", "Admin"] },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId },
  rejectedByModel: { type: String, enum: ["Manager", "Admin"] },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
  deleteAt: { type: Date, default: null, index: { expires: 0 } },
});

leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ employee: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ manager: 1, status: 1 });
leaveSchema.index({ directed_to: 1, status: 1 });
leaveSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);