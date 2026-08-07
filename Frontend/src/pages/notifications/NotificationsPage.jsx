import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaCheckDouble, FaInbox, FaTrashAlt } from "react-icons/fa";
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useClearReadNotifications,
} from "../../auth/server-state/notification/notification.hook";
import { groupByDay, TYPE_META } from "../../components/notifications/notificationUtils";
import NotificationItem from "../../components/notifications/NotificationItem";

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading, isFetching, isError } = useNotifications({ page, limit, filter, type: type || undefined });
  const notifications = data?.data || [];
  const pagination = data?.pagination;
  const unreadCount = data?.unreadCount || 0;
  const grouped = groupByDay(notifications);

  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();
  const clearRead = useClearReadNotifications();

  const handleOpenNotification = (notification) => {
    if (!notification.isRead) markAsRead.mutate(notification._id);
    if (notification.link) navigate(notification.link);
  };

  const handleDelete = (id) => {
    deleteNotification.mutate(id, {
      onError: () => toast.error("Couldn't delete that notification"),
    });
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllAsRead.mutate(undefined, {
      onSuccess: () => toast.success("All caught up"),
      onError: () => toast.error("Couldn't mark all as read"),
    });
  };

  const handleClearRead = () => {
    clearRead.mutate(undefined, {
      onSuccess: (res) => toast.success(`Cleared ${res.deletedCount || 0} notification${res.deletedCount === 1 ? "" : "s"}`),
      onError: () => toast.error("Couldn't clear read notifications"),
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-[#730042] hover:bg-[#F6E8EF] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FaCheckDouble className="text-[11px]" />
            Mark all read
          </button>
          <button
            onClick={handleClearRead}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <FaTrashAlt className="text-[11px]" />
            Clear read
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === tab.key ? "bg-white text-[#730042] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#730042]"
        >
          <option value="">All types</option>
          {Object.keys(TYPE_META).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading && (
          <div className="px-4 py-10 text-center text-sm text-gray-400">Loading notifications...</div>
        )}

        {!isLoading && isError && (
          <div className="px-4 py-10 text-center text-sm text-gray-400">Couldn't load notifications.</div>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <div className="px-4 py-16 flex flex-col items-center text-center gap-2">
            <FaInbox className="text-3xl text-gray-300" />
            <p className="text-sm text-gray-400">No notification</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          grouped.map(([label, items]) => (
            <div key={label} className="divide-y divide-gray-50">
              <div className="px-4 py-2 bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                {label}
              </div>
              {items.map((n) => (
                <NotificationItem key={n._id} notification={n} onOpen={handleOpenNotification} onDelete={handleDelete} />
              ))}
            </div>
          ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || isFetching}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (pagination.hasMore ? p + 1 : p))}
            disabled={!pagination.hasMore || isFetching}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}