import { Card, Avatar, LevelChip, XpBar, Pill, Skeleton, SectionTitle, ProgressBar, timeAgo, timeLeft, fmt } from "../../components/gamification/ui";
import { DailyReward, SpinWheel, QuizCard, StreakStrip } from "./DailyPanel";
import { ChallengeCard } from "./ChallengesTab";
import { useGamFeed } from "../../auth/server-state/gamification/gamification.hook";

function Hero({ me, season }) {
  const capPct = me.today.cap ? Math.min(100, Math.round((me.today.xp / me.today.cap) * 100)) : 0;
  return (
    <Card className="overflow-hidden">
      <div className="relative p-5 text-white" style={{ background: me.equipped.theme.css }}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={me.name} photo={me.photo} frame={me.equipped.frame} size={76} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{me.rank.label} rank</p>
            <h2 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">{me.name}<span className="rounded-full bg-white/25 px-2.5 py-0.5 text-sm">Lv {me.level.level}</span></h2>
            <p className="text-sm opacity-90">{me.equipped.title}{me.department ? ` · ${me.department}` : ""}</p>
          </div>
          <div className="flex gap-3 text-center">
            <div className="rounded-2xl bg-white/20 px-4 py-2 backdrop-blur"><p className="text-xl font-extrabold">{fmt(me.xp)}</p><p className="text-[10px] font-semibold uppercase opacity-80">Total XP</p></div>
            <div className="rounded-2xl bg-white/20 px-4 py-2 backdrop-blur"><p className="text-xl font-extrabold">🪙 {fmt(me.coins)}</p><p className="text-[10px] font-semibold uppercase opacity-80">Coins</p></div>
            <div className="hidden rounded-2xl bg-white/20 px-4 py-2 backdrop-blur sm:block"><p className="text-xl font-extrabold">🏅 {me.badgeCount}</p><p className="text-[10px] font-semibold uppercase opacity-80">Badges</p></div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-black/20 p-3 [&_*]:!text-white/90 [&>div>div]:!bg-white/25"><XpBar level={me.level} height={12} /></div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-gray-600">Today's XP</span><span className="text-gray-500">{fmt(me.today.xp)} / {fmt(me.today.cap)}</span></div><ProgressBar value={me.today.xp} max={me.today.cap || 1} color={capPct >= 100 ? "#f59e0b" : "#cd166e"} />{capPct >= 100 && <p className="mt-1 text-[11px] text-amber-600">Daily XP limit reached — quizzes, spins & quest rewards still count!</p>}</div>
        {season && <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-pink-50 p-3"><p className="text-xs font-bold text-indigo-700">{season.theme} {season.name}</p><p className="text-[11px] text-gray-500">{timeLeft(season.endsAt)} · Top prize: {fmt(season.prizes?.[0]?.xp)} XP + {fmt(season.prizes?.[0]?.coins)} 🪙</p></div>}
      </div>
    </Card>
  );
}

function Feed() {
  const { data } = useGamFeed();
  if (!data?.items?.length) return null;
  return (
    <Card className="p-4">
      <SectionTitle icon="📣" title="Around the company" />
      <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">{data.items.map((i) => (
        <div key={i.id} className="flex items-center gap-2.5"><Avatar name={i.name} photo={i.photo} size={30} ring={false} /><p className="min-w-0 flex-1 text-xs text-gray-700"><b>{i.mine ? "You" : i.name}</b> {i.text} <span className="text-base">{i.icon}</span></p><span className="shrink-0 text-[10px] text-gray-400">{timeAgo(i.at)}</span></div>))}</div>
    </Card>
  );
}

export default function OverviewTab({ hub, loading, goTo }) {
  if (loading || !hub) return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-40" /></div>;
  const { me, quests, daily, spin, quiz, weekBoard, challenges, recentBadges, season, modules } = hub;
  const todays = quests.quests.daily;
  const doneN = todays.filter((q) => q.status !== "active").length;
  return (
    <div className="space-y-4">
      <Hero me={me} season={season} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <SectionTitle icon="☀️" title="Today's quests" sub={`${doneN}/${todays.length} done${quests.claimable ? ` · ${quests.claimable} to claim` : ""}`} right={<button onClick={() => goTo("quests")} className="text-xs font-semibold text-[#730042] hover:underline">All quests →</button>} />
            <div className="space-y-2">{todays.map((q) => (
              <div key={q.id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5"><span className="text-xl">{q.icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-800">{q.title}</p><ProgressBar value={q.progress} max={q.target} color={q.status !== "active" ? "#10b981" : "#cd166e"} height={6} /></div><span className="text-xs font-bold text-[#730042]">+{q.xp}</span>{q.status === "completed" && <Pill color="#059669">claim</Pill>}{q.status === "claimed" && <span>✅</span>}</div>))}</div>
          </Card>
          <StreakStrip me={me} />
          <div className="grid gap-4 md:grid-cols-2">
            <DailyReward daily={daily} />
            {modules.spin !== false && <SpinWheel spin={spin} />}
          </div>
          {modules.quiz !== false && <QuizCard quiz={quiz} />}
        </div>
        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle icon="🏆" title="This week's top 5" right={<button onClick={() => goTo("leaderboard")} className="text-xs font-semibold text-[#730042] hover:underline">Full board →</button>} />
            {weekBoard?.rows?.length ? <div className="space-y-2">{weekBoard.rows.map((r) => (
              <div key={r.personKey} className="flex items-center gap-2.5"><span className="w-5 text-center text-sm">{["🥇", "🥈", "🥉"][r.position - 1] || r.position}</span><Avatar name={r.name} photo={r.photo} frame={r.frame} size={30} /><p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{r.name}</p><span className="text-xs font-bold text-[#730042]">{fmt(r.xp)}</span></div>))}
              {weekBoard.me && <p className="border-t pt-2 text-center text-xs text-gray-500">You're #{weekBoard.me.position} · {fmt(weekBoard.me.xp)} XP</p>}</div> : <p className="py-4 text-center text-xs text-gray-400">No activity yet this week.</p>}
          </Card>
          {recentBadges?.length > 0 && <Card className="p-4"><SectionTitle icon="🏅" title="Latest badges" right={<button onClick={() => goTo("badges")} className="text-xs font-semibold text-[#730042] hover:underline">All →</button>} /><div className="flex flex-wrap gap-2">{recentBadges.map((b) => <div key={b.key} title={b.name} className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-2xl ring-2 ring-pink-100">{b.icon || "🏅"}</div>)}</div></Card>}
          {challenges?.length > 0 && <div className="space-y-3">{challenges.map((c) => <ChallengeCard key={c.id} c={c} onBoard={() => goTo("challenges")} />)}</div>}
          <Feed />
        </div>
      </div>
    </div>
  );
}
