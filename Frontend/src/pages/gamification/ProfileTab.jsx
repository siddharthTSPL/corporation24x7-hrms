import { useState } from "react";
import { Card, Button, Pill, Avatar, LevelChip, XpBar, SectionTitle, Skeleton, Empty, Field, inputCls, timeAgo, fmt } from "../../components/gamification/ui";
import { useGamHistory, useGamCosmetics, useUpdatePrefs, useGamTeam, useManualAward, useGamMeta } from "../../auth/server-state/gamification/gamification.hook";

const unlockText = (u) => (u.type === "level" ? `Reach level ${u.value}` : u.type === "badge" ? "Earn a badge" : u.type === "store" ? "Buy in the store" : "");

function Cosmetics({ me }) {
  const { data } = useGamCosmetics(); const save = useUpdatePrefs();
  if (!data) return <Skeleton className="h-40" />;
  const eq = data.equipped;
  const Group = ({ title, items, type, equippedId, render }) => (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((c) => { const on = equippedId === c.id; return (
          <button key={c.id} disabled={!c.unlocked || save.isPending} onClick={() => save.mutate({ [type]: c.id })} className={`rounded-xl border p-2 text-center transition ${on ? "border-[#730042] bg-pink-50 ring-2 ring-[#730042]/30" : "border-gray-200 bg-white"} ${c.unlocked ? "hover:shadow" : "opacity-50"}`}>
            {render(c)}<p className="mt-1 line-clamp-1 text-[11px] font-semibold text-gray-700">{c.name}</p>
            <p className="text-[9px] text-gray-400">{c.unlocked ? (on ? "Equipped" : "Tap to equip") : `🔒 ${unlockText(c.unlock)}`}</p>
          </button>); })}
      </div>
    </div>
  );
  return (
    <Card className="space-y-4 p-4">
      <SectionTitle icon="🎨" title="Style your profile" sub="Unlock frames, titles and themes by levelling up, earning badges or shopping." />
      <Group title="Avatar frames" type="frame" items={data.frames} equippedId={eq.frame.id} render={(c) => <div className="flex justify-center"><Avatar name={me.name} photo={me.photo} frame={{ css: c.css, animated: c.animated }} size={46} /></div>} />
      <Group title="Titles" type="title" items={data.titles} equippedId={eq.titleId} render={(c) => <div className="flex h-[46px] items-center justify-center text-xl">🏷️</div>} />
      <Group title="Profile card themes" type="theme" items={data.themes} equippedId={eq.theme.id} render={(c) => <div className="h-[46px] rounded-lg" style={{ background: c.css }} />} />
    </Card>
  );
}

