const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
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
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    checkIn: Date,
    checkOut: Date,
    // Which physical gate/kiosk the scan happened at. Face-kiosk only -
    // System (manual/app) checkins use latitude/longitude instead.
    checkInGate: {
      type: String,
      default: null,
    },
    checkOutGate: {
      type: String,
      default: null,
    },
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
      enum: ["manual", "agent", "face"],
      default: "manual",
    },
    checkoutRemark: {
      type: String,
      enum: ["on_time", "overtime", "early_checkout", "auto_overtime", null],
      default: null,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    // true only when the system force-closed this session (shift end +
    // maxOvertimeMinutes passed with no manual/face checkout).
    autoCheckedOut: {
      type: Boolean,
      default: false,
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