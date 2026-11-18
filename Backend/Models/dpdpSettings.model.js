const mongoose = require("mongoose");

// One document per organisation (organisation_id === SuperAdmin._id).
// Holds the DPDP controls the org's Super Admin manages: masking on/off,
// the org-wide access PIN (stored only as a bcrypt hash) and the privacy
// notice / grievance-officer details shown to every data principal.
const purposeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    required: { type: Boolean, default: false },
  },
  { _id: false },
);

const dpdpSettingsSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    maskingEnabled: { type: Boolean, default: true },
    pinRequiredForDocuments: { type: Boolean, default: true },
    pinHash: { type: String, default: null, select: false },
    pinVersion: { type: Number, default: 0 },
    pinSetAt: { type: Date, default: null },
    pinSetBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    usingDefaultPin: { type: Boolean, default: false },
    unlockMinutes: { type: Number, default: 15, min: 1, max: 120 },
    unlockRoles: {
      type: [String],
      default: ["super_admin", "admin", "senior_admin", "official", "manager", "senior_manager"],
    },
    notice: {
      version: { type: String, default: "1.0" },
      url: { type: String, default: "" },
      purposes: {
        type: [purposeSchema],
        default: [
          { key: "employment", label: "Processing of my personal data for employment, payroll, attendance and statutory compliance", required: true },
          { key: "communication", label: "Sending me service notifications and HR communication", required: false },
        ],
      },
    },
    officer: {
      name: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
    },
    requestSlaDays: { type: Number, default: 30, min: 1, max: 90 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DpdpSettings", dpdpSettingsSchema);
