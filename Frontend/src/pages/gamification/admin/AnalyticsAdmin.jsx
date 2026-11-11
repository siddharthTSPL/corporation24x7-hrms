import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Card, Stat, SectionTitle, Skeleton, Pill, Button, fmt } from "../../../components/gamification/ui";
import { useAdminAnalytics } from "../../../auth/server-state/gamification/gamification.hook";
import { exportLeaderboardUrl } from "../../../auth/api/gamification/gamification.api";

export default function AnalyticsAdmin() {
  const { data, isLoading, error } = useAdminAnalytics();
  if (isLoading) return <div className="grid gap-3 sm:grid-cols-4"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>;
  if (error) return <Card className="p-6 text-sm text-red-600">{error.message}</Card>;
  const p = data.participation; const e = data.economy;
  const short = (d) => d.slice(5);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="👥" label="Active this week" value={`${p.active7} / ${p.headcount}`} sub={`${p.rate}% engagement`} />
        <Stat icon="😴" label="Dormant (14d+)" value={p.dormant} sub={`${p.optedOut} opted out`} color="#d97706" />
        <Stat icon="🏅" label="Badges earned" value={fmt(data.badgesEarned)} color="#7c3aed" />
        <Stat icon="👏" label="Kudos (30 days)" value={fmt(data.kudos.last30d)} color="#db2777" />
        <Stat icon="🪙" label="Coins in circulation" value={fmt(e.circulating)} sub={`${fmt(e.issued)} issued · ${fmt(e.spent)} spent`} color="#d97706" />
        <Stat icon="🛍️" label="Redemptions (30d)" value={e.redeemed30d} sub={`${fmt(e.coinsSpent30d)} coins`} color="#059669" />
        <Stat icon="⏳" label="Pending approvals" value={e.pendingRedemptions} color={e.pendingRedemptions ? "#dc2626" : "#64748b"} />
        <Stat icon="✨" label="Total XP earned" value={fmt(e.totalXp)} />
      </div>
      <Card className="p-4">
        <SectionTitle icon="📈" title="XP earned per day (30 days)" right={<a href={exportLeaderboardUrl("month")} className="text-xs font-semibold text-[#730042] hover:underline">⬇ Export month CSV</a>} />
        <div className="h-56"><ResponsiveContainer><AreaChart data={data.daily.map((d) => ({ ...d, date: short(d.date) }))}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cd166e" stopOpacity={0.5} /><stop offset="95%" stopColor="#cd166e" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Area dataKey="xp" stroke="#730042" fill="url(#g)" name="XP" /></AreaChart></ResponsiveContainer></div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><SectionTitle icon="🎯" title="What drives engagement (30d)" />
          <div className="space-y-1.5">{data.topEvents.map((t) => <div key={t.event} className="flex items-center gap-2 text-sm"><span>{t.icon}</span><span className="flex-1 truncate text-gray-700">{t.label}</span><Pill>{fmt(t.count)}×</Pill><span className="w-20 text-right text-xs font-bold text-[#730042]">{fmt(t.xp)} XP</span></div>)}</div></Card>
        <Card className="p-4"><SectionTitle icon="📊" title="Levels distribution" />
          <div className="h-48"><ResponsiveContainer><BarChart data={data.levels}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#cd166e" radius={[6, 6, 0, 0]} name="People" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-4"><SectionTitle icon="🏢" title="Departments — XP per person (30d)" />
          <div className="space-y-1.5">{data.departments.length ? data.departments.map((d) => <div key={d.department} className="flex items-center gap-2 text-sm"><span className="flex-1 truncate text-gray-700">{d.department}</span><span className="text-[11px] text-gray-400">{d.active}/{d.headcount} active</span><span className="w-16 text-right text-xs font-bold text-[#730042]">{fmt(d.perHead)}</span></div>) : <p className="text-sm text-gray-400">No data yet.</p>}</div></Card>
        <Card className="p-4"><SectionTitle icon="🛒" title="Popular rewards & top kudos receivers" />
          <div className="space-y-1">{data.topRewards.map((r) => <p key={r.name} className="flex justify-between text-sm"><span>{r.name}</span><b>{r.count}×</b></p>)}{!data.topRewards.length && <p className="text-sm text-gray-400">No redemptions yet.</p>}</div>
          <div className="mt-3 space-y-1 border-t pt-2">{data.kudos.topReceivers.map((r) => <p key={r.key} className="flex justify-between text-sm"><span>🌟 {r.name}</span><b>{r.count}</b></p>)}</div></Card>
      </div>
    </div>
  );
}
