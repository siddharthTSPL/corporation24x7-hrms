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
    // GPS accuracy radius in metres reported by the browser (Geolocation
    // API's coords.accuracy) at check-in time. Lets admins tell a genuine
    // GPS fix apart from a rough WiFi/IP-based one after the fact.
    accuracy: Number,
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
    // The single shared clock that activeMinutes/idleMinutes are actually
    // credited against. There is exactly ONE of these per session - unlike
    // channelPings below (which is per-channel and only used to know each
    // channel's latest reported status), this field is never duplicated
    // per-channel. That's what stops the browser tab and the desktop
    // (.exe) agent from each separately crediting the same wall-clock
    // minute, which is what let activeMinutes + idleMinutes add up to
    // MORE than the real elapsed session time when both were running at
    // once.
    lastAccountedAt: {
      type: Number,
      default: 0,
    },
    // Per-channel ping tracking so no two pinging sources clobber each
    // other's timestamp. Each channel records its OWN latest status/ping-
    // time here - used only to merge ("OR") every channel's status
    // together when crediting time against lastAccountedAt above. It is
    // NOT used to accrue minutes on its own (see activity() in
    // attendance.controller.js).
    //
    // A Map (not a fixed {browser, agent} shape) because a user can have
    // the desktop agent PLUS Talent open in several different browsers at
    // once, and each of those browsers needs its own key - "browser:<id>"
    // per browser, "agent" for the desktop app - otherwise a second
    // browser's idle ping overwrites the first browser's still-active
    // status under the same shared "browser" key, which is what made
    // some people's active time look wrong when they worked from more
    // than one browser.
    channelPings: {
      type: Map,
      of: new mongoose.Schema(
        {
          lastUpdated: { type: Number, default: 0 },
          status: { type: String, enum: ["active", "idle", null], default: null },
        },
        { _id: false }
      ),
      default: {},
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
// Guards against the race where two near-simultaneous requests (e.g. the
// desktop agent's activity ping and a manual/face check-in landing at the
// same moment) both find no existing record and both call .create() -
// producing two documents for the same real day. Callers must catch the
// E11000 duplicate-key error and re-fetch instead of failing the request.
// NOTE: run scripts/mergeDuplicateAttendance.js --apply BEFORE deploying
// this index - Mongo will refuse to build a unique index while duplicate
// (employee, role, date) combinations already exist in the collection.
attendanceSchema.index({ employee: 1, role: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;