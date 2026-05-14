const mongoose = require("mongoose");

const managerLeaveSchema = new mongoose.Schema({
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manager",
    required: true,
  },
  leaveType: {
    type: String,
    enum: ["el", "sl", "ml", "pl", "half_day_el", "half_day_sl"],
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
      "approved_reporting_manager",
      "rejected_reporting_manager",
    ],
    default: "pending_reporting_manager",
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
  deleteAt: { type: Date, default: null, index: { expires: 0 } },
});

managerLeaveSchema.index({ manager: 1, status: 1 });
managerLeaveSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ManagerLeave", managerLeaveSchema);
