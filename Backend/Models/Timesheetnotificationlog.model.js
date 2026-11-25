const mongoose = require("mongoose");

const timesheetNotificationLogSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    event_key: { type: String, required: true },

    type: {
      type: String,
      required: true,
      enum: [
        "job_assigned",
        "project_member_added",
        "submission_reminder",
        "approver_on_submit",
        "decision_to_employee",
        "approval_reminder",
      ],
    },

    recipient_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    recipient_model: { type: String, default: null },
    recipient_email: { type: String, default: "" },
    subject: { type: String, default: "" },

    timesheet: { type: mongoose.Schema.Types.ObjectId, ref: "Timesheet", default: null },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "TSJob", default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "TSProject", default: null },

    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    error: { type: String, default: "" },
    sent_at: { type: Date, default: null },
  },
  { timestamps: true }
);

timesheetNotificationLogSchema.index({ organisation_id: 1, event_key: 1 }, { unique: true });
timesheetNotificationLogSchema.index({ organisation_id: 1, status: 1, createdAt: -1 });
timesheetNotificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports =
  mongoose.models.TimesheetNotificationLog ||
  mongoose.model("TimesheetNotificationLog", timesheetNotificationLogSchema);
