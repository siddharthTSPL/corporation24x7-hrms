const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TSProject",
      default: null,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },

    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "assigned_by_model",
    },
    assigned_by_model: {
      type: String,
      required: true,
      enum: ["SuperAdmin", "Admin", "Manager"],
    },

    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "assigned_to_model",
    },
    assigned_to_model: {
      type: String,
      required: true,
      enum: ["Admin", "Manager", "User"],
    },

    is_self_assigned: { type: Boolean, default: false },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    billable: { type: Boolean, default: false },
    hourly_rate: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },

    estimated_hours: { type: Number, default: 0, min: 0 },
    logged_hours_cache: { type: Number, default: 0, min: 0 },

    // Per-day working-hour cap for this job. Anything logged on a given IST
    // day beyond this (across all of the assignee's jobs, not just this one)
    // is treated as overtime instead of regular working time. Null/0 means
    // "not set" -> the assignee's shift duration (end - start) is used as
    // the fallback daily cap at log-time.
    max_hours_per_day: { type: Number, default: null, min: 0.5, max: 24 },

    due_date: { type: Date, default: null },

    status: {
      type: String,
      enum: ["not_started", "in_progress", "on_hold", "completed", "cancelled"],
      default: "not_started",
    },

    overrun_flagged: { type: Boolean, default: false },
    overrun_flagged_at: { type: Date, default: null },

    work_items: [
      {
        name: { type: String, required: true, trim: true },
        is_completed: { type: Boolean, default: false },
      },
    ],

    tags: [{ type: String, trim: true }],

    archived_at: { type: Date, default: null },
  },
  { timestamps: true }
);

jobSchema.index({ organisation_id: 1, assigned_to: 1, status: 1 });
jobSchema.index({ organisation_id: 1, assigned_by: 1 });
jobSchema.index({ organisation_id: 1, project: 1 });
jobSchema.index({ organisation_id: 1, status: 1 });
jobSchema.index({ due_date: 1 });

jobSchema.methods.isOverEstimate = function () {
  if (!this.estimated_hours) return false;
  return this.logged_hours_cache > this.estimated_hours;
};

module.exports = mongoose.models.TSJob || mongoose.model("TSJob", jobSchema);