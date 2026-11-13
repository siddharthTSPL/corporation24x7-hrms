import { useState } from "react";
import { Card, Button, ProgressBar, Pill, SectionTitle, Skeleton, Empty, IconTile, fmt } from "../../components/gamification/ui";
import { useGamQuests, useClaimQuest, useClaimAllQuests } from "../../auth/server-state/gamification/gamification.hook";

function GoalRow({ q }) {
  const claim = useClaimQuest();
  const done = q.status !== "active";
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <IconTile name={q.icon} size={36} color={done ? "#12794a" : "#730042"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] font-medium text-[#2a1a16]">{q.title}</p>
          {q.optional && <Pill>Stretch</Pill>}{q.custom && <Pill tone="info">Company</Pill>}
        </div>
        <p className="text-xs text-[#7a6a64]">{q.desc}</p>
        <div className="mt-2 flex items-center gap-3"><div className="max-w-[260px] flex-1"><ProgressBar value={q.progress} max={q.target} color={done ? "#12794a" : "#730042"} /></div><span className="text-[11px] font-medium text-[#7a6a64]">{q.progress} / {q.target}</span></div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-[#2a1a16]">+{fmt(q.xp)} XP</p>
        <p className="text-[11px] text-[#9c8880]">+{fmt(q.coins)} points</p>
      </div>
      <div className="w-20 shrink-0 text-right">
        {q.status === "completed" && <Button size="sm" loading={claim.isPending} onClick={() => claim.mutate(q.id)}>Claim</Button>}
        {q.status === "claimed" && <Pill tone="success">Claimed</Pill>}
      </div>
    </div>
  );
}

export default function GoalsTab() {
  const { data, isLoading } = useGamQuests();
  const claimAll = useClaimAllQuests();
  const [showOnboarding, setShowOnboarding] = useState(true);
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>;
  if (!data) return <Empty title="Goals are unavailable" />;
  const { quests, claimable } = data;
  const sections = [
    { id: "weekly", title: "Weekly goals", sub: "Reset every Monday" },
    { id: "monthly", title: "Monthly goals", sub: "Reset on the 1st of the month" },
    { id: "special", title: "Company goals", sub: "Set by your organisation" },
    { id: "daily", title: "Daily goals", sub: "Set by your organisation" },
    { id: "onboarding", title: "Getting started", sub: "One-time checklist" },
  ];
  return (
    <div className="space-y-5">
      {claimable > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-[#bfe6d0] bg-[#f3fbf6] p-4">
          <p className="text-[13px] font-medium text-[#12794a]">{claimable} goal reward{claimable > 1 ? "s" : ""} ready to claim</p>
          <Button loading={claimAll.isPending} onClick={() => claimAll.mutate()}>Claim all</Button>
        </Card>
      )}
      {sections.map((s) => {
        const list = quests[s.id] || [];
        if (!list.length) return null;
        const done = list.filter((q) => q.status !== "active").length;
        const hidden = s.id === "onboarding" && !showOnboarding;
        return (
          <section key={s.id}>
            <SectionTitle title={s.title} sub={s.sub} right={s.id === "onboarding" ? <Button variant="ghost" size="sm" onClick={() => setShowOnboarding((v) => !v)}>{done}/{list.length} done - {showOnboarding ? "Hide" : "Show"}</Button> : <span className="text-xs text-[#7a6a64]">{done}/{list.length} complete</span>} />
            {!hidden && <Card className="divide-y divide-[#f3efec]">{list.map((q) => <GoalRow key={q.id} q={q} />)}</Card>}
          </section>
        );
      })}
      {!Object.values(quests).some((l) => l.length) && <Card><Empty icon="target" title="No goals right now" /></Card>}
    </div>
  );
}
