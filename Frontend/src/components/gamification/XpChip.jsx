import { useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import { useGamMe } from "../../auth/server-state/gamification/gamification.hook";
import { RANK_COLORS, fmt, ProgressBar } from "./ui";

// Compact level / XP indicator for the Navbar. Hidden when the module is off.
export default function XpChip({ enabled = true }) {
  const navigate = useNavigate();
  const { data } = useGamMe(enabled);
  if (!data?.enabled || !data?.eligible) return null;
  const me = data.me;
  const streak = me.streak?.current || 0;
  return (
    <button onClick={() => navigate("/gamification")} title="Recognition & Rewards" aria-label="Open Recognition and Rewards"
      className="hidden items-center gap-3 rounded-lg border border-[#ede5e0] bg-white px-3 py-1.5 text-left transition hover:bg-[#faf7f5] sm:flex">
      <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: RANK_COLORS[me.rank.key] }}>Lv {me.level.level}</span>
      <span className="w-24 leading-tight">
        <span className="flex items-baseline justify-between text-[11px]"><b className="text-[#2a1a16]">{fmt(me.xp)} XP</b><span className="text-[#9c8880]">{fmt(me.coins)} pts</span></span>
        <span className="mt-1 block"><ProgressBar value={Math.round((me.level.progress || 0) * 1000)} max={1000} height={4} /></span>
      </span>
      {streak >= 2 && <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#c2410c]" title="Attendance streak"><Flame size={13} />{streak}</span>}
    </button>
  );
}
