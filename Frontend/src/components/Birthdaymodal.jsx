import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";

const CONFETTI_COLORS = ["#F5A623", "#EB5757", "#A43D67", "#7A2148", "#2FB4A0", "#F6C90E"];

const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: (i * 41) % 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 6 + ((i * 5) % 6),
  delay: (i % 10) * 0.22,
  duration: 3.2 + (i % 6) * 0.35,
  rotate: (i * 53) % 360,
  round: i % 3 === 0,
}));

const BALLOONS = [
  { color: "#EB5757", left: "8%", delay: 0 },
  { color: "#F5A623", left: "22%", delay: 0.4 },
  { color: "#2FB4A0", left: "78%", delay: 0.2 },
  { color: "#A43D67", left: "90%", delay: 0.6 },
];

function BirthdayModal({ displayName, onClose, isClosing }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const firstName = displayName?.trim()?.split(" ")?.[0] || "there";

  const handleClose = () => {
    if (isClosing) return;
    setVisible(false);
    setTimeout(onClose, 220);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden px-4"
          style={{ background: "rgba(40, 12, 26, 0.5)", backdropFilter: "blur(10px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Falling confetti across the whole overlay */}
          {CONFETTI.map((c) => (
            <motion.span
              key={c.id}
              className="pointer-events-none absolute top-[-5%]"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.round ? c.size : c.size * 1.8,
                backgroundColor: c.color,
                borderRadius: c.round ? "9999px" : "2px",
              }}
              initial={{ y: "-10vh", opacity: 0, rotate: 0 }}
              animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: c.rotate }}
              transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: "linear" }}
            />
          ))}

          {/* Floating balloons flanking the card */}
          {BALLOONS.map((b, idx) => (
            <motion.div
              key={idx}
              className="pointer-events-none absolute bottom-0 hidden sm:block"
              style={{ left: b.left }}
              initial={{ y: "20vh", opacity: 0 }}
              animate={{ y: ["20vh", "-10vh"], opacity: [0, 1, 1] }}
              transition={{ duration: 6, delay: b.delay, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="h-14 w-11 rounded-[50%] shadow-lg"
                style={{ backgroundColor: b.color }}
              />
              <div className="mx-auto h-8 w-px bg-white/50" />
            </motion.div>
          ))}

          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-[#fffdfc] shadow-[0_40px_120px_rgba(88,28,58,0.35)]"
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isClosing}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#8A365A] shadow-sm transition-colors hover:bg-[#FFF1F6] hover:text-[#6F163D] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close birthday message"
            >
              <FaTimes size={12} />
            </button>

            <div
              className="relative overflow-hidden px-7 pb-8 pt-11 text-center"
              style={{ background: "linear-gradient(135deg, #7A2148 0%, #C9548A 55%, #F5A623 130%)" }}
            >
              <motion.div
                className="relative z-10 text-[54px] leading-none"
                animate={{ rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
              >
                🎂
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="relative z-10 mt-3 text-[28px] font-bold leading-tight text-white"
              >
                Happy Birthday, {firstName}! 🎉
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="relative z-10 mx-auto mt-3 max-w-xs text-[14px] leading-6 text-white/90"
              >
                Wishing you a day full of joy, laughter, and a year ahead filled with great moments.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="relative z-10 mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3.5 py-1 text-[12px] font-semibold text-white backdrop-blur-sm"
              >
                ✨ From all of us at Team TorchX
              </motion.p>
            </div>

            <div className="px-7 pb-7 pt-6 text-center">
              <motion.button
                type="button"
                onClick={handleClose}
                disabled={isClosing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(122,33,72,0.35)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7A2148 0%, #A43D67 100%)" }}
              >
                {isClosing ? "Saving..." : "Thanks, Team TorchX! 🎈"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default React.memo(BirthdayModal);