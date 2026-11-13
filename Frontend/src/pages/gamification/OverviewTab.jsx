import { Card, SectionTitle, Avatar, LevelChip, XpBar, Pill, Skeleton, ProgressBar, IconTile, Icon, Empty, Button, timeAgo, timeLeft, fmt, TIER_COLORS } from "../../components/gamification/ui";
import { useGamFeed, useClaimQuest } from "../../auth/server-state/gamification/gamification.hook";
import { ChallengeCard } from "./ChallengesTab";

const Metric = ({ label, value, sub }) => (
  <div className="min-w-[110px]">
    <p className="text-[11px] font-medium text-[#7a6a64]">{label}</p>
    <p className="mt-0.5 text-xl font-semibold tracking-tight text-[#2a1a16]">{value}</p>
    {sub && <p className="text-[11px] text-[#9c8880]">{sub}</p>}
  </div>
);

function Summary({ me, season }) {
  const capPct = me.today.cap ? Math.min(100, Math.round((me.today.xp / me.today.cap) * 100)) : 0;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex min-w-[240px] flex-1 items-center gap-4">
          <Avatar name={me.name} photo={me.photo} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-[#2a1a16]">{me.name}</h2>
              <LevelChip level={me.level.level} rank={me.rank.key} />
            </div>
            <p className="text-xs text-[#7a6a64]">{me.title} - {me.rank.label} tier{me.department ? ` - ${me.department}` : ""}</p>
            <div className="mt-2.5 max-w-sm"><XpBar level={me.level} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 border-l-0 border-[#ede5e0] lg:border-l lg:pl-8">
          <Metric label="Total XP" value={fmt(me.xp)} />
          <Metric label="Reward points" value={fmt(me.coins)} sub="Redeemable in Rewards" />
          <Metric label="Achievements" value={fmt(me.badgeCount)} />
          <Metric label="Attendance streak" value={`${me.streak.current} day${me.streak.current === 1 ? "" : "s"}`} sub={me.streak.atRisk ? "Check in today to keep it" : `Best: ${me.streak.longest}`} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 border-t border-[#f3efec] pt-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-[#7a6a64]"><span>XP earned today</span><span>{fmt(me.today.xp)} / {fmt(me.today.cap)}</span></div>
          <ProgressBar value={me.today.xp} max={me.today.cap || 1} color={capPct >= 100 ? "#c99700" : "#730042"} height={5} />
          {capPct >= 100 && <p className="mt-1 text-[11px] text-[#9a6700]">Daily XP limit reached. Goal and challenge rewards still count.</p>}
        </div>
        {season && <div className="flex items-center gap-3 rounded-lg bg-[#faf7f5] px-3 py-2"><IconTile name="trophy" size={30} /><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#2a1a16]">{season.name}</p><p className="text-[11px] text-[#7a6a64]">{timeLeft(season.endsAt)} - top prize {fmt(season.prizes?.[0]?.xp)} XP</p></div></div>}
      </div>
    </Card>
  );
}

function GoalRow({ q }) {
  const claim = useClaimQuest();
  const done = q.status !== "active";
  return (
    <div className="flex items-center gap-3 py-2.5">
      <IconTile name={q.icon} size={32} color={done ? "#12794a" : "#730042"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2"><p className="truncate text-[13px] font-medium text-[#2a1a16]">{q.title}</p><span className="shrink-0 text-[11px] text-[#7a6a64]">{q.progress}/{q.target}</span></div>
        <div className="mt-1.5"><ProgressBar value={q.progress} max={q.target} color={done ? "#12794a" : "#730042"} height={5} /></div>
      </div>
      {q.status === "completed" ? <Button size="sm" loading={claim.isPending} onClick={() => claim.mutate(q.id)}>Claim</Button> : q.status === "claimed" ? <Pill tone="success">Claimed</Pill> : <span className="w-14 text-right text-[11px] font-medium text-[#7a6a64]">+{q.xp} XP</span>}
    </div>
  );
}

function Feed() {
  const { data } = useGamFeed();
  if (!data?.items?.length) return null;
  return (
    <Card className="p-4">
      <SectionTitle icon="users" title="Company activity" />
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">{data.items.map((i) => (
        <div key={i.id} className="flex items-start gap-2.5"><Avatar name={i.name} photo={i.photo} size={28} /><p className="min-w-0 flex-1 text-xs leading-relaxed text-[#5b4b45]"><b className="font-semibold text-[#2a1a16]">{i.mine ? "You" : i.name}</b> {i.text}</p><span className="shrink-0 text-[10px] text-[#9c8880]">{timeAgo(i.at)}</span></div>))}</div>
    </Card>
  );
}

export default function OverviewTab({ hub, loading, goTo }) {
  if (loading || !hub) return <div className="space-y-4"><Skeleton className="h-44" /><Skeleton className="h-60" /></div>;
  const { me, quests, weekBoard, challenges, recentBadges, season } = hub;
  const goals = [...quests.quests.weekly, ...quests.quests.monthly, ...quests.quests.special, ...quests.quests.daily].filter((q) => q.status !== "claimed").slice(0, 6);
  const rows = weekBoard?.rows || [];
  return (
    <div className="space-y-4">
      <Summary me={me} season={season} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <SectionTitle icon="target" title="Your goals" sub={quests.claimable ? `${quests.claimable} reward${quests.claimable > 1 ? "s" : ""} ready to claim` : "Weekly and monthly goals"} right={<Button variant="ghost" size="sm" onClick={() => goTo("goals")}>View all</Button>} />
            {goals.length ? <div className="divide-y divide-[#f3efec]">{goals.map((q) => <GoalRow key={q.id} q={q} />)}</div> : <Empty icon="target" title="No active goals" hint="New goals appear every week and month." />}
          </Card>
          {challenges?.length > 0 && <div><h3 className="mb-2 text-sm font-semibold text-[#2a1a16]">Live challenges</h3><div className="grid gap-3 md:grid-cols-2">{challenges.map((c) => <ChallengeCard key={c.id} c={c} onBoard={() => goTo("challenges")} />)}</div></div>}
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle icon="trophy" title="Top contributors this week" right={<Button variant="ghost" size="sm" onClick={() => goTo("leaderboard")}>Leaderboard</Button>} />
            {rows.length ? <div className="space-y-2.5">{rows.map((r) => (
              <div key={r.personKey} className="flex items-center gap-2.5"><span className={`w-5 text-center text-xs font-semibold ${r.position <= 3 ? "text-[#730042]" : "text-[#9c8880]"}`}>{r.position}</span><Avatar name={r.name} photo={r.photo} size={28} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-[#2a1a16]">{r.name}</p><p className="truncate text-[11px] text-[#9c8880]">{r.department || r.title}</p></div><span className="text-xs font-semibold text-[#2a1a16]">{fmt(r.xp)}</span></div>))}
              {weekBoard.me && <p className="border-t border-[#f3efec] pt-2.5 text-center text-xs text-[#7a6a64]">You are ranked <b className="text-[#2a1a16]">#{weekBoard.me.position}</b> of {weekBoard.me.of} with {fmt(weekBoard.me.xp)} XP</p>}</div> : <Empty icon="trophy" title="No activity yet this week" />}
          </Card>
          {recentBadges?.length > 0 && <Card className="p-4"><SectionTitle icon="award" title="Recent achievements" right={<Button variant="ghost" size="sm" onClick={() => goTo("achievements")}>All</Button>} />
            <div className="space-y-2.5">{recentBadges.slice(0, 4).map((b) => <div key={b.key} className="flex items-center gap-2.5"><IconTile name={b.icon} color={TIER_COLORS[b.tier] || "#730042"} size={32} round /><div className="min-w-0"><p className="truncate text-[13px] font-medium text-[#2a1a16]">{b.name}</p><p className="truncate text-[11px] text-[#9c8880]">{timeAgo(b.earnedAt)}</p></div></div>)}</div></Card>}
          <Feed />
        </div>
      </div>
    </div>
  );
}
