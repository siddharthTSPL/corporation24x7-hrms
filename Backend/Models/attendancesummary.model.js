const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema({
    organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    required: true,
    index: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
  },
  role: {
    type: String,
  },
  month: Number,
  year: Number,
  presentDays: {
    type: Number,
    default: 0,
  },
  halfDays: {
    type: Number,
    default: 0,
  },
  absentDays: {
    type: Number,
    default: 0,
  },
  totalWorkingMinutes: {
    type: Number,
    default: 0,
  },
});

summarySchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceSummary", summarySchema);