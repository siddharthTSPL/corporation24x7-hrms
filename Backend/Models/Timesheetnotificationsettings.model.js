const mongoose = require("mongoose");

const alertFlag = { type: Boolean, default: true };

const timesheetNotificationSettingsSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      unique: true,
      index: true,
    },

    alerts: {
      job_assigned: alertFlag,
      project_member_added: alertFlag,
      submission_reminder: alertFlag,
      approver_on_submit: alertFlag,
      decision_to_employee: alertFlag,
      approval_reminder: alertFlag,
    },

    submission_deadline_weekday: { type: Number, default: 5, min: 1, max: 7 },
    submission_deadline_hour: { type: Number, default: 18, min: 0, max: 23 },
    submission_deadline_minute: { type: Number, default: 0, min: 0, max: 59 },
    submission_reminder_hours_before: {
      type: [Number],
      default: [24, 2],
    },

    approval_review_hours: { type: Number, default: 24, min: 1, max: 336 },
    approval_reminder_repeat_hours: { type: Number, default: 24, min: 1, max: 168 },
    approval_reminder_max_count: { type: Number, default: 3, min: 1, max: 10 },

    updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    updated_by_model: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.TimesheetNotificationSettings ||
  mongoose.model("TimesheetNotificationSettings", timesheetNotificationSettingsSchema);
