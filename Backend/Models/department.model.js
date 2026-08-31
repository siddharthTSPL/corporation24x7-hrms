const mongoose = require("mongoose");

// Custom departments, scoped per organisation. Replaces the old hardcoded
// department enum (OPR, BPO, ENG, HR, MGMT) on User/Manager/Admin so each
// organisation can add its own departments from TorchX Management and have
// them show up immediately in onboarding / edit-department dropdowns.
const departmentSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
    },
    // Optional short code (e.g. "ENG") shown alongside the full name.
    // Free text now instead of a fixed enum so orgs can name it however they like.
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    isDefault: {
      // seeded departments (OPR/BPO/ENG/HR/MGMT) that existing orgs already had
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ organisation_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Department", departmentSchema);