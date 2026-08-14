import React from "react";
import { FaTrash } from "react-icons/fa";
import { getTypeMeta, formatRelativeTime } from "./notificationUtils";

function NotificationItem({ notification, onOpen, onDelete, dense = false }) {
  const meta = getTypeMeta(notification.type);
  const Icon = meta.icon;

  return (
    <div
      onClick={() => onOpen(notification)}
      className={`group relative flex gap-3 px-4 ${dense ? "py-3" : "py-3.5"} cursor-pointer transition-colors hover:bg-[#F6E8EF]/60 ${
        !notification.isRead ? "bg-[#F1FAFF]" : "bg-white"
      }`}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        <Icon className="text-sm" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!notification.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-[#00A8E8]" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <span className="text-[11px] text-gray-400 mt-1 inline-block">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification._id);
        }}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-white text-gray-400 hover:text-[#EB5757]"
        aria-label="Delete notification"
      >
        <FaTrash className="text-[11px]" />
      </button>
    </div>
  );
}

export default React.memo(NotificationItem);
