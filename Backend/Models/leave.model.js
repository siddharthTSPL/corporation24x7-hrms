const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
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
      "pending_manager",
      "approved_manager",
      "rejected_manager",
      "forwarded_reporting_manager",
      "approved_reporting_manager",
      "rejected_reporting_manager",
    ],
    default: "pending_manager",
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
  deleteAt: { type: Date, default: null, index: { expires: 0 } },
});

leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ employee: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ manager: 1, status: 1 });
leaveSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Leave", leaveSchema);
