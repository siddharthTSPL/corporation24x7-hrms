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
  "policy",
  "payroll",
  "review",
  "training",
  "timesheet",
  "overtime",
  "holiday",
  "birthday",
  "system",
  "general",
  "chat",
  "meeting",
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

// ---- Real-time push (Socket.IO) -------------------------------------------
// Every notification in the app is created through this model (Model.create /
// insertMany via utils/Notification.utils.js), so hooking here pushes ALL of
// them live without touching any individual controller.
const toPayload = (doc) => {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    _id: o._id,
    recipient: o.recipient,
    recipientModel: o.recipientModel,
    type: o.type,
    title: o.title,
    message: o.message,
    link: o.link,
    priority: o.priority,
    isRead: o.isRead,
    meta: o.meta,
    createdAt: o.createdAt,
  };
};

const pushLive = (doc) => {
  try {
    // required lazily: config/socket.js loads account models for auth.
    const { emitToRecipient } = require("../config/socket");
    emitToRecipient(doc.recipientModel, doc.recipient, "notification:new", toPayload(doc));
  } catch (err) {
    console.error("[notification] live push failed:", err.message);
  }
};

notificationSchema.pre("save", function () {
  this.$locals.wasNew = this.isNew;
});

notificationSchema.post("save", function (doc) {
  if (doc.$locals && doc.$locals.wasNew) pushLive(doc);
});

notificationSchema.post("insertMany", function (docs) {
  if (Array.isArray(docs)) docs.forEach(pushLive);
});


const NotificationModel =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

module.exports = NotificationModel;