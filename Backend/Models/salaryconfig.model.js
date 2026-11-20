const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 40 },
    label: { type: String, required: true, maxlength: 60 },
    type: { type: String, enum: ["earning", "variable", "employer", "deduction"], required: true },
    method: { type: String, enum: ["FIXED_ANNUAL", "FIXED_MONTHLY", "PERCENT_OF_CTC", "PERCENT_OF_COMPONENT", "BALANCE"], required: true },
    value: { type: Number, default: 0 },
    ref_key: { type: String, default: null },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const salaryConfigSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, unique: true, index: true },
    components: { type: [componentSchema], default: [] },
    version: { type: Number, default: 1 },
    updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    updated_by_model: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalaryConfig", salaryConfigSchema);