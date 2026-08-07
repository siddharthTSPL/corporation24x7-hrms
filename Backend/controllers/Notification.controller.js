const NotificationModel = require("../Models/notification.model");

const getMyNotifications = async (req, res) => {
  const { recipientModel, id } = { recipientModel: req.actor.recipientModel, id: req.actor.id };

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { filter, type } = req.query;

  const query = { recipient: id, recipientModel };
  if (filter === "unread") query.isRead = false;
  if (type) query.type = type;

  const [items, total, unreadCount] = await Promise.all([
    NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    NotificationModel.countDocuments(query),
    NotificationModel.countDocuments({ recipient: id, recipientModel, isRead: false }),
  ]);

  return res.status(200).json({
    success: true,
    data: items,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasMore: page * limit < total,
    },
  });
};

const getUnreadCount = async (req, res) => {
  const { recipientModel, id } = { recipientModel: req.actor.recipientModel, id: req.actor.id };

  const unreadCount = await NotificationModel.countDocuments({
    recipient: id,
    recipientModel,
    isRead: false,
  });

  return res.status(200).json({ success: true, unreadCount });
};

const markAsRead = async (req, res) => {
  const { recipientModel, id } = { recipientModel: req.actor.recipientModel, id: req.actor.id };

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, recipient: id, recipientModel },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  return res.status(200).json({ success: true, data: notification });
};

const markAllAsRead = async (req, res) => {
  const { recipientModel, id } = { recipientModel: req.actor.recipientModel, id: req.actor.id };

  await NotificationModel.updateMany(
    { recipient: id, recipientModel, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return res.status(200).json({ success: true, message: "All notifications marked as read" });
};

const deleteNotification = async (req, res) => {
  const { recipientModel, id } = { recipientModel: req.actor.recipientModel, id: req.actor.id };

  const notification = await NotificationModel.findOneAndDelete({
    _id: req.params.id,
    recipient: id,
    recipientModel,
  });

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  return res.status(200).json({ success: true, message: "Notification deleted" });
};

const clearReadNotifications = async (req, res) => {
  const { recipientModel, id } = { recipientModel: req.actor.recipientModel, id: req.actor.id };

  const result = await NotificationModel.deleteMany({
    recipient: id,
    recipientModel,
    isRead: true,
  });

  return res.status(200).json({ success: true, message: "Read notifications cleared", deletedCount: result.deletedCount });
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};