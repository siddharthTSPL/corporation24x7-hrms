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

    // Snapshot of who this payslip is for, taken at generation time, so the
    // payslip still reads correctly even if the employee's department /
    // designation changes later.
    employeeSnapshot: {
      name: { type: String, default: "" },
      employeeId: { type: String, default: "" }, // uid
      department: { type: String, default: "" },
      designation: { type: String, default: "" },
    },

    ctc: { type: Number, required: true },

    breakup: {
      monthlyGross: { type: Number, default: 0 },
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: [{ name: String, amount: Number, _id: false }],
      // Custom Deduction / Benefit / Reimbursement Salary Components active
      // at generation time (Zoho-style Salary Components tabs), snapshotted
      // here the same way `allowances` snapshots earnings.
      deductionComponents: [{ name: String, amount: Number, _id: false }],
      benefitComponents: [{ name: String, amount: Number, _id: false }],
      reimbursementComponents: [{ name: String, amount: Number, isFBP: Boolean, _id: false }],
    },

    attendance: {
      // Kept for back-compat with older records/reports.
      daysInMonth: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      halfDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      paidDays: { type: Number, default: 0 },

      // Payslip-facing labels — same numbers, clearer names.
      calendarDays: { type: Number, default: 0 }, // actual days in that month
      workingDays: { type: Number, default: 0 }, // org's fixed "No. of Working Days" (or calendar days if unset)
      lopDays: { type: Number, default: 0 }, // Loss of Pay days = workingDays - paidDays

      // true when paidDays was typed in by hand at generation time instead
      // of being pulled from AttendanceSummary.
      manualEntry: { type: Boolean, default: false },
    },

    earnings: {
      gross: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      incentive: { type: Number, default: 0 },
      overtime: { type: Number, default: 0 },
      reimbursement: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      benefits: { type: Number, default: 0 }, // total of active "benefit" Salary Components
      reimbursementComponents: { type: Number, default: 0 }, // total of active "reimbursement" Salary Components
      totalEarnings: { type: Number, default: 0 },
    },

    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      lwf: { type: Number, default: 0 },
      lossOfPay: { type: Number, default: 0 },
      loan: { type: Number, default: 0 },
      advance: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      components: { type: Number, default: 0 }, // total of active "deduction" Salary Components
      totalDeductions: { type: Number, default: 0 },
    },

    employerContribution: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      gratuity: { type: Number, default: 0 }, // informational estimate, not deducted from employee
      lwf: { type: Number, default: 0 },
      statutoryBonus: { type: Number, default: 0 }, // informational estimate, not deducted from employee
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