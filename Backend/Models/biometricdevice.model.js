const mongoose = require("mongoose");

// One physical biometric machine (e.g. Secureye S-B8CB, serial 2405021163).
// Created either by an admin typing the serial in, or automatically the
// first time the TorchX Biometric Agent (running on a laptop/PC next to the
// machine) reads the device and reports its details.
const biometricDeviceSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    serialNumber: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: "" }, // e.g. "Main Gate"
    location: { type: String, trim: true, default: "" },
    manufacturer: { type: String, trim: true, default: "" },
    model: { type: String, trim: true, default: "" }, // e.g. S-B8CB
    firmwareVersion: { type: String, trim: true, default: "" },
    platform: { type: String, trim: true, default: "" },
    // How the agent reaches it: lan (ZK-protocol over IP / direct cable),
    // usb_drive (pen-drive export file imported by the agent), manual_import (file uploaded from the web UI)
    connectionType: { type: String, enum: ["lan", "usb_cable", "usb_drive", "manual_import", "unknown"], default: "unknown" },
    ip: { type: String, default: "" },
    port: { type: Number, default: 4370 },
    userCount: { type: Number, default: 0 },
    fingerCount: { type: Number, default: 0 },
    logCount: { type: Number, default: 0 },
    logCapacity: { type: Number, default: 0 },
    // Timezone of the machine's clock, e.g. "+05:30". Empty = agent default. Set per device in HRMS.
    timezone: { type: String, trim: true, default: "", match: [/^([+-]\d{2}:\d{2})?$/, "timezone must look like +05:30"] },
    deviceTime: Date,
    // Which Attendance direction rule to use when the machine does not say in/out
    punchMode: { type: String, enum: ["first_last", "device_state"], default: "first_last" },
    isActive: { type: Boolean, default: true },
    lastSeenAt: Date,
    lastSyncAt: Date,
    lastSyncCount: { type: Number, default: 0 },
    agentHost: { type: String, default: "" }, // laptop name the agent runs on
  },
  { timestamps: true }
);

biometricDeviceSchema.index({ organisation_id: 1, serialNumber: 1 }, { unique: true });

module.exports = mongoose.model("BiometricDevice", biometricDeviceSchema);