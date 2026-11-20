import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaBullhorn, FaTimes } from "react-icons/fa";
import { formatRelativeTime } from "./notificationUtils";

export default function FeatureNotificationModal({ notification, onClose }) {
  useEffect(() => {
    if (!notification) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [notification, onClose]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-notification-title"
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#730042] to-[#A12B71] px-6 py-7 text-white sm:px-8">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close feature details"
                className="absolute right-4 top-4 rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                <FaTimes />
              </button>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl">
                <FaBullhorn />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">New feature</span>
              <h2 id="feature-notification-title" className="mt-1 pr-8 text-2xl font-bold leading-tight">
                {notification.meta?.featureName || notification.title.replace(/^New Feature:\s*/i, "")}
              </h2>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">
                {notification.meta?.featureDescription || notification.message}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-xs text-gray-400">{formatRelativeTime(notification.createdAt)}</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-[#730042] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5D0036]"
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
