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


// A single "Salary Component" — despite the field name `allowances` (kept
// for backward compatibility with existing org data), this now covers all
// four Zoho-style component categories: Earnings, Deductions, Benefits and
// Reimbursements. `category` decides which tab/bucket it shows up in and
// how it's folded into the payroll total; everything else about how its
// amount is computed (flat / % of Basic / % of CTC / a custom formula) is
// shared across categories.
const allowanceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["earning", "deduction", "benefit", "reimbursement"],
      default: "earning",
    },
    // How this component's monthly amount is computed. Left unset on old
    // records on purpose — payroll.utils falls back to the original
    // "flatAmount if >0, else percentOfBasic" behaviour when this is empty,
    // so nothing that already ran breaks.
    calculationType: {
      type: String,
      enum: ["flat", "percentOfBasic", "percentOfCTC", "percentOfGross", "formula"],
      default: "flat",
    },
    percentOfBasic: { type: Number, default: 0, min: 0 }, // used when calculationType is percentOfBasic (or legacy: flatAmount is 0)
    percentOfCTC: { type: Number, default: 0, min: 0 }, // used when calculationType is percentOfCTC
    percentOfGross: { type: Number, default: 0, min: 0 }, // used when calculationType is percentOfGross
    flatAmount: { type: Number, default: 0, min: 0 }, // flat rupees/month
    // Custom formula, e.g. "basic*0.1 + 500". Only these variables are
    // available: basic, gross (monthly gross), ctc (annual), hra.
    // Evaluated by the sandboxed evaluateFormula() in payroll.utils.js —
    // never passed to eval/new Function without being sanitised first.
    formula: { type: String, default: "", trim: true, maxlength: 300 },
    enabled: { type: Boolean, default: true },
    // Informational, Zoho-style "Consider for EPF/ESI" flags shown in the
    // Salary Components table. Statutory PF/ESI math in this app is fixed
    // to run on Basic (PF) and full earned gross (ESI) regardless of these
    // flags — they don't change the calculation, only the displayed label.
    considerForEPF: { type: Boolean, default: true },
    considerForESI: { type: Boolean, default: true },
    // Marks a Reimbursement component as part of the org's Flexible
    // Benefit Plan (mirrors Zoho's "mark a reimbursement as FBP component").
    isFBP: { type: Boolean, default: false },
    // The balancing allowance absorbs whatever is left of the gross after
    // Basic + HRA + every other named EARNING is accounted for, so the
    // components always add back up to the monthly gross exactly.
    // Exactly one earning in the array should have isBalancing: true.
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
        // Fully editable — flat / % of Basic / % of Gross / % of CTC / custom
        // formula, whichever the admin picks. This is a normal named earning,
        // NOT the balancing one, so its calculationType/formula is always
        // actually used when payroll is computed.
        { name: "Fixed Allowance", flatAmount: 0, enabled: true, isBalancing: false },
        // The ONE component that must always exist and stays locked on:
        // it silently absorbs whatever gross is left over after Basic, HRA
        // and every other earning above, so the breakup always reconciles
        // back to the monthly gross exactly. Because of that, its own
        // calculationType/formula is intentionally never evaluated — see
        // computeComponentAmount / calculateSalaryBreakup in payroll.utils.js.
        { name: "Top-up Allowance", flatAmount: 0, enabled: true, isBalancing: true },
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

    // Labour Welfare Fund — small state-specific contribution, employee +
    // employer share. Off by default since it's state-specific and many
    // orgs don't register for it (mirrors Zoho's Statutory Components tab).
    lwf: {
      enabled: { type: Boolean, default: false },
      employeeAmount: { type: Number, default: 0, min: 0 }, // deducted from employee, per Pay Schedule cycle
      employerAmount: { type: Number, default: 0, min: 0 }, // employer contribution, informational
    },

    // Statutory Bonus (Payment of Bonus Act) — an employer-cost accrual,
    // 8.33%–20% of Basic, not deducted from the employee. Shown as an
    // employer contribution line, same treatment as gratuity.
    statutoryBonus: {
      enabled: { type: Boolean, default: false },
      percentOfBasic: { type: Number, default: 8.33, min: 0, max: 20 },
    },

    // Fixed, organisation-wide pay run schedule (mirrors the standard
    // "Pay Schedule" screen every payroll product has: how often people are
    // paid, which calendar days count as working days, which day of the
    // month salary is paid on, and the fixed "No. of Working Days" used as
    // the denominator for per-day / LOP calculations — set once, then
    // locked so it can't quietly change under payroll already run against it).
    paySchedule: {
      payFrequency: { type: String, enum: ["Monthly"], default: "Monthly" },
      workingDays: {
        type: [String],
        default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      },
      payDay: { type: Number, default: 1, min: 1, max: 31 }, // day of month salary is paid out
      firstPayPeriodMonth: { type: Number, default: null, min: 1, max: 12 },
      firstPayPeriodYear: { type: Number, default: null },
      firstPayDate: { type: Date, default: null },
      // Fixed denominator used for per-day rate / LOP math (standard payroll
      // practice: e.g. 30, regardless of the actual number of days in a
      // given calendar month). Admin/SuperAdmin sets this once.
      noOfWorkingDays: { type: Number, default: 30, min: 1, max: 31 },
      // Once the first payroll has actually been generated against this
      // schedule, it locks — same behaviour as "Pay Schedule cannot be
      // edited once you process the first pay run."
      locked: { type: Boolean, default: false },
    },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PayrollPolicy || mongoose.model("PayrollPolicy", payrollPolicySchema);