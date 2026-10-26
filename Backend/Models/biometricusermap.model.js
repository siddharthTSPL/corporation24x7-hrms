const mongoose = require("mongoose");

// Links the numeric "user id" enrolled on a device to an HRMS person (empid).
const biometricUserMapSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: "BiometricDevice", required: true },
    deviceUserId: { type: String, required: true, trim: true },
    deviceUserName: { type: String, default: "" },
    cardNumber: { type: String, default: "" },
    empid: { type: String, default: "", trim: true },
    employee: { type: mongoose.Schema.Types.ObjectId, refPath: "onModel", default: null },
    onModel: { type: String, enum: ["User", "Manager", "Admin"], default: "User" },
    role: { type: String, enum: ["employee", "manager", "admin"], default: "employee" },
    mappedBy: { type: String, enum: ["auto", "manual", null], default: null },
  },
  { timestamps: true }
);

biometricUserMapSchema.index({ device: 1, deviceUserId: 1 }, { unique: true });
biometricUserMapSchema.index({ organisation_id: 1, empid: 1 });

module.exports = mongoose.model("BiometricUserMap", biometricUserMapSchema);
