import { useState } from "react";
import { Card, Button, Pill, Avatar, LevelChip, XpBar, SectionTitle, Skeleton, Empty, Field, inputCls, Toggle, Icon, IconTile, Segmented, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamHistory, useUpdatePrefs, useGamTeam, useManualAward, useGamMeta } from "../../auth/server-state/gamification/gamification.hook";

function History() {
  const [kind, setKind] = useState("all"); const [page, setPage] = useState(1);
  const { data, isLoading } = useGamHistory({ kind, page });
  return (
    <Card className="p-4">
      <SectionTitle icon="file" title="Points history" right={<Segmented value={kind} onChange={(k) => { setKind(k); setPage(1); }} options={[["all", "All"], ["xp", "XP"], ["coins", "Points"]]} />} />
      {isLoading ? <Skeleton className="h-40" /> : !data?.items?.length ? <Empty icon="file" title="No activity yet" hint="Your points history will appear here." /> : (
        <>
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-[13px]">
            <thead><tr className="border-b border-[#ede5e0] text-[11px] uppercase tracking-wide text-[#9c8880]"><th className="py-2 font-medium">Activity</th><th className="py-2 font-medium">When</th><th className="py-2 text-right font-medium">XP</th><th className="py-2 text-right font-medium">Points</th></tr></thead>
            <tbody>{data.items.map((r) => (
              <tr key={r.id} className="border-b border-[#f3efec] last:border-0"><td className="py-2.5"><div className="flex items-center gap-2.5"><IconTile name={r.icon} size={28} /><div className="min-w-0"><p className="truncate font-medium text-[#2a1a16]">{r.label}</p>{r.reason && <p className="truncate text-[11px] text-[#9c8880]">{r.reason}</p>}</div></div></td><td className="py-2.5 text-[#7a6a64]">{timeAgo(r.at)}</td>
                <td className={`py-2.5 text-right font-medium ${r.xp < 0 ? "text-[#b42318]" : "text-[#2a1a16]"}`}>{r.xp ? `${r.xp > 0 ? "+" : ""}${fmt(r.xp)}` : "-"}</td><td className={`py-2.5 text-right font-medium ${r.coins < 0 ? "text-[#b42318]" : "text-[#2a1a16]"}`}>{r.coins ? `${r.coins > 0 ? "+" : ""}${fmt(r.coins)}` : "-"}</td></tr>))}</tbody>
          </table></div>
          {data.pages > 1 && <div className="mt-3 flex items-center justify-center gap-3"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="text-xs text-[#7a6a64]">Page {page} of {data.pages}</span><Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button></div>}
        </>
      )}
    </Card>
  );
}

function HowItWorks() {
  const { data } = useGamMeta();
  if (!data) return null;
  return (
    <Card className="p-4">
      <SectionTitle icon="bulb" title="How points work" sub="XP builds your level and ranking. Reward points can be redeemed in Rewards." />
      <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-[13px]">
        <thead><tr className="border-b border-[#ede5e0] text-[11px] uppercase tracking-wide text-[#9c8880]"><th className="py-2 font-medium">Activity</th><th className="py-2 text-right font-medium">XP</th><th className="py-2 text-right font-medium">Points</th><th className="py-2 text-right font-medium">Limit</th></tr></thead>
        <tbody>{data.events.map((e) => (
          <tr key={e.key} className="border-b border-[#f3efec] last:border-0"><td className="py-2"><div className="flex items-center gap-2.5"><span className="text-[#730042]"><Icon name={e.icon} size={15} /></span><span className="text-[#2a1a16]">{e.label}</span></div></td><td className="py-2 text-right font-medium text-[#2a1a16]">+{e.xp}</td><td className="py-2 text-right text-[#5b4b45]">{e.coins ? `+${e.coins}` : "-"}</td><td className="py-2 text-right text-xs text-[#9c8880]">{e.once ? "Once" : e.dailyCap ? `${e.dailyCap} / day` : "-"}</td></tr>))}</tbody>
      </table></div>
    </Card>
  );
}

function TeamAward() {
  const { data } = useGamTeam(true); const award = useManualAward();
  const [key, setKey] = useState(""); const [xp, setXp] = useState(50); const [coins, setCoins] = useState(10); const [reason, setReason] = useState("");
  return (
    <Card className="p-4">
      <SectionTitle icon="award" title="Recognise your team" sub="Award bonus XP and reward points to people who report to you. A monthly budget applies." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Team member"><select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}><option value="">Select a team member</option>{data?.members?.map((m) => <option key={m.personKey} value={m.personKey}>{m.name} (Level {m.level})</option>)}</select></Field>
        <Field label="Reason (visible to them)"><input className={inputCls} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Handled the client escalation exceptionally well" /></Field>
        <Field label={`XP: ${xp}`}><input type="range" min={0} max={300} step={10} value={xp} onChange={(e) => setXp(+e.target.value)} className="w-full accent-[#730042]" /></Field>
        <Field label={`Reward points: ${coins}`}><input type="range" min={0} max={100} step={5} value={coins} onChange={(e) => setCoins(+e.target.value)} className="w-full accent-[#730042]" /></Field>
      </div>
      <Button className="mt-3" disabled={!key || reason.trim().length < 5 || (!xp && !coins)} loading={award.isPending} onClick={() => award.mutate({ targetKey: key, xp, coins, reason }, { onSuccess: () => setReason("") })}>Send award</Button>
      {data?.members?.length > 0 && (
        <div className="mt-4 divide-y divide-[#f3efec] rounded-lg border border-[#ede5e0]">{data.members.map((m) => (
          <div key={m.personKey} className="flex items-center gap-3 px-3 py-2.5"><Avatar name={m.name} photo={m.photo} size={30} /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-[#2a1a16]">{m.name}</p><p className="truncate text-[11px] text-[#9c8880]">{m.designation}</p></div><Pill>Level {m.level}</Pill><span className="w-20 text-right text-xs font-semibold text-[#2a1a16]">{fmt(m.xp)} XP</span></div>))}</div>
      )}
    </Card>
  );
}

export default function MyActivityTab({ me, role }) {
  const save = useUpdatePrefs();
  const isManager = ["manager", "senior_manager", "official", "admin", "senior_admin", "superadmin", "super_admin"].includes(role);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4"><Avatar name={me.name} photo={me.photo} size={56} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-[#2a1a16]">{me.name}</h2><LevelChip level={me.level.level} rank={me.rank.key} /></div><p className="text-xs text-[#7a6a64]">{me.designation ? `${me.designation} - ` : ""}{me.title} - {me.rank.label} tier</p><div className="mt-2.5 max-w-md"><XpBar level={me.level} /></div></div></div>
      </Card>
      <Card className="divide-y divide-[#f3efec]">
        <div className="flex items-center justify-between gap-4 p-4"><div><p className="text-[13px] font-medium text-[#2a1a16]">Show me on leaderboards</p><p className="text-xs text-[#7a6a64]">Colleagues can see your rank, level and achievements.</p></div><Toggle label="Show me on leaderboards" checked={me.showOnLeaderboard} onChange={(v) => save.mutate({ showOnLeaderboard: v })} /></div>
        <div className="flex items-center justify-between gap-4 p-4"><div><p className="text-[13px] font-medium text-[#2a1a16]">Opt out of the programme</p><p className="text-xs text-[#7a6a64]">Stops new points and hides you everywhere. Your history is kept.</p></div><Toggle label="Opt out of the programme" checked={me.optedOut} onChange={(v) => save.mutate({ optedOut: v })} /></div>
      </Card>
      {isManager && <TeamAward />}
      <History />
      <HowItWorks />
    </div>
  );
}
