import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaBell, FaCheckDouble, FaInbox, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useUnreadNotificationCount,
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from "../../auth/server-state/notification/notification.hook";
import { groupByDay, getTypeMeta } from "./notificationUtils";
import NotificationItem from "./NotificationItem";
import { playNotificationSound, isSoundEnabled, setSoundEnabled } from "./notificationSound";

const LIVE_POLL_MS = 20000;

function BellSkeleton() {
  return (
    <div className="px-4 py-3 space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2.5 bg-gray-200 rounded w-full" />
            <div className="h-2 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const { data: unreadData } = useUnreadNotificationCount(true);
  const unreadCount = unreadData?.unreadCount || 0;

  // Always-on (not gated by `open`) so the dropdown, badge, sound and toast
  // all stay live in the background — this is what makes the bell "live"
  // instead of only refreshing once you click it open.
  const { data, isLoading, isError } = useNotifications(
    { page: 1, limit: 8, filter: "all" },
    true,
    { refetchInterval: LIVE_POLL_MS }
  );
  const notifications = data?.data || [];
  const grouped = groupByDay(notifications);

  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  // Tracks the newest notification id we've already alerted on, so a fresh
  // arrival — while the panel is open or closed — triggers one chime + one
  // toast, never a repeat on every poll.
  const lastSeenIdRef = useRef(undefined);

  useEffect(() => {
    if (!notifications.length) return;
    const newest = notifications[0];

    if (lastSeenIdRef.current === undefined) {
      // First load after mount: just remember where we are, don't alert
      // for notifications that already existed before this page opened.
      lastSeenIdRef.current = newest._id;
      return;
    }

    if (newest._id !== lastSeenIdRef.current && !newest.isRead) {
      lastSeenIdRef.current = newest._id;

      if (soundOn) playNotificationSound();

      const meta = getTypeMeta(newest.type);
      const Icon = meta.icon;
      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              handleOpenNotification(newest);
            }}
            className="flex items-start gap-3 bg-white shadow-lg border border-gray-100 rounded-xl p-3 w-[320px] max-w-[90vw] cursor-pointer transition-opacity duration-200"
            style={{ opacity: t.visible ? 1 : 0 }}
          >
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: meta.bg, color: meta.color }}
            >
              <Icon className="text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-snug">{newest.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{newest.message}</p>
            </div>
          </div>
        ),
        { duration: 5000 }
      );
    } else {
      lastSeenIdRef.current = newest._id;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, soundOn]);

  const handleToggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      toast.success(next ? "Notification sound on" : "Notification sound off");
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleOpenNotification = (notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification._id);
    }
    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <FaBell className="text-lg text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#EB5757] text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleSound}
                  className="text-gray-400 hover:text-[#730042] transition-colors"
                  aria-label={soundOn ? "Mute notification sound" : "Unmute notification sound"}
                  title={soundOn ? "Sound on" : "Sound off"}
                >
                  {soundOn ? <FaVolumeUp className="text-sm" /> : <FaVolumeMute className="text-sm" />}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-[#730042] hover:opacity-75"
                  >
                    <FaCheckDouble className="text-[10px]" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
              {isLoading && <BellSkeleton />}

              {!isLoading && isError && (
                <div className="px-4 py-10 text-center text-sm text-gray-400">
                  Couldn't load notifications.
                </div>
              )}

              {!isLoading && !isError && notifications.length === 0 && (
                <div className="px-4 py-10 flex flex-col items-center text-center gap-2">
                  <FaInbox className="text-2xl text-gray-300" />
                  <p className="text-sm text-gray-400">No notification</p>
                </div>
              )}

              {!isLoading &&
                !isError &&
                grouped.map(([label, items]) => (
                  <div key={label}>
                    <div className="px-4 py-1.5 bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      {label}
                    </div>
                    {items.map((n) => (
                      <NotificationItem
                        key={n._id}
                        notification={n}
                        onOpen={handleOpenNotification}
                        onDelete={handleDelete}
                        dense
                      />
                    ))}
                  </div>
                ))}
            </div>

            <button
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full py-2.5 text-center text-xs font-semibold text-[#730042] hover:bg-[#F6E8EF] border-t border-gray-100"
            >
              View all notifications
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}