const NotificationModel = require("../Models/notification.model");

// Same "never crash the caller" guard used in notify.utils.js — creating an
// in-app notification is a side effect of the real action (leave decision,
// asset assignment, etc.) and must never be the reason that action fails.
const guarded = (fn, label) => async (payload) => {
  try {
    return await fn(payload);
  } catch (err) {
    console.error(`[notification] ${label} failed:`, err && err.stack ? err.stack : err);
    return null;
  }
};

const _createNotification = async ({
  recipientModel,
  recipientId,
  organisation_id,
  type = "general",
  title,
  message,
  link = null,
  priority = "medium",
  createdBy = null,
  createdByModel = null,
  meta = {},
}) => {
  if (!recipientModel || !recipientId || !title || !message) return null;

  return NotificationModel.create({
    recipient: recipientId,
    recipientModel,
    organisation_id: organisation_id || undefined,
    type,
    title,
    message,
    link,
    priority,
    createdBy: createdBy || undefined,
    createdByModel: createdByModel || undefined,
    meta,
  });
};

const _createBulkNotifications = async ({
  recipients, // [{ recipientModel, recipientId }]
  organisation_id,
  type = "general",
  title,
  message,
  link = null,
  priority = "medium",
  createdBy = null,
  createdByModel = null,
  meta = {},
}) => {
  if (!Array.isArray(recipients) || recipients.length === 0 || !title || !message) return null;

  const docs = recipients
    .filter((r) => r && r.recipientModel && r.recipientId)
    .map((r) => ({
      recipient: r.recipientId,
      recipientModel: r.recipientModel,
      organisation_id: organisation_id || undefined,
      type,
      title,
      message,
      link,
      priority,
      createdBy: createdBy || undefined,
      createdByModel: createdByModel || undefined,
      meta,
    }));

  if (docs.length === 0) return null;

  return NotificationModel.insertMany(docs, { ordered: false });
};

module.exports = {
  createNotification: guarded(_createNotification, "createNotification"),
  createBulkNotifications: guarded(_createBulkNotifications, "createBulkNotifications"),
};