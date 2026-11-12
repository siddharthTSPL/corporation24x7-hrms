import { useEffect, useMemo, useState } from "react";
import { Card, Pill, ProgressBar, Skeleton, Modal, TIER_COLORS, SectionTitle, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamBadges, useMarkBadgesSeen } from "../../auth/server-state/gamification/gamification.hook";

const CATS = { all: "All", attendance: "Attendance", engagement: "Engagement", learning: "Learning", growth: "Growth", productivity: "Productivity", culture: "Culture", progress: "Progress", profile: "Profile", organisation: "Company" };

function BadgeTile({ b, onOpen }) {
  const col = b.color || TIER_COLORS[b.tier];
  const pct = b.progress?.target ? Math.round((b.progress.current / b.progress.target) * 100) : 0;
  return (
    <button onClick={() => onOpen(b)} className={`group relative flex flex-col items-center rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md ${b.earned ? "bg-white" : "bg-gray-50"}`} style={{ borderColor: b.earned ? `${col}66` : "#e5e7eb" }}>
      {b.earned && !b.seen && <span className="absolute right-2 top-2 h-2.5 w-2.5 animate-pulse rounded-full bg-[#cd166e]" />}
      <div className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl ${b.earned ? "" : "opacity-30 grayscale"}`} style={{ background: `${col}20`, boxShadow: b.earned ? `0 0 0 3px ${col}55` : "none" }}>{b.icon}</div>
      <p className={`mt-2 line-clamp-1 text-xs font-bold ${b.earned ? "text-gray-800" : "text-gray-500"}`}>{b.name}</p>
      <Pill color={col} className="mt-1 capitalize">{b.tier}</Pill>
      {!b.earned && !b.manual && <div className="mt-2 w-full"><ProgressBar value={b.progress.current} max={b.progress.target} color={col} height={5} /><p className="mt-0.5 text-[10px] text-gray-400">{fmt(b.progress.current)}/{fmt(b.progress.target)}</p></div>}
      {!b.earned && b.manual && <p className="mt-2 text-[10px] text-gray-400">Awarded by your team</p>}
    </button>
  );
}

export default function BadgesTab() {
  const { data, isLoading } = useGamBadges();
  const seen = useMarkBadgesSeen();
  const [cat, setCat] = useState("all");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  useEffect(() => { if (data?.badges?.some((b) => b.earned && !b.seen)) { const t = setTimeout(() => seen.mutate(), 4000); return () => clearTimeout(t); } }, [data]); // eslint-disable-line

  const list = useMemo(() => (data?.badges || []).filter((b) => (cat === "all" || b.category === cat) && (filter === "all" || (filter === "earned" ? b.earned : !b.earned))), [data, cat, filter]);
  if (isLoading) return <Skeleton className="h-64" />;
  const cats = Object.keys(CATS).filter((c) => c === "all" || data.badges.some((b) => b.category === c));

  // Group families together (Regular I..V) so tiers read left-to-right.
  const groups = {};
  list.forEach((b) => { (groups[b.family] = groups[b.family] || []).push(b); });

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-2xl font-extrabold text-gray-800">{data.earnedCount}<span className="text-base font-semibold text-gray-400"> / {data.total} badges</span></p><p className="text-xs text-gray-500">Earn badges by doing great work. Higher tiers pay more XP and coins.</p></div>
        <div className="flex gap-1">{["all", "earned", "locked"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${filter === f ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-600"}`}>{f}</button>)}</div>
      </Card>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${cat === c ? "border-[#730042] bg-pink-50 text-[#730042]" : "border-gray-200 bg-white text-gray-600"}`}>{CATS[c]}</button>)}</div>
      {Object.values(groups).map((g) => (
        <div key={g[0].family}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{g.map((b) => <BadgeTile key={b.key} b={b} onOpen={setOpen} />)}</div>
        </div>
      ))}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || ""}>
        {open && (
          <div className="text-center">
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl ${open.earned ? "" : "grayscale opacity-50"}`} style={{ background: `${open.color || TIER_COLORS[open.tier]}20` }}>{open.icon}</div>
            <Pill color={open.color || TIER_COLORS[open.tier]} className="mt-3 capitalize">{open.tier}</Pill>
            <p className="mt-2 text-sm text-gray-600">{open.description}</p>
            <p className="mt-2 text-xs font-semibold text-[#730042]">Reward: +{open.reward?.xp || 0} XP · +{open.reward?.coins || 0} 🪙</p>
            {open.earned ? <p className="mt-3 rounded-xl bg-emerald-50 p-2 text-sm font-semibold text-emerald-700">✓ Earned {timeAgo(open.earnedAt)}{open.note ? ` — “${open.note}”` : ""}</p>
              : !open.manual ? <div className="mt-3"><ProgressBar value={open.progress.current} max={open.progress.target} /><p className="mt-1 text-xs text-gray-500">{fmt(open.progress.current)} / {fmt(open.progress.target)}</p></div>
              : <p className="mt-3 text-xs text-gray-500">This badge is handed out by managers or admins.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
