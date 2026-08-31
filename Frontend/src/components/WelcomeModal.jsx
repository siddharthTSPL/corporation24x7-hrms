import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowRight, FaCalendarCheck, FaFileInvoiceDollar, FaUsers, FaTimes } from "react-icons/fa";

// Deterministic-ish sparkle field so it doesn't re-shuffle on every re-render.
const SPARKLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 3 + ((i * 7) % 5),
  delay: (i % 8) * 0.35,
  duration: 2.4 + (i % 5) * 0.4,
}));

const HIGHLIGHTS = [
  { icon: FaCalendarCheck, label: "Mark attendance & apply leave in seconds" },
  { icon: FaUsers, label: "Stay in the loop with your team & announcements" },
  { icon: FaFileInvoiceDollar, label: "Payslips, documents & reimbursements, all in one place" },
];

function WelcomeModal({ displayName, professionLabel, roleLabel, onClose, isClosing }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const badgeLabel =
    professionLabel && roleLabel && professionLabel !== roleLabel
      ? `${professionLabel} · ${roleLabel}`
      : professionLabel || roleLabel || "TorchX Member";

  const firstName = displayName?.trim()?.split(" ")?.[0] || "there";
  const initial = firstName.charAt(0).toUpperCase();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setVisible(false);
    setTimeout(onClose, 220);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ background: "rgba(40, 12, 26, 0.45)", backdropFilter: "blur(10px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-[#fffdfc] shadow-[0_40px_120px_rgba(88,28,58,0.35)]"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isClosing}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#8A365A] shadow-sm transition-colors hover:bg-[#FFF1F6] hover:text-[#6F163D] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close welcome message"
            >
              <FaTimes size={12} />
            </button>

            {/* Hero */}
            <div
              className="relative overflow-hidden px-7 pb-8 pt-11 text-center"
              style={{ background: "linear-gradient(135deg, #7A2148 0%, #A43D67 55%, #C9548A 100%)" }}
            >
              {SPARKLES.map((s) => (
                <motion.span
                  key={s.id}
                  className="pointer-events-none absolute rounded-full bg-white"
                  style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
                  animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.7, 1.15, 0.7] }}
                  transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
                />
              ))}

              <motion.div
                className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white/80 bg-white/15 text-[28px] font-bold text-white shadow-lg backdrop-blur-sm"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
              >
                {initial}
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 mt-4 text-[13px] font-medium uppercase tracking-[0.14em] text-white/70"
              >
                {greeting}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                className="relative z-10 mt-1 text-[27px] font-bold leading-tight text-white"
              >
                Welcome, {firstName} 👋
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46 }}
                className="relative z-10 mx-auto mt-2 max-w-xs text-[13.5px] leading-6 text-white/85"
              >
                Your TorchX workspace is ready — set up for your role, right from day one.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.54 }}
                className="relative z-10 mt-4 inline-flex rounded-full border border-white/40 bg-white/15 px-3.5 py-1 text-[12px] font-semibold text-white backdrop-blur-sm"
              >
                {badgeLabel}
              </motion.p>
            </div>

            {/* Highlights */}
            <div className="space-y-2.5 px-7 pb-2 pt-6">
              {HIGHLIGHTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.08 }}
                    className="flex items-center gap-3 rounded-2xl border border-[#F3D6E2] bg-[#FFF7FA] px-3.5 py-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#7A2148]/10 text-[#7A2148]">
                      <Icon size={13} />
                    </span>
                    <span className="text-[12.5px] font-medium leading-snug text-[#5C3E4A]">{item.label}</span>
                  </motion.div>
                );
              })}
            </div>

            <div className="px-7 pb-7 pt-4 text-center">
              <motion.button
                type="button"
                onClick={handleClose}
                disabled={isClosing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(122,33,72,0.35)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7A2148 0%, #A43D67 100%)" }}
              >
                {isClosing ? "Saving..." : "Enter Workspace"}
                {!isClosing && <FaArrowRight size={12} />}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default React.memo(WelcomeModal);