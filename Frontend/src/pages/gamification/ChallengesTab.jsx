import { useState } from "react";
import { Card, Button, ProgressBar, Pill, Modal, Avatar, Skeleton, Empty, timeLeft, fmt } from "../../components/gamification/ui";
import { useGamChallenges, useJoinChallenge, useClaimChallenge, useGamChallengeBoard } from "../../auth/server-state/gamification/gamification.hook";

const PHASE = { live: ["#059669", "Live"], upcoming: ["#2563eb", "Starts soon"], ended: ["#6b7280", "Ended"] };

function BoardModal({ c, onClose }) {
  const { data, isLoading } = useGamChallengeBoard(c?.id, !!c);
  return (
    <Modal open={!!c} onClose={onClose} title={`${c?.icon || ""} ${c?.title || ""}`}>
      {isLoading ? <Skeleton className="h-40" /> : !data?.rows?.length ? <Empty title="No progress yet" hint="Be the first on the board!" /> : (
        <div className="divide-y">{data.rows.map((r) => (
          <div key={r.personKey || r.name} className="flex items-center gap-3 py-2">
            <span className="w-6 text-center text-sm font-extrabold text-gray-400">{["🥇", "🥈", "🥉"][r.position - 1] || r.position}</span>
            {r.personKey && <Avatar name={r.name} photo={r.photo} size={30} ring={false} />}
            <span className="flex-1 truncate text-sm font-semibold">{r.name}{r.department ? <span className="ml-1 text-xs font-normal text-gray-400">{r.department}</span> : null}</span>
            <span className="text-sm font-bold text-[#730042]">{fmt(r.value)}</span>
          </div>))}</div>
      )}
    </Modal>
  );
}

export function ChallengeCard({ c, onBoard }) {
  const join = useJoinChallenge(); const claim = useClaimChallenge();
  const [col, label] = PHASE[c.phase] || PHASE.ended;
  const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-2xl">{c.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-bold text-gray-800">{c.title}</p><Pill color={col}>{label}</Pill>{c.scope === "department" && <Pill color="#7c3aed">🏢 team</Pill>}</div>
          {c.description && <p className="mt-0.5 text-xs text-gray-500">{c.description}</p>}
          <p className="mt-1 text-[11px] text-gray-400">{c.phase === "upcoming" ? `Starts ${new Date(c.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : timeLeft(c.endsAt)} · Goal: {fmt(c.target)} {c.metric === "xp" ? "XP" : "times"}</p>
        </div>
        <div className="text-right text-xs"><p className="font-bold text-[#730042]">+{fmt(c.rewardXp)} XP</p><p className="text-gray-500">+{fmt(c.rewardCoins)} 🪙</p></div>
      </div>
      {(c.joined && c.inScope) && (
        <div className="mt-3"><ProgressBar value={c.progress} max={c.target} color={c.complete ? "#10b981" : "#cd166e"} height={10} /><div className="mt-1 flex justify-between text-[11px] text-gray-500"><span>{fmt(c.progress)} / {fmt(c.target)}</span><span>{pct}%</span></div></div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {c.optIn && !c.joined && c.phase !== "ended" && <Button variant="pink" loading={join.isPending} onClick={() => join.mutate(c.id)}>Join challenge</Button>}
        {c.canClaim && <Button variant="pink" loading={claim.isPending} onClick={() => claim.mutate(c.id)}>🎁 Claim reward</Button>}
        {c.claimed && <Pill color="#059669">✓ Reward claimed</Pill>}
        {!c.inScope && <Pill color="#6b7280">Not open to your department</Pill>}
        <button onClick={() => onBoard(c)} className="ml-auto text-xs font-semibold text-gray-500 hover:text-[#730042]">🏅 Leaderboard</button>
      </div>
      {c.winners?.length > 0 && <p className="mt-2 text-[11px] text-gray-500">Winners: {c.winners.map((w, i) => `${["🥇", "🥈", "🥉"][i]} ${w.name}`).join("  ")}</p>}
    </Card>
  );
}

export default function ChallengesTab() {
  const { data, isLoading } = useGamChallenges();
  const [board, setBoard] = useState(null);
  if (isLoading) return <Skeleton className="h-48" />;
  const list = data?.challenges || [];
  const groups = [["live", "🔥 Live now"], ["upcoming", "⏳ Coming up"], ["ended", "🏁 Recently ended"]];
  if (!list.length) return <Card><Empty icon="🏆" title="No challenges right now" hint="Admins can launch time-boxed challenges — individual or department vs department." /></Card>;
  return (
    <div className="space-y-5">
      {groups.map(([k, title]) => { const g = list.filter((c) => c.phase === k); return g.length ? (
        <section key={k}><h3 className="mb-2 text-base font-bold text-gray-800">{title}</h3><div className="grid gap-3 lg:grid-cols-2">{g.map((c) => <ChallengeCard key={c.id} c={c} onBoard={setBoard} />)}</div></section>) : null; })}
      <BoardModal c={board} onClose={() => setBoard(null)} />
    </div>
  );
}
