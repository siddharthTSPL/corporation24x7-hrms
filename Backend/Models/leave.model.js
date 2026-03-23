const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manager",
    required: true
  },
  leaveType: {
    type: String,
    enum: ["el","sl","ml","pl","half_day_el","half_day_sl"],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  days: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: [
      "pending_manager",
      "approved_manager",
      "rejected_manager",
      "forwarded_admin",
      "approved_admin",
      "rejected_admin"
    ],
    default: "pending_manager"
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  remarks: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deleteAt: {
    type: Date,
    default: null,
    index: { expires: 0 }   
  }
});

module.exports = mongoose.model("Leave", leaveSchema);