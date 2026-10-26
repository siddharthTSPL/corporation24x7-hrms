const mongoose = require("mongoose");

// Raw record exactly as the machine reported it. Never edited - attendance
// is derived from these, so a wrong mapping can be fixed and re-processed.
const biometricPunchSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: "BiometricDevice", required: true },
    deviceSerial: { type: String, default: "" },
    deviceUserId: { type: String, required: true },
    punchTime: { type: Date, required: true },
    verifyMode: { type: String, default: "" }, // fingerprint / card / password / face
    inOutState: { type: Number, default: null }, // raw device state code, if provided
    // filled when the device user is mapped to a person
    empid: { type: String, default: "" },
    employee: { type: mongoose.Schema.Types.ObjectId, refPath: "onModel", default: null },
    onModel: { type: String, enum: ["User", "Manager", "Admin"], default: "User" },
    role: { type: String, enum: ["employee", "manager", "admin"], default: "employee" },
    processed: { type: Boolean, default: false },
    processNote: { type: String, default: "" },
  },
  { timestamps: true }
);

// Same punch re-sent by the agent (or re-imported from a pen drive) is ignored.
biometricPunchSchema.index({ device: 1, deviceUserId: 1, punchTime: 1 }, { unique: true });
biometricPunchSchema.index({ organisation_id: 1, punchTime: -1 });
biometricPunchSchema.index({ organisation_id: 1, empid: 1, punchTime: -1 });
biometricPunchSchema.index({ organisation_id: 1, employee: 1, processed: 1 });

module.exports = mongoose.model("BiometricPunch", biometricPunchSchema);