function History() {
  const [kind, setKind] = useState("all"); const [page, setPage] = useState(1);
  const { data, isLoading } = useGamHistory({ kind, page });
  return (
    <Card className="p-4">
      <SectionTitle icon="📜" title="Points history" right={<div className="flex gap-1">{["all", "xp", "coins"].map((k) => <button key={k} onClick={() => { setKind(k); setPage(1); }} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${kind === k ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-600"}`}>{k}</button>)}</div>} />
      {isLoading ? <Skeleton className="h-40" /> : !data?.items?.length ? <Empty title="Nothing here yet" /> : (
        <>
          <div className="divide-y">{data.items.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2"><span className="text-xl">{r.icon}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-800">{r.label}</p><p className="truncate text-[11px] text-gray-400">{r.reason ? `${r.reason} · ` : ""}{timeAgo(r.at)}</p></div>
              <div className="text-right text-xs font-bold">{r.xp !== 0 && <p className={r.xp > 0 ? "text-[#730042]" : "text-red-500"}>{r.xp > 0 ? "+" : ""}{fmt(r.xp)} XP</p>}{r.coins !== 0 && <p className={r.coins > 0 ? "text-amber-600" : "text-red-500"}>{r.coins > 0 ? "+" : ""}{fmt(r.coins)} 🪙</p>}</div>
            </div>))}</div>
          {data.pages > 1 && <div className="mt-2 flex justify-center gap-2"><Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</Button><span className="self-center text-xs text-gray-500">{page}/{data.pages}</span><Button variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>→</Button></div>}
        </>
      )}
    </Card>
  );
}

function HowToEarn() {
  const { data } = useGamMeta();
  if (!data) return null;
  return (
    <Card className="p-4">
      <SectionTitle icon="💡" title="How to earn" sub="XP raises your level and rank. Coins are spent in the Rewards Store." />
      <div className="grid gap-1.5 sm:grid-cols-2">{data.events.map((e) => (
        <div key={e.key} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs"><span className="text-base">{e.icon}</span><span className="flex-1 font-semibold text-gray-700">{e.label}{e.once ? " (once)" : e.dailyCap ? ` (max ${e.dailyCap}/day)` : ""}</span><span className="font-bold text-[#730042]">+{e.xp} XP</span>{e.coins > 0 && <span className="font-bold text-amber-600">+{e.coins}🪙</span>}</div>))}</div>
    </Card>
  );
}

function TeamAward({ role }) {
  const { data } = useGamTeam(true); const award = useManualAward();
  const [key, setKey] = useState(""); const [xp, setXp] = useState(50); const [coins, setCoins] = useState(10); const [reason, setReason] = useState("");
  return (
    <Card className="p-4">
      <SectionTitle icon="🎖️" title="Recognise your team" sub="Award bonus XP & coins to people who report to you (monthly budget applies)." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Team member"><select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}><option value="">Select…</option>{data?.members?.map((m) => <option key={m.personKey} value={m.personKey}>{m.name} · Lv {m.level}</option>)}</select></Field>
        <Field label="Reason (shown to them)"><input className={inputCls} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Handled the client escalation brilliantly" /></Field>
        <Field label={`XP: ${xp}`}><input type="range" min={0} max={300} step={10} value={xp} onChange={(e) => setXp(+e.target.value)} className="w-full accent-[#730042]" /></Field>
        <Field label={`Coins: ${coins}`}><input type="range" min={0} max={100} step={5} value={coins} onChange={(e) => setCoins(+e.target.value)} className="w-full accent-[#730042]" /></Field>
      </div>
      <Button variant="pink" className="mt-3" disabled={!key || reason.trim().length < 5 || (!xp && !coins)} loading={award.isPending} onClick={() => award.mutate({ targetKey: key, xp, coins, reason }, { onSuccess: () => { setReason(""); } })}>Send award</Button>
      {data?.members?.length > 0 && (
        <div className="mt-4 divide-y rounded-xl border">{data.members.map((m) => (
          <div key={m.personKey} className="flex items-center gap-3 p-2.5"><Avatar name={m.name} photo={m.photo} size={32} ring={false} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.name}</p><p className="text-[11px] text-gray-400">{m.designation}</p></div>
            <Pill>Lv {m.level}</Pill><Pill color="#f97316">🔥 {m.streak}</Pill><span className="text-xs font-bold text-[#730042]">{fmt(m.xp)} XP</span></div>))}</div>
      )}
    </Card>
  );
}

export default function ProfileTab({ me, role }) {
  const save = useUpdatePrefs();
  const isManager = ["manager", "senior_manager", "official", "admin", "senior_admin", "superadmin", "super_admin"].includes(role);
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="h-20" style={{ background: me.equipped.theme.css }} />
        <div className="-mt-10 flex flex-wrap items-end gap-4 p-4 pt-0">
          <Avatar name={me.name} photo={me.photo} frame={me.equipped.frame} size={84} />
          <div className="min-w-0 flex-1 pt-10"><p className="flex items-center gap-2 text-lg font-extrabold text-gray-800">{me.name}<LevelChip level={me.level.level} rank={me.rank.key} /></p><p className="text-sm text-gray-500">{me.equipped.title} · {me.rank.label} rank{me.department ? ` · ${me.department}` : ""}</p></div>
        </div>
        <div className="px-4 pb-4"><XpBar level={me.level} /></div>
      </Card>
      <Card className="p-4">
        <SectionTitle icon="🔒" title="Privacy" />
        <label className="flex cursor-pointer items-center justify-between gap-3 py-1"><span><span className="block text-sm font-semibold text-gray-800">Show me on leaderboards</span><span className="text-xs text-gray-500">Others can see your rank, level and badges.</span></span><input type="checkbox" className="h-5 w-5 accent-[#730042]" checked={me.showOnLeaderboard} onChange={(e) => save.mutate({ showOnLeaderboard: e.target.checked })} /></label>
        <label className="flex cursor-pointer items-center justify-between gap-3 border-t py-2"><span><span className="block text-sm font-semibold text-gray-800">Opt out of the rewards programme</span><span className="text-xs text-gray-500">Stops new points & hides you everywhere. Your history is kept.</span></span><input type="checkbox" className="h-5 w-5 accent-[#730042]" checked={me.optedOut} onChange={(e) => save.mutate({ optedOut: e.target.checked })} /></label>
      </Card>
      <Cosmetics me={me} />
      {isManager && <TeamAward role={role} />}
      <HowToEarn />
      <History />
    </div>
  );
}
