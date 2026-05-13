const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "onModel",
      required: true,
    },
    onModel: {
      type: String,
      required: true,
      enum: ["User", "Manager", "Admin"],
      default: "User",
    },
    role: {
      type: String,
      enum: ["employee", "manager", "admin"],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: Date,
    checkOut: Date,
    latitude: Number,
    longitude: Number,
    selfie: String,
    activeMinutes: {
      type: Number,
      default: 0,
    },
    idleMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["present", "half_day", "absent"],
      default: "absent",
    },
    lastUpdated: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ["manual", "agent"],
      default: "manual",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: -1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employee: 1, status: 1 });
attendanceSchema.index(
  { date: 1, checkIn: 1, latitude: 1, longitude: 1 },
  { sparse: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;