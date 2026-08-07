const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "leave_applied",
  "leave_approved",
  "leave_rejected",
  "leave_forwarded",
  "wfh_applied",
  "wfh_approved",
  "wfh_rejected",
  "wfh_forwarded",
  "asset_assigned",
  "asset_returned",
  "announcement",
  "ticket",
  "reimbursement",
  "document",
  "payroll",
  "review",
  "timesheet",
  "holiday",
  "birthday",
  "system",
  "general",
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: true,
      index: true,
    },

    recipientModel: {
      type: String,
      enum: ["User", "Manager", "Admin", "SuperAdmin"],
      required: true,
    },

    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      index: true,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "general",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    link: {
      type: String,
      trim: true,
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByModel",
      default: null,
    },

    createdByModel: {
      type: String,
      enum: ["User", "Manager", "Admin", "SuperAdmin", "System", null],
      default: null,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, recipientModel: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, recipientModel: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

notificationSchema.statics.TYPES = NOTIFICATION_TYPES;

const NotificationModel =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

module.exports = NotificationModel;