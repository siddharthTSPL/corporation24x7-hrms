const mongoose = require("mongoose");

// One document per employee per month — the generated payslip record.
const payrollSchema = new mongoose.Schema(
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

    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    ctc: { type: Number, required: true },

    breakup: {
      monthlyGross: { type: Number, default: 0 },
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: [{ name: String, amount: Number, _id: false }],
    },

    attendance: {
      daysInMonth: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 }, // half-day weighted, from AttendanceSummary
      halfDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 }, // unpaid days
      paidDays: { type: Number, default: 0 },
    },

    earnings: {
      gross: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      incentive: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
    },

    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      lossOfPay: { type: Number, default: 0 },
      loan: { type: Number, default: 0 },
      advance: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },

    employerContribution: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
    },

    netSalary: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["generated", "approved", "paid", "on_hold"],
      default: "generated",
    },

    // Snapshot of the policy used for this specific month's run, for audit trail.
    policySnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    remarks: { type: String, trim: true, maxlength: 500, default: "" },

    generatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    generatedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    approvedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
    paidOn: { type: Date, default: null },
  },
  { timestamps: true }
);

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ organisation_id: 1, month: 1, year: 1 });
payrollSchema.index({ organisation_id: 1, status: 1 });

module.exports = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);
