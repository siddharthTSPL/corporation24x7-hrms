import { useState } from "react";
import { Card, Avatar, LevelChip, Skeleton, Empty, Pill, Segmented, SectionTitle, Icon, formatDate, fmt } from "../../components/gamification/ui";
import { useGamLeaderboard, useGamSeasons } from "../../auth/server-state/gamification/gamification.hook";

const PERIODS = [["today", "Today"], ["week", "This week"], ["month", "This month"], ["season", "Season"], ["all", "All time"]];
const rankCls = (p) => (p === 1 ? "bg-[#c99700] text-white" : p === 2 ? "bg-[#8793a1] text-white" : p === 3 ? "bg-[#b4763c] text-white" : "text-[#7a6a64]");
const Rank = ({ p }) => <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${rankCls(p)}`}>{p}</span>;

export default function LeaderboardTab({ me }) {
  const [period, setPeriod] = useState("week");
  const [scope, setScope] = useState("individual");
  const [mine, setMine] = useState(false);
  const { data, isLoading, error } = useGamLeaderboard({ period, scope, department: mine ? "mine" : undefined });
  const { data: seasons } = useGamSeasons();
  const past = (seasons?.seasons || []).filter((s) => s.status === "finalised" && s.winners?.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
        <div className="flex items-center gap-3">
          {scope === "individual" && me?.department && <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#5b4b45]"><input type="checkbox" className="accent-[#730042]" checked={mine} onChange={(e) => setMine(e.target.checked)} /> My department only</label>}
          <Segmented value={scope} onChange={setScope} options={[["individual", "People"], ["department", "Departments"]]} />
        </div>
      </div>

      {isLoading ? <Skeleton className="h-72" /> : error ? <Card><Empty icon="shield" title={error.message} /></Card> : scope === "department" ? (
        <Card className="overflow-x-auto">
          {data.rows.length === 0 ? <Empty icon="users" title="No department activity yet" hint="Departments are ranked by XP per person, so smaller teams compete fairly." /> : (
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead><tr className="border-b border-[#ede5e0] text-[11px] uppercase tracking-wide text-[#9c8880]"><th className="w-14 px-4 py-2.5 font-medium">Rank</th><th className="px-2 py-2.5 font-medium">Department</th><th className="px-2 py-2.5 font-medium">Active / headcount</th><th className="px-2 py-2.5 text-right font-medium">Total XP</th><th className="px-4 py-2.5 text-right font-medium">XP per person</th></tr></thead>
              <tbody>{data.rows.map((r) => (
                <tr key={r.department} className="border-b border-[#f3efec] last:border-0"><td className="px-4 py-3"><Rank p={r.position} /></td><td className="px-2 py-3 font-medium text-[#2a1a16]">{r.department}</td><td className="px-2 py-3 text-[#7a6a64]">{r.active} / {r.headcount}</td><td className="px-2 py-3 text-right text-[#5b4b45]">{fmt(r.xp)}</td><td className="px-4 py-3 text-right font-semibold text-[#730042]">{fmt(r.perHead)}</td></tr>))}</tbody>
            </table>
          )}
        </Card>
      ) : (
        <>
          {data.me && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-[#730042]/25 bg-[#730042]/[0.04] px-4 py-3">
              <p className="text-[13px] text-[#2a1a16]">You are ranked <b>#{data.me.position}</b> of {data.me.of} with <b>{fmt(data.me.xp)} XP</b></p>
              {data.me.gapToNext > 0 && <Pill tone="brand">{fmt(data.me.gapToNext)} XP behind the next position</Pill>}
            </Card>
          )}
          <Card className="overflow-x-auto">
            {data.rows.length === 0 ? <Empty icon="trophy" title="No rankings yet" hint="Rankings appear as soon as people start earning XP in this period." /> : (
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead><tr className="border-b border-[#ede5e0] text-[11px] uppercase tracking-wide text-[#9c8880]"><th className="w-14 px-4 py-2.5 font-medium">Rank</th><th className="px-2 py-2.5 font-medium">Employee</th><th className="px-2 py-2.5 font-medium">Department</th><th className="px-2 py-2.5 font-medium">Level</th><th className="px-4 py-2.5 text-right font-medium">XP</th></tr></thead>
                <tbody>{data.rows.map((r) => {
                  const you = data.me && r.position === data.me.position;
                  return (
                    <tr key={r.personKey} className={`border-b border-[#f3efec] last:border-0 ${you ? "bg-[#730042]/[0.04]" : ""}`}>
                      <td className="px-4 py-2.5"><Rank p={r.position} /></td>
                      <td className="px-2 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={r.name} photo={r.photo} size={30} /><div className="min-w-0"><p className="truncate font-medium text-[#2a1a16]">{r.name}{you && <span className="ml-1.5 text-[11px] font-normal text-[#730042]">(You)</span>}</p><p className="truncate text-[11px] text-[#9c8880]">{r.title}</p></div></div></td>
                      <td className="px-2 py-2.5 text-[#7a6a64]">{r.department || "-"}</td>
                      <td className="px-2 py-2.5"><LevelChip level={r.level} rank={r.rank} small /></td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[#2a1a16]">{fmt(r.xp)}</td>
                    </tr>);
                })}</tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {past.length > 0 && (
        <div>
          <SectionTitle icon="trophy" title="Past seasons" sub="Season winners" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{past.slice(0, 6).map((s) => (
            <Card key={s.id} className="p-4">
              <p className="text-[13px] font-semibold text-[#2a1a16]">{s.name}</p><p className="text-[11px] text-[#9c8880]">{formatDate(s.startsAt)} - {formatDate(s.endsAt)}</p>
              <div className="mt-3 space-y-1.5">{s.winners.slice(0, 3).map((w) => <div key={w.personKey} className="flex items-center gap-2 text-xs"><Rank p={w.rank} /><span className="min-w-0 flex-1 truncate text-[#2a1a16]">{w.name}</span><span className="font-medium text-[#5b4b45]">{fmt(w.xp)} XP</span></div>)}</div>
            </Card>))}</div>
        </div>
      )}
    </div>
  );
}
