import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "../../realtime/socket";
import Confetti from "./Confetti";
import { Modal, Button, TIER_COLORS, fmt } from "./ui";

// Mounted once in MainLayout. Listens for the server's live "gamification:event"
// and turns it into toasts, confetti, a level-up / new-badge celebration and a
// cache refresh so the XP chip + hub update instantly.
export default function GamificationHost({ enabled }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [celebrate, setCelebrate] = useState(null); // {levelUp, badges, milestone}
  const [burst, setBurst] = useState(0);
  const queue = useRef([]);
  const last = useRef(0);

  const show = useCallback((ev) => {
    const parts = [];
    if (ev.xp > 0) parts.push(`+${fmt(ev.xp)} XP`);
    if (ev.coins > 0) parts.push(`+${fmt(ev.coins)} 🪙`);
    if (parts.length && !(ev.levelUps?.length || ev.badges?.length)) {
      toast.custom(
        (t) => (
          <motion.div initial={{ opacity: 0, y: -14, scale: 0.95 }} animate={{ opacity: t.visible ? 1 : 0, y: t.visible ? 0 : -10, scale: 1 }} onClick={() => { toast.dismiss(t.id); navigate("/gamification"); }}
            className="pointer-events-auto flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-lg ring-1 ring-black/5">
            <span className="text-2xl">{ev.icon || "✨"}</span>
            <div>
              <p className="text-sm font-bold text-gray-800">{ev.label}</p>
              <p className="text-xs font-semibold text-[#730042]">{parts.join("  ·  ")}{ev.capped ? "  (daily XP limit reached)" : ""}</p>
            </div>
          </motion.div>
        ),
        { duration: 3500, id: `gam-${ev.event}-${Date.now()}` }
      );
    }
    (ev.quests || []).forEach((q) => toast.success(`${q.icon || "🗺️"} Quest complete: ${q.title} — claim your reward!`, { duration: 4500 }));
    if (ev.levelUps?.length || ev.badges?.length || ev.milestone) {
      queue.current.push({ levelUp: ev.levelUps?.[ev.levelUps.length - 1], badges: ev.badges || [], milestone: ev.milestone });
      setCelebrate((c) => c || queue.current.shift());
      setBurst((b) => b + 1);
    }
  }, [navigate]);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;
    const onEvent = (ev) => {
      qc.invalidateQueries({ queryKey: ["gam"] });
      const now = Date.now();
      if (now - last.current < 250) return; // coalesce bursts
      last.current = now;
      show(ev);
    };
    socket.on("gamification:event", onEvent);
    return () => socket.off("gamification:event", onEvent);
  }, [enabled, qc, show]);

  const close = () => setCelebrate(queue.current.length ? queue.current.shift() : null);

  return (
    <>
      <Confetti run={burst > 0} key={burst} onDone={() => {}} />
      <Modal open={!!celebrate} onClose={close} title="">
        <AnimatePresence>
          {celebrate && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="-mt-8 text-center">
              {celebrate.levelUp && (
                <div className="mb-4">
                  <motion.div animate={{ rotate: [0, -6, 6, -4, 4, 0] }} transition={{ duration: 1 }} className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#730042] to-[#cd166e] text-4xl font-black text-white shadow-xl">{celebrate.levelUp.level}</motion.div>
                  <h2 className="mt-3 text-2xl font-extrabold text-gray-800">Level up!</h2>
                  <p className="text-sm text-gray-500">You're now a <b>{celebrate.levelUp.title}</b> · {celebrate.levelUp.rank} rank</p>
                  <p className="mt-1 text-sm font-semibold text-[#730042]">+{celebrate.levelUp.coins} 🪙 level bonus</p>
                </div>
              )}
              {celebrate.milestone && (
                <div className="mb-4">
                  <div className="text-5xl">🔥</div>
                  <h2 className="mt-1 text-xl font-extrabold text-gray-800">{celebrate.milestone.days}-day streak!</h2>
                  <p className="text-sm font-semibold text-[#730042]">+{celebrate.milestone.xp} XP · +{celebrate.milestone.coins} 🪙</p>
                </div>
              )}
              {celebrate.badges?.map((b) => (
                <div key={b.key} className="mb-3 rounded-2xl p-4" style={{ background: `${b.color || TIER_COLORS[b.tier]}14` }}>
                  <div className="text-5xl">{b.icon}</div>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider" style={{ color: b.color || TIER_COLORS[b.tier] }}>New badge · {b.tier}</p>
                  <h3 className="text-lg font-extrabold text-gray-800">{b.name}</h3>
                  <p className="text-sm text-gray-500">{b.description}</p>
                  <p className="mt-1 text-xs font-semibold text-[#730042]">+{b.xp} XP · +{b.coins} 🪙</p>
                </div>
              ))}
              <div className="mt-2 flex justify-center gap-2">
                <Button variant="ghost" onClick={close}>Awesome!</Button>
                <Button onClick={() => { close(); navigate("/gamification"); }}>See my progress</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </>
  );
}
