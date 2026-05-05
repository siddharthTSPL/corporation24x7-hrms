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
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      "pending_admin",
      "approved_admin",
      "rejected_admin",
    ],
    default: "pending_admin",
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  remarks: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deleteAt: {
    type: Date,
    default: null,
    index: { expires: 0 },
  },
});

module.exports = mongoose.model("ManagerLeave", managerLeaveSchema);