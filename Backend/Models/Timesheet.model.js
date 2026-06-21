const mongoose = require("mongoose");

const timesheetSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "owner_model",
    },
    owner_model: {
      type: String,
      required: true,
      enum: ["Admin", "Manager", "User"],
    },

    period_type: {
      type: String,
      enum: ["day", "week"],
      default: "week",
    },

    week_start: { type: Date, required: true },
    week_end: { type: Date, required: true },

    time_logs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TimeLog",
      },
    ],

    total_minutes: { type: Number, default: 0, min: 0 },
    billable_minutes: { type: Number, default: 0, min: 0 },
    total_billed_amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },

    currentHandler: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "currentHandlerModel",
      default: null,
    },
    currentHandlerModel: {
      type: String,
      enum: ["Manager", "Admin", "SuperAdmin"],
      default: null,
    },

    handlerChain: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    status: {
      type: String,
      enum: [
        "draft",
        "pending_manager",
        "pending_reporting_manager",
        "pending_admin",
        "pending_superadmin",
        "approved",
        "rejected",
      ],
      default: "draft",
    },

    submitted_at: { type: Date, default: null },
    approved_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    rejected_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    remarks: { type: String, trim: true, maxlength: 500, default: "" },

    escalation_level: { type: Number, default: 0 },
    last_escalated_at: { type: Date, default: null },
  },
  { timestamps: true }
);

timesheetSchema.index({ organisation_id: 1, owner: 1, week_start: 1 }, { unique: true });
timesheetSchema.index({ organisation_id: 1, currentHandler: 1, status: 1 });
timesheetSchema.index({ organisation_id: 1, status: 1 });
timesheetSchema.index({ status: 1, last_escalated_at: 1 });

module.exports = mongoose.models.Timesheet || mongoose.model("Timesheet", timesheetSchema);