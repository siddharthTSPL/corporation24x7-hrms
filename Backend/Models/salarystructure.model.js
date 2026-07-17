const mongoose = require("mongoose");

// One document per employee. Admin/SuperAdmin sets the annual CTC once
// (usually right after onboarding); the full monthly breakup (Basic, HRA,
// allowances, PF, ESI...) is computed automatically from the org's
// PayrollPolicy at that moment and cached here in `breakup`, so:
//   1. Payroll generation every month is just a read, not a recompute.
//   2. If the org edits its policy percentages later, past employees'
//      already-set structures don't silently change under them — a
//      structure is only recomputed when CTC is explicitly revised
//      (see recalculate()) or an Admin explicitly asks to re-apply policy.
const salaryStructureSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "employeeModel",
      required: true,
    },
    employeeModel: {
      type: String,
      required: true,
      enum: ["User", "Manager", "Admin"],
    },

    ctc: { type: Number, required: true, min: 0 }, // annual, in rupees
    effectiveFrom: { type: Date, default: Date.now },

    // Optional manual input — only used if the org's PayrollPolicy has
    // tds.enabled = true. Annual estimated tax liability for this employee;
    // monthly TDS deducted = annualTaxEstimate / 12. Left at 0 = no TDS.
    annualTaxEstimate: { type: Number, default: 0, min: 0 },

    // Cached computed breakup (monthly figures), produced by
    // utils/payroll.utils.js::calculateSalaryBreakup at the time CTC was set.
    breakup: {
      monthlyGross: { type: Number, default: 0 },
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: [
        {
          name: String,
          amount: Number,
          _id: false,
        },
      ],
      employerPF: { type: Number, default: 0 }, // informational (cost to company), not deducted from employee
      employerESI: { type: Number, default: 0 }, // informational
    },

    // Snapshot of the policy percentages actually used, so a payslip from
    // 6 months ago can still explain "why" even after the org edits policy.
    policySnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    revisionHistory: [
      {
        ctc: Number,
        effectiveFrom: Date,
        changedBy: mongoose.Schema.Types.ObjectId,
        changedByModel: { type: String, enum: ["Admin", "SuperAdmin"] },
        changedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    isActive: { type: Boolean, default: true },
    setBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    setByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
  },
  { timestamps: true }
);

salaryStructureSchema.index({ employee: 1 }, { unique: true });
salaryStructureSchema.index({ organisation_id: 1, employeeModel: 1, isActive: 1 });

module.exports = mongoose.models.SalaryStructure || mongoose.model("SalaryStructure", salaryStructureSchema);
