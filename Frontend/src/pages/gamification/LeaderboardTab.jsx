import { useState } from "react";
import { Card, Avatar, LevelChip, Skeleton, Empty, Pill, fmt } from "../../components/gamification/ui";
import { useGamLeaderboard, useGamSeasons } from "../../auth/server-state/gamification/gamification.hook";

const PERIODS = [["today", "Today"], ["week", "This week"], ["month", "This month"], ["season", "Season"], ["all", "All time"]];
const MEDAL = ["🥇", "🥈", "🥉"];

const Podium = ({ rows }) => {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  if (rows.length < 2) return null;
  const heights = { 1: "h-24", 0: "h-32", 2: "h-20" };
  return (
    <div className="mb-4 flex items-end justify-center gap-3 rounded-2xl bg-gradient-to-b from-pink-50 to-white p-4">
      {order.map((r) => {
        const idx = r.position - 1;
        return (
          <div key={r.personKey} className="flex w-24 flex-col items-center text-center sm:w-32">
            <span className="text-2xl">{MEDAL[idx]}</span>
            <Avatar name={r.name} photo={r.photo} frame={r.frame} size={idx === 0 ? 64 : 52} />
            <p className="mt-1 line-clamp-1 text-xs font-bold text-gray-800">{r.name}</p>
            <p className="text-[11px] font-semibold text-[#730042]">{fmt(r.xp)} XP</p>
            <div className={`mt-1 w-full rounded-t-xl bg-gradient-to-b from-[#cd166e] to-[#730042] ${heights[idx]}`} />
          </div>
        );
      })}
    </div>
  );
};

export default function LeaderboardTab({ me }) {
  const [period, setPeriod] = useState("week");
  const [scope, setScope] = useState("individual");
  const [dept, setDept] = useState("");
  const { data, isLoading, error } = useGamLeaderboard({ period, scope, department: dept === "mine" ? "mine" : undefined });
  const { data: seasons } = useGamSeasons();
  const done = (seasons?.seasons || []).filter((s) => s.status === "finalised" && s.winners?.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-gray-200">{PERIODS.map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${period === k ? "bg-[#730042] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{l}</button>)}</div>
        <div className="flex gap-1">
          <button onClick={() => setScope("individual")} className={`rounded-full px-3 py-1 text-xs font-semibold ${scope === "individual" ? "bg-pink-100 text-[#730042]" : "bg-gray-100 text-gray-600"}`}>👤 People</button>
          <button onClick={() => setScope("department")} className={`rounded-full px-3 py-1 text-xs font-semibold ${scope === "department" ? "bg-pink-100 text-[#730042]" : "bg-gray-100 text-gray-600"}`}>🏢 Departments</button>
          {scope === "individual" && me?.department && <button onClick={() => setDept(dept ? "" : "mine")} className={`rounded-full px-3 py-1 text-xs font-semibold ${dept ? "bg-pink-100 text-[#730042]" : "bg-gray-100 text-gray-600"}`}>My dept</button>}
        </div>
      </div>

      {isLoading ? <Skeleton className="h-72" /> : error ? <Empty icon="🔒" title={error.message} /> : scope === "department" ? (
        <Card className="divide-y">
          {data.rows.length === 0 ? <Empty title="No department activity yet" hint="Rankings use XP per head so small teams compete fairly." /> : data.rows.map((r) => (
            <div key={r.department} className="flex items-center gap-3 p-3">
              <span className="w-7 text-center text-lg font-extrabold text-gray-400">{MEDAL[r.position - 1] || r.position}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-gray-800">{r.department}</p><p className="text-[11px] text-gray-500">{r.active} active of {r.headcount} · {fmt(r.xp)} XP total</p></div>
              <div className="text-right"><p className="text-sm font-extrabold text-[#730042]">{fmt(r.perHead)}</p><p className="text-[10px] text-gray-400">XP / person</p></div>
            </div>
          ))}
        </Card>
      ) : (
        <>
          {data.me && (
            <Card className="flex items-center justify-between gap-3 border-[#cd166e]/40 bg-pink-50 p-3">
              <p className="text-sm font-bold text-[#730042]">You're #{data.me.position} of {data.me.of} · {fmt(data.me.xp)} XP</p>
              {data.me.gapToNext > 0 && <Pill>{fmt(data.me.gapToNext)} XP to overtake the next person</Pill>}
            </Card>
          )}
          {data.rows.length === 0 ? <Card><Empty icon="🏁" title="Nobody on the board yet" hint="Check in, finish quests or give kudos to get things started!" /></Card> : (
            <>
              <Podium rows={data.rows.slice(0, 3)} />
              <Card className="divide-y">
                {data.rows.map((r) => (
                  <div key={r.personKey} className={`flex items-center gap-3 p-3 ${data.me && r.position === data.me.position ? "bg-pink-50/60" : ""}`}>
                    <span className="w-7 text-center text-sm font-extrabold text-gray-400">{MEDAL[r.position - 1] || r.position}</span>
                    <Avatar name={r.name} photo={r.photo} frame={r.frame} size={38} />
                    <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate text-sm font-bold text-gray-800">{r.name}<LevelChip level={r.level} rank={r.rank} small /></p><p className="truncate text-[11px] text-gray-500">{r.title}{r.department ? ` · ${r.department}` : ""}</p></div>
                    <div className="text-right"><p className="text-sm font-extrabold text-[#730042]">{fmt(r.xp)}</p><p className="text-[10px] text-gray-400">XP</p></div>
                  </div>
                ))}
              </Card>
            </>
          )}
        </>
      )}

      {done.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-800">🏛️ Hall of fame</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {done.slice(0, 6).map((s) => (
              <Card key={s.id} className="p-3">
                <p className="text-sm font-bold text-gray-800">{s.theme} {s.name}</p>
                <div className="mt-2 space-y-1">{s.winners.slice(0, 3).map((w) => <p key={w.personKey} className="flex items-center justify-between text-xs"><span>{MEDAL[w.rank - 1]} {w.name}</span><span className="font-semibold text-[#730042]">{fmt(w.xp)} XP</span></p>)}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
