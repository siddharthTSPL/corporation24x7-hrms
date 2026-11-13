import { useState } from "react";
import { Card, Button, ProgressBar, Pill, Modal, Avatar, Skeleton, Empty, IconTile, timeLeft, formatDate, fmt } from "../../components/gamification/ui";
import { useGamChallenges, useJoinChallenge, useClaimChallenge, useGamChallengeBoard } from "../../auth/server-state/gamification/gamification.hook";

const PHASE = { live: ["success", "Live"], upcoming: ["info", "Upcoming"], ended: ["neutral", "Ended"] };

function BoardModal({ c, onClose }) {
  const { data, isLoading } = useGamChallengeBoard(c?.id, !!c);
  return (
    <Modal open={!!c} onClose={onClose} title={c?.title || ""}>
      {isLoading ? <Skeleton className="h-40" /> : !data?.rows?.length ? <Empty icon="trophy" title="No progress yet" hint="Be the first on the board." /> : (
        <div className="divide-y divide-[#f3efec]">{data.rows.map((r) => (
          <div key={r.personKey || r.name} className="flex items-center gap-3 py-2.5">
            <span className="w-6 text-center text-xs font-semibold text-[#7a6a64]">{r.position}</span>
            {r.personKey && <Avatar name={r.name} photo={r.photo} size={28} />}
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#2a1a16]">{r.name}{r.department ? <span className="ml-1.5 text-xs font-normal text-[#9c8880]">{r.department}</span> : null}</span>
            <span className="text-[13px] font-semibold text-[#730042]">{fmt(r.value)}</span>
          </div>))}</div>
      )}
    </Modal>
  );
}

export function ChallengeCard({ c, onBoard }) {
  const join = useJoinChallenge(); const claim = useClaimChallenge();
  const [tone, label] = PHASE[c.phase] || PHASE.ended;
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <IconTile name={c.icon} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5"><p className="text-[13px] font-semibold text-[#2a1a16]">{c.title}</p><Pill tone={tone}>{label}</Pill>{c.scope === "department" && <Pill tone="violet">Team</Pill>}</div>
          {c.description && <p className="mt-0.5 text-xs text-[#7a6a64]">{c.description}</p>}
          <p className="mt-1 text-[11px] text-[#9c8880]">{c.phase === "upcoming" ? `Starts ${formatDate(c.startsAt)}` : timeLeft(c.endsAt)} - Goal: {fmt(c.target)} {c.metric === "xp" ? "XP" : "completions"}</p>
        </div>
        <div className="text-right text-[11px] text-[#7a6a64]"><p className="font-semibold text-[#2a1a16]">+{fmt(c.rewardXp)} XP</p><p>+{fmt(c.rewardCoins)} pts</p></div>
      </div>
      {c.joined && c.inScope && (
        <div className="mt-3"><ProgressBar value={c.progress} max={c.target} color={c.complete ? "#12794a" : "#730042"} height={7} /><div className="mt-1 flex justify-between text-[11px] text-[#7a6a64]"><span>{fmt(c.progress)} / {fmt(c.target)}</span><span>{Math.min(100, Math.round((c.progress / c.target) * 100))}%</span></div></div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {c.optIn && !c.joined && c.phase !== "ended" && <Button size="sm" loading={join.isPending} onClick={() => join.mutate(c.id)}>Join challenge</Button>}
        {c.canClaim && <Button size="sm" loading={claim.isPending} onClick={() => claim.mutate(c.id)}>Claim reward</Button>}
        {c.claimed && <Pill tone="success">Reward claimed</Pill>}
        {!c.inScope && <Pill>Not open to your department</Pill>}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onBoard(c)}>Standings</Button>
      </div>
      {c.winners?.length > 0 && <p className="mt-2 border-t border-[#f3efec] pt-2 text-[11px] text-[#7a6a64]">Winners: {c.winners.map((w, i) => `${i + 1}. ${w.name}`).join("   ")}</p>}
    </Card>
  );
}

export default function ChallengesTab() {
  const { data, isLoading } = useGamChallenges();
  const [board, setBoard] = useState(null);
  if (isLoading) return <Skeleton className="h-48" />;
  const list = data?.challenges || [];
  if (!list.length) return <Card><Empty icon="trophy" title="No challenges right now" hint="Time-boxed challenges - individual or department versus department - appear here when your administrator launches one." /></Card>;
  const groups = [["live", "Live now"], ["upcoming", "Upcoming"], ["ended", "Recently ended"]];
  return (
    <div className="space-y-6">
      {groups.map(([k, title]) => { const g = list.filter((c) => c.phase === k); return g.length ? (
        <section key={k}><h3 className="mb-2.5 text-sm font-semibold text-[#2a1a16]">{title}</h3><div className="grid gap-3 lg:grid-cols-2">{g.map((c) => <ChallengeCard key={c.id} c={c} onBoard={setBoard} />)}</div></section>) : null; })}
      <BoardModal c={board} onClose={() => setBoard(null)} />
    </div>
  );
}
