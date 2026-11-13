import { useEffect, useMemo, useState } from "react";
import { Card, Pill, ProgressBar, Skeleton, Modal, Segmented, IconTile, TIER_COLORS, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamBadges, useMarkBadgesSeen } from "../../auth/server-state/gamification/gamification.hook";

const CATS = { all: "All", attendance: "Attendance", engagement: "Engagement", learning: "Learning", growth: "Growth", productivity: "Productivity", culture: "Recognition", progress: "Progress", profile: "Profile", organisation: "Company" };

function Tile({ b, onOpen }) {
  const col = b.color || TIER_COLORS[b.tier];
  return (
    <button onClick={() => onOpen(b)} className={`relative flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition hover:shadow-sm ${b.earned ? "border-[#ede5e0] bg-white" : "border-[#f0eae6] bg-[#faf7f5]"}`}>
      {b.earned && !b.seen && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#730042]" aria-label="New" />}
      <span className={b.earned ? "" : "opacity-40 grayscale"}><IconTile name={b.icon} color={col} size={40} round /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2"><span className={`truncate text-[13px] font-medium ${b.earned ? "text-[#2a1a16]" : "text-[#7a6a64]"}`}>{b.name}</span><Pill color={col} className="capitalize">{b.tier}</Pill></span>
        <span className="mt-0.5 line-clamp-2 block text-xs text-[#7a6a64]">{b.description}</span>
        {b.earned ? <span className="mt-1.5 block text-[11px] font-medium text-[#12794a]">Earned {timeAgo(b.earnedAt)}</span>
          : b.manual ? <span className="mt-1.5 block text-[11px] text-[#9c8880]">Awarded by managers or admins</span>
          : <span className="mt-2 block"><ProgressBar value={b.progress.current} max={b.progress.target} color={col} height={4} /><span className="mt-1 block text-[11px] text-[#9c8880]">{fmt(b.progress.current)} / {fmt(b.progress.target)}</span></span>}
      </span>
    </button>
  );
}

export default function AchievementsTab() {
  const { data, isLoading } = useGamBadges();
  const seen = useMarkBadgesSeen();
  const [cat, setCat] = useState("all"); const [filter, setFilter] = useState("all"); const [open, setOpen] = useState(null);
  useEffect(() => { if (data?.badges?.some((b) => b.earned && !b.seen)) { const t = setTimeout(() => seen.mutate(), 4000); return () => clearTimeout(t); } }, [data]); // eslint-disable-line
  const list = useMemo(() => (data?.badges || []).filter((b) => (cat === "all" || b.category === cat) && (filter === "all" || (filter === "earned" ? b.earned : !b.earned))), [data, cat, filter]);
  if (isLoading) return <Skeleton className="h-64" />;
  const cats = Object.keys(CATS).filter((c) => c === "all" || data.badges.some((b) => b.category === c));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#5b4b45]"><b className="text-lg font-semibold text-[#2a1a16]">{data.earnedCount}</b> of {data.total} achievements unlocked</p>
        <Segmented value={filter} onChange={setFilter} options={[["all", "All"], ["earned", "Earned"], ["locked", "In progress"]]} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${cat === c ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-[#ede5e0] bg-white text-[#5b4b45] hover:bg-[#faf7f5]"}`}>{CATS[c]}</button>)}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map((b) => <Tile key={b.key} b={b} onOpen={setOpen} />)}</div>
      {!list.length && <Card className="py-10 text-center text-sm text-[#7a6a64]">Nothing matches these filters.</Card>}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || ""}>
        {open && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><IconTile name={open.icon} color={open.color || TIER_COLORS[open.tier]} size={48} round /><div><Pill color={open.color || TIER_COLORS[open.tier]} className="capitalize">{open.tier}</Pill><p className="mt-1 text-[13px] text-[#5b4b45]">{open.description}</p></div></div>
            <p className="rounded-lg bg-[#faf7f5] px-3 py-2 text-xs text-[#5b4b45]">Reward: <b>+{fmt(open.reward?.xp)} XP</b> and <b>+{fmt(open.reward?.coins)} reward points</b></p>
            {open.earned ? <p className="rounded-lg bg-[#e7f6ee] px-3 py-2 text-xs font-medium text-[#12794a]">Earned {timeAgo(open.earnedAt)}{open.note ? ` - "${open.note}"` : ""}</p>
              : !open.manual ? <div><ProgressBar value={open.progress.current} max={open.progress.target} /><p className="mt-1 text-xs text-[#7a6a64]">{fmt(open.progress.current)} of {fmt(open.progress.target)}</p></div>
              : <p className="text-xs text-[#7a6a64]">This achievement is awarded by managers or admins.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
