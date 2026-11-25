import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Award, TrendingUp, Target, Flame } from "lucide-react";
import { getSocket } from "../../realtime/socket";
import { fmt } from "./ui";

const Note = ({ t, icon: I, title, body, onClick }) => (
  <button onClick={onClick} className={`pointer-events-auto flex w-80 items-start gap-3 rounded-xl border border-[#ede5e0] bg-white p-3.5 text-left shadow-lg transition ${t.visible ? "opacity-100" : "opacity-0"}`}>
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#730042]/10 text-[#730042]"><I size={16} /></span>
    <span className="min-w-0"><span className="block text-[13px] font-semibold text-[#2a1a16]">{title}</span><span className="mt-0.5 block text-xs text-[#7a6a64]">{body}</span></span>
  </button>
);

// Mounted once in MainLayout. Listens for the server's live "gamification:event".
// Routine XP is silent (the navbar chip just refreshes); only meaningful moments
// - level-ups, achievements, completed goals, attendance milestones - get a toast.
export default function GamificationHost({ enabled }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const last = useRef(0);

  const show = useCallback((ev) => {
    const go = () => navigate("/gamification");
    const push = (icon, title, body) => toast.custom((t) => <Note t={t} icon={icon} title={title} body={body} onClick={() => { toast.dismiss(t.id); go(); }} />, { duration: 5000 });
    if (ev.levelUps?.length) { const l = ev.levelUps[ev.levelUps.length - 1]; push(TrendingUp, `You reached level ${l.level}`, `${l.title} - ${l.rank} tier. +${fmt(l.coins)} reward points.`); }
    (ev.badges || []).forEach((b) => push(Award, `Achievement unlocked: ${b.name}`, `${b.description || ""} +${fmt(b.xp)} XP, +${fmt(b.coins)} points.`));
    if (ev.milestone) push(Flame, `${ev.milestone.days}-day attendance streak`, `Bonus: +${fmt(ev.milestone.xp)} XP, +${fmt(ev.milestone.coins)} points.`);
    (ev.quests || []).forEach((q) => push(Target, `Goal completed: ${q.title}`, "Open Goals to claim your reward."));
  }, [navigate]);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;
    const onEvent = (ev) => {
      qc.invalidateQueries({ queryKey: ["gam"] });
      const now = Date.now();
      if (now - last.current < 250) return;
      last.current = now;
      show(ev);
    };
    socket.on("gamification:event", onEvent);
    return () => socket.off("gamification:event", onEvent);
  }, [enabled, qc, show]);

  return null;
}
