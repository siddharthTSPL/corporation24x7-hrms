const mongoose = require("mongoose");

// One document per organisation (same convention as LeavePolicy / HolidayPolicy).
// Holds the STANDARD payroll percentages. Every value ships with an industry
// default so an org that never touches this still gets a sane payroll, but
// SuperAdmin/Admin can edit any percentage or flip `enabled` off for any
// component a company doesn't want to run (e.g. many small companies don't
// register for ESI, or don't want to withhold TDS in-app).
//
// `enabled: false` on a component means: skip it entirely during payroll
// calculation (contributes 0, doesn't show up in the payslip breakdown).

const allowanceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    percentOfBasic: { type: Number, default: 0, min: 0 }, // used when flatAmount is 0
    flatAmount: { type: Number, default: 0, min: 0 }, // flat rupees/month, takes priority over percentOfBasic if > 0
    enabled: { type: Boolean, default: true },
    // The balancing allowance absorbs whatever is left of the gross after
    // Basic + HRA + every other named allowance is accounted for, so the
    // components always add back up to the monthly gross exactly.
    // Exactly one allowance in the array should have isBalancing: true.
    isBalancing: { type: Boolean, default: false },
  },
  { _id: false }
);

const payrollPolicySchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      unique: true,
      index: true,
    },

    basic: {
      percentOfGross: { type: Number, default: 40, min: 1, max: 100 },
    },

    hra: {
      enabled: { type: Boolean, default: true },
      percentOfBasic: { type: Number, default: 50, min: 0, max: 100 },
    },

    allowances: {
      type: [allowanceSchema],
      default: [
        { name: "Medical Allowance", flatAmount: 1250, enabled: true, isBalancing: false },
        { name: "Conveyance Allowance", flatAmount: 1600, enabled: true, isBalancing: false },
        { name: "Special Allowance", flatAmount: 0, enabled: true, isBalancing: true },
      ],
    },

    pf: {
      enabled: { type: Boolean, default: true },
      employeePercent: { type: Number, default: 12, min: 0, max: 100 },
      employerPercent: { type: Number, default: 12, min: 0, max: 100 },
      applyWageCeiling: { type: Boolean, default: false },
      wageCeiling: { type: Number, default: 15000 }, // PF computed on min(Basic, ceiling) when applyWageCeiling is true
    },

    esi: {
      enabled: { type: Boolean, default: false },
      employeePercent: { type: Number, default: 0.75, min: 0, max: 100 },
      employerPercent: { type: Number, default: 3.25, min: 0, max: 100 },
      // ESI only applies when monthly gross is at/below this statutory wage limit.
      // This limit changes over time by government notification, hence editable.
      wageThreshold: { type: Number, default: 21000 },
    },

    professionalTax: {
      enabled: { type: Boolean, default: true },
      monthlyAmount: { type: Number, default: 200, min: 0 }, // flat, state-specific — company sets their state's slab
    },

    tds: {
      // TDS is highly individual (depends on regime, exemptions, other income),
      // so this only toggles whether the app applies each employee's own
      // `annualTaxEstimate` (set on their SalaryStructure) divided by 12.
      // No org-wide percentage — there isn't one that's correct.
      enabled: { type: Boolean, default: false },
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PayrollPolicy || mongoose.model("PayrollPolicy", payrollPolicySchema);
