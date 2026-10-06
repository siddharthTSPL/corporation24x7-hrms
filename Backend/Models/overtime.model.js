const mongoose = require("mongoose");

// One document per overtime claim. Anyone who can be on payroll (Employee /
// Manager / Admin) files it; an HR admin (Admin.isHR === true) or the org
// SuperAdmin reviews it. Once APPROVED it is picked up automatically by
// payroll generation for the month of `date` (see utils/Overtimerequest.utils.js).
const overtimeSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "requesterModel",
      required: true,
    },
    requesterModel: {
      type: String,
      required: true,
      enum: ["User", "Manager", "Admin"],
    },
    // Snapshot so the HR table still reads correctly later.
    requesterSnapshot: {
      name: { type: String, default: "" },
      employeeId: { type: String, default: "" },
      department: { type: String, default: "" },
      designation: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    // Calendar day the extra hours were worked (stored as IST midnight).
    date: { type: Date, required: true },
    // Payroll month/year this overtime belongs to (derived from `date`).
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    startTime: { type: String, default: "" }, // optional "HH:mm"
    endTime: { type: String, default: "" }, // optional "HH:mm"
    // Total overtime in minutes - the single source of truth for payroll.
    minutes: { type: Number, required: true, min: 1, max: 24 * 60 },
    hours: { type: Number, required: true, min: 0.01 },

    reason: { type: String, required: true, trim: true, maxlength: 500 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, refPath: "reviewedByModel", default: null },
    reviewedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
    reviewerName: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    remarks: { type: String, trim: true, maxlength: 500, default: "" },

    // Set when payroll generation has included this request in a payslip.
    payroll: { type: mongoose.Schema.Types.ObjectId, ref: "Payroll", default: null },
  },
  { timestamps: true }
);

overtimeSchema.index({ requester: 1, date: -1 });
overtimeSchema.index({ organisation_id: 1, status: 1, createdAt: -1 });
overtimeSchema.index({ requester: 1, requesterModel: 1, month: 1, year: 1, status: 1 });

module.exports = mongoose.models.Overtime || mongoose.model("Overtime", overtimeSchema);