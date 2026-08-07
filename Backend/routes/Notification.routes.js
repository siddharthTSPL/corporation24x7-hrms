const express = require("express");
const notificationRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/anyRole.middleware");

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} = require("../controllers/Notification.controller");

notificationRouter.get("/", anyRoleAuth, asyncHandler(getMyNotifications));
notificationRouter.get("/unread-count", anyRoleAuth, asyncHandler(getUnreadCount));
notificationRouter.patch("/read-all", anyRoleAuth, asyncHandler(markAllAsRead));
notificationRouter.patch("/:id/read", anyRoleAuth, asyncHandler(markAsRead));
notificationRouter.delete("/clear-read", anyRoleAuth, asyncHandler(clearReadNotifications));
notificationRouter.delete("/:id", anyRoleAuth, asyncHandler(deleteNotification));

module.exports = notificationRouter;