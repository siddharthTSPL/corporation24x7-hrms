const mongoose = require("mongoose");

const editHistorySchema = new mongoose.Schema(
  {
    edited_at: { type: Date, default: Date.now },
    edited_by: { type: mongoose.Schema.Types.ObjectId, required: true },
    edited_by_model: {
      type: String,
      enum: ["Admin", "Manager", "User"],
      required: true,
    },
    previous_duration_minutes: { type: Number, required: true },
    previous_note: { type: String, default: "" },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const timeLogSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TSJob",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TSProject",
      default: null,
    },

    logged_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "logged_by_model",
    },
    logged_by_model: {
      type: String,
      required: true,
      enum: ["Admin", "Manager", "User"],
    },

    log_date: { type: Date, required: true },

    entry_mode: {
      type: String,
      enum: ["manual", "timer"],
      default: "manual",
    },

    start_time: { type: Date, default: null },
    end_time: { type: Date, default: null },

    duration_minutes: { type: Number, required: true, min: 0 },

    // Split of duration_minutes against that day's working-hour cap
    // (job.max_hours_per_day, falling back to the assignee's shift length).
    // regular_minutes + overtime_minutes always equals duration_minutes.
    regular_minutes: { type: Number, default: 0, min: 0 },
    overtime_minutes: { type: Number, default: 0, min: 0 },
    is_overtime: { type: Boolean, default: false },
    // Snapshot of the per-day cap (minutes) that was in effect when this
    // entry was logged/last recalculated, kept for audit/report clarity.
    daily_limit_minutes_at_log: { type: Number, default: null },

    note: { type: String, trim: true, maxlength: 500, default: "" },

    billable: { type: Boolean, default: false },
    hourly_rate: { type: Number, default: 0, min: 0 },
    billed_amount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },

    timesheet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timesheet",
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },

    edit_history: [editHistorySchema],

    is_idle_corrected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

timeLogSchema.index({ organisation_id: 1, logged_by: 1, log_date: 1 });
timeLogSchema.index({ organisation_id: 1, job: 1 });
timeLogSchema.index({ organisation_id: 1, timesheet: 1 });
timeLogSchema.index({ organisation_id: 1, status: 1 });
timeLogSchema.index({ logged_by: 1, status: 1, entry_mode: 1 });

timeLogSchema.methods.computeBilledAmount = function () {
  if (!this.billable) return 0;
  const hours = this.duration_minutes / 60;
  return Math.round(hours * this.hourly_rate * 100) / 100;
};

timeLogSchema.pre("save", async function () {
  this.billed_amount = this.billable ? this.computeBilledAmount() : 0;
});

module.exports =
  mongoose.models.TimeLog || mongoose.model("TimeLog", timeLogSchema);