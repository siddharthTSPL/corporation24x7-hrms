import { useNavigate } from "react-router-dom";
import { Flame } from "lucide-react";
import { useGamMe } from "../../auth/server-state/gamification/gamification.hook";
import { RANK_COLORS, fmt } from "./ui";

// Compact level / XP / coins / streak chip for the Navbar.
export default function XpChip({ enabled = true }) {
  const navigate = useNavigate();
  const { data } = useGamMe(enabled);
  if (!data?.enabled || !data?.eligible) return null;
  const me = data.me;
  const streak = me.streaks?.attendance?.current || me.streaks?.login?.current || 0;
  const pct = Math.round((me.level.progress || 0) * 100);
  return (
    <button onClick={() => navigate("/gamification")} title="Rewards & progress" className="group hidden items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md sm:flex">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold text-white" style={{ background: `conic-gradient(${RANK_COLORS[me.rank.key]} ${pct}%, #e5e7eb 0)` }}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px]" style={{ color: RANK_COLORS[me.rank.key] }}>{me.level.level}</span>
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[11px] font-bold text-gray-700">{fmt(me.xp)} XP</span>
        <span className="block text-[10px] text-gray-500">🪙 {fmt(me.coins)}</span>
      </span>
      {streak > 0 && <span className="flex items-center gap-0.5 text-xs font-bold text-orange-500"><Flame size={14} className="fill-orange-400" />{streak}</span>}
    </button>
  );
}
