import { useState } from "react";
import { Card, Button, ProgressBar, Pill, SectionTitle, Skeleton, Empty, timeLeft } from "../../components/gamification/ui";
import { useGamQuests, useClaimQuest, useClaimAllQuests, useRerollQuest } from "../../auth/server-state/gamification/gamification.hook";

function QuestRow({ q, canReroll, onReroll }) {
  const claim = useClaimQuest();
  const done = q.status !== "active";
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${q.status === "completed" ? "border-emerald-300 bg-emerald-50" : q.status === "claimed" ? "border-gray-200 bg-gray-50 opacity-70" : "border-gray-200 bg-white"}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-2xl">{q.icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-bold text-gray-800">{q.title}</p>
          {q.optional && <Pill color="#64748b">bonus</Pill>}
          {q.custom && <Pill color="#0891b2">company</Pill>}
        </div>
        <p className="text-xs text-gray-500">{q.desc}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1"><ProgressBar value={q.progress} max={q.target} color={done ? "#10b981" : "#cd166e"} /></div>
          <span className="text-[11px] font-semibold text-gray-500">{q.progress}/{q.target}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-bold text-[#730042]">+{q.xp} XP</p>
        <p className="text-[11px] text-gray-500">+{q.coins} 🪙</p>
        {q.status === "completed" && <Button variant="pink" className="mt-1 !px-3 !py-1 text-xs" loading={claim.isPending} onClick={() => claim.mutate(q.id)}>Claim</Button>}
        {q.status === "claimed" && <span className="text-[11px] font-semibold text-emerald-600">✓ Claimed</span>}
        {q.status === "active" && canReroll && q.period === "daily" && !q.custom && q.progress === 0 && (
          <button onClick={() => onReroll(q.id)} className="mt-1 text-[11px] font-semibold text-gray-400 underline hover:text-[#730042]">swap</button>
        )}
      </div>
    </div>
  );
}

export default function QuestsTab() {
  const { data, isLoading } = useGamQuests();
  const claimAll = useClaimAllQuests();
  const reroll = useRerollQuest();
  const [open, setOpen] = useState({ onboarding: true });
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  if (!data) return <Empty title="Quests unavailable" />;
  const { quests, claimable, dailyResetsAt, canReroll } = data;
  const sections = [
    { id: "daily", icon: "☀️", title: "Daily quests", sub: `Resets in ${timeLeft(dailyResetsAt).replace(" left", "")}` },
    { id: "weekly", icon: "📅", title: "Weekly quests", sub: "Resets every Monday" },
    { id: "monthly", icon: "🗓️", title: "Monthly quests", sub: "Resets on the 1st" },
    { id: "special", icon: "⭐", title: "Company quests", sub: "Set by your organisation" },
    { id: "onboarding", icon: "🚀", title: "Getting started", sub: "One-time quests — do them once and you're set" },
  ];
  return (
    <div className="space-y-5">
      {claimable > 0 && (
        <Card className="flex items-center justify-between gap-3 border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-800">🎉 {claimable} quest reward{claimable > 1 ? "s" : ""} ready to claim!</p>
          <Button variant="pink" loading={claimAll.isPending} onClick={() => claimAll.mutate()}>Claim all</Button>
        </Card>
      )}
      {sections.map((s) => {
        const list = quests[s.id] || [];
        if (!list.length) return null;
        const done = list.filter((q) => q.status !== "active").length;
        const collapsed = s.id === "onboarding" && !open.onboarding;
        return (
          <section key={s.id}>
            <SectionTitle icon={s.icon} title={s.title} sub={s.sub} right={
              <button onClick={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))} className="text-xs font-semibold text-gray-500 hover:text-[#730042]">{done}/{list.length} done {s.id === "onboarding" ? (open.onboarding ? "▲" : "▼") : ""}</button>} />
            {!collapsed && <div className="grid gap-2 lg:grid-cols-2">{list.map((q) => <QuestRow key={q.id} q={q} canReroll={canReroll} onReroll={(id) => reroll.mutate(id)} />)}</div>}
          </section>
        );
      })}
      <p className="text-center text-xs text-gray-400">Tip: finish every daily quest for a bonus "Daily sweep" reward 🧹</p>
    </div>
  );
}
