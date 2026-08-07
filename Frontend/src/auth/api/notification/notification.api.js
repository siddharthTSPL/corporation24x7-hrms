import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const getNotifications = async ({ page = 1, limit = 20, filter = "all", type } = {}) => {
  const params = { page, limit };
  if (filter && filter !== "all") params.filter = filter;
  if (type) params.type = type;
  const res = await api.get("notifications", { params });
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await api.get("notifications/unread-count");
  return res.data;
};

export const markNotificationAsRead = async (id) => {
  const res = await api.patch(`notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsAsRead = async () => {
  const res = await api.patch("notifications/read-all");
  return res.data;
};

export const deleteNotification = async (id) => {
  const res = await api.delete(`notifications/${id}`);
  return res.data;
};

export const clearReadNotifications = async () => {
  const res = await api.delete("notifications/clear-read");
  return res.data;
};
