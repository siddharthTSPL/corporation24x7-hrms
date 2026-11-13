import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Card, Stat, SectionTitle, Skeleton, Pill, Icon, fmt } from "../../../components/gamification/ui";
import { useAdminAnalytics } from "../../../auth/server-state/gamification/gamification.hook";
import { exportLeaderboardUrl } from "../../../auth/api/gamification/gamification.api";

const axis = { fontSize: 11, fill: "#9c8880" };

export default function AnalyticsAdmin() {
  const { data, isLoading, error } = useAdminAnalytics();
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (error) return <Card className="p-6 text-sm text-[#b42318]">{error.message}</Card>;
  const p = data.participation; const e = data.economy;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="users" label="Active this week" value={`${p.active7} / ${p.headcount}`} sub={`${p.rate}% engagement`} />
        <Stat icon="clock" label="Inactive for 14+ days" value={p.dormant} sub={`${p.optedOut} opted out`} color="#9a6700" />
        <Stat icon="award" label="Achievements earned" value={fmt(data.badgesEarned)} color="#6d28d9" />
        <Stat icon="thumbs" label="Recognitions (30 days)" value={fmt(data.kudos.last30d)} color="#be185d" />
        <Stat icon="wallet" label="Points in circulation" value={fmt(e.circulating)} sub={`${fmt(e.issued)} issued - ${fmt(e.spent)} spent`} color="#9a6700" />
        <Stat icon="gift" label="Redemptions (30 days)" value={e.redeemed30d} sub={`${fmt(e.coinsSpent30d)} points`} color="#12794a" />
        <Stat icon="clipboard" label="Pending approvals" value={e.pendingRedemptions} color={e.pendingRedemptions ? "#b42318" : "#7a6a64"} />
        <Stat icon="zap" label="Total XP earned" value={fmt(e.totalXp)} />
      </div>
      <Card className="p-4">
        <SectionTitle icon="trend" title="XP earned per day" sub="Last 30 days" right={<a href={exportLeaderboardUrl("month")} className="text-xs font-medium text-[#730042] hover:underline">Export month as CSV</a>} />
        <div className="h-56"><ResponsiveContainer><AreaChart data={data.daily.map((d) => ({ ...d, date: d.date.slice(5) }))}><defs><linearGradient id="gx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#730042" stopOpacity={0.25} /><stop offset="95%" stopColor="#730042" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f0eae6" /><XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} /><YAxis tick={axis} tickLine={false} axisLine={false} width={40} /><Tooltip /><Area dataKey="xp" stroke="#730042" strokeWidth={2} fill="url(#gx)" name="XP" /></AreaChart></ResponsiveContainer></div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><SectionTitle icon="target" title="What drives engagement" sub="Top activities, last 30 days" />
          <div className="space-y-2">{data.topEvents.map((t) => <div key={t.event} className="flex items-center gap-2.5 text-[13px]"><span className="text-[#730042]"><Icon name={t.icon} size={15} /></span><span className="flex-1 truncate text-[#2a1a16]">{t.label}</span><Pill>{fmt(t.count)}</Pill><span className="w-20 text-right text-xs font-semibold text-[#2a1a16]">{fmt(t.xp)} XP</span></div>)}{!data.topEvents.length && <p className="text-sm text-[#9c8880]">No activity yet.</p>}</div></Card>
        <Card className="p-4"><SectionTitle icon="layers" title="Level distribution" />
          <div className="h-48"><ResponsiveContainer><BarChart data={data.levels}><CartesianGrid strokeDasharray="3 3" stroke="#f0eae6" vertical={false} /><XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} width={30} /><Tooltip /><Bar dataKey="count" fill="#730042" radius={[4, 4, 0, 0]} name="People" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-4"><SectionTitle icon="users" title="Departments" sub="XP per person, last 30 days" />
          <div className="divide-y divide-[#f3efec]">{data.departments.length ? data.departments.map((d) => <div key={d.department} className="flex items-center gap-2 py-2 text-[13px]"><span className="flex-1 truncate text-[#2a1a16]">{d.department}</span><span className="text-[11px] text-[#9c8880]">{d.active}/{d.headcount} active</span><span className="w-14 text-right text-xs font-semibold text-[#730042]">{fmt(d.perHead)}</span></div>) : <p className="py-2 text-sm text-[#9c8880]">No data yet.</p>}</div></Card>
        <Card className="p-4"><SectionTitle icon="gift" title="Popular rewards and most-recognised people" />
          <div className="space-y-1.5">{data.topRewards.map((r) => <p key={r.name} className="flex justify-between text-[13px]"><span className="text-[#2a1a16]">{r.name}</span><b className="text-[#5b4b45]">{r.count}</b></p>)}{!data.topRewards.length && <p className="text-sm text-[#9c8880]">No redemptions yet.</p>}</div>
          <div className="mt-3 space-y-1.5 border-t border-[#f3efec] pt-3">{data.kudos.topReceivers.map((r) => <p key={r.key} className="flex justify-between text-[13px]"><span className="text-[#2a1a16]">{r.name}</span><b className="text-[#5b4b45]">{r.count}</b></p>)}</div></Card>
      </div>
    </div>
  );
}
