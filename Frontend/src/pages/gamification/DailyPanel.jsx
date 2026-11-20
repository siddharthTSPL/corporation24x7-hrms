import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Card, Button, SectionTitle, fmt } from "../../components/gamification/ui";
import { useClaimDaily, useSpin, useAnswerQuiz, useBuyFreeze } from "../../auth/server-state/gamification/gamification.hook";

// ── 7-day daily reward calendar ──
export function DailyReward({ daily }) {
  const claim = useClaimDaily();
  if (!daily) return null;
  const done = daily.claimedToday;
  const currentDay = done ? daily.todayDay : daily.nextDay;
  return (
    <Card className="p-4">
      <SectionTitle icon="🎁" title="Daily reward" sub={daily.streak > 0 ? `${daily.streak}-day streak${daily.atRisk ? " — claim today to keep it!" : ""}` : "Claim every day to build a streak"} />
      <div className="grid grid-cols-7 gap-1.5">
        {daily.cycle.map((c) => {
          const past = done ? c.day <= currentDay : c.day < currentDay;
          const isToday = c.day === currentDay;
          return (
            <div key={c.day} className={`relative flex flex-col items-center rounded-xl border px-1 py-2 text-center ${isToday && !done ? "border-[#cd166e] bg-pink-50 shadow-md" : past ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
              <span className="text-[10px] font-semibold text-gray-500">Day {c.day}</span>
              <span className="text-lg">{c.day === 7 ? "🎉" : past ? "✅" : "🪙"}</span>
              <span className="text-[11px] font-bold text-gray-700">{c.coins}</span>
              <span className="text-[9px] text-gray-400">+{c.xp} XP</span>
            </div>
          );
        })}
      </div>
      <Button variant="pink" className="mt-3 w-full" disabled={done} loading={claim.isPending}
        onClick={() => claim.mutate(undefined, { onSuccess: (d) => toast.success(`Day ${d.day}: +${d.reward.coins} 🪙  +${d.reward.xp} XP`) })}>
        {done ? "Come back tomorrow ✨" : `Claim day ${currentDay} reward`}
      </Button>
    </Card>
  );
}

// ── Lucky spin wheel ──
export function SpinWheel({ spin }) {
  const doSpin = useSpin();
  const buyFreeze = useBuyFreeze();
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  if (!spin) return null;
  const prizes = spin.prizes;
  const n = prizes.length;
  const slice = 360 / n;
  const canSpin = spin.freeLeft > 0 || spin.extraLeft > 0;
  const paidSpin = spin.freeLeft === 0;

  const go = () => {
    if (busy || !canSpin) return;
    setBusy(true); setResult(null);
    doSpin.mutate(paidSpin, {
      onSuccess: (d) => {
        const idx = Math.max(0, prizes.findIndex((p) => p.id === d.prize.id));
        const target = 360 * 6 + (360 - (idx * slice + slice / 2));
        setAngle((a) => a - (a % 360) + target);
        setTimeout(() => { setResult(d.prize); setBusy(false); }, 4200);
      },
      onError: () => setBusy(false),
    });
  };

  const arc = (i) => {
    const a0 = ((i * slice - 90) * Math.PI) / 180; const a1 = (((i + 1) * slice - 90) * Math.PI) / 180;
    const r = 100; const x0 = 110 + r * Math.cos(a0); const y0 = 110 + r * Math.sin(a0); const x1 = 110 + r * Math.cos(a1); const y1 = 110 + r * Math.sin(a1);
    return `M110 110 L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`;
  };

  return (
    <Card className="p-4">
      <SectionTitle icon="🎡" title="Lucky spin" sub={spin.freeLeft ? "1 free spin ready!" : spin.extraLeft ? `Extra spin: ${spin.extraCost} 🪙 (${spin.extraLeft} left today)` : "Come back tomorrow"} />
      <div className="relative mx-auto h-56 w-56">
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 text-2xl drop-shadow">▼</div>
        <motion.svg viewBox="0 0 220 220" className="h-full w-full drop-shadow-lg" animate={{ rotate: angle }} transition={{ duration: 4, ease: [0.12, 0.7, 0.1, 1] }}>
          {prizes.map((p, i) => {
            const mid = ((i + 0.5) * slice - 90) * (Math.PI / 180);
            const tx = 110 + 66 * Math.cos(mid); const ty = 110 + 66 * Math.sin(mid);
            return (
              <g key={p.id}>
                <path d={arc(i)} fill={p.color} stroke="#fff" strokeWidth="2" />
                <text x={tx} y={ty} fontSize="8.5" fontWeight="700" fill="#fff" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(i + 0.5) * slice} ${tx} ${ty})`}>{p.label.length > 11 ? p.label.replace("JACKPOT ", "★ ") : p.label}</text>
              </g>
            );
          })}
          <circle cx="110" cy="110" r="16" fill="#fff" stroke="#730042" strokeWidth="3" />
        </motion.svg>
      </div>
      <div className="mt-2 min-h-[28px] text-center text-sm font-bold text-[#730042]">
        {result && `🎉 You won ${result.label}!`}
      </div>
      <div className="flex gap-2">
        <Button variant="pink" className="flex-1" disabled={!canSpin || busy} loading={doSpin.isPending && !busy} onClick={go}>{busy ? "Spinning…" : spin.freeLeft ? "SPIN!" : spin.extraLeft ? `Spin again (${spin.extraCost} 🪙)` : "No spins left"}</Button>
      </div>
    </Card>
  );
}

// ── Daily quiz ──
export function QuizCard({ quiz }) {
  const answer = useAnswerQuiz();
  const [picked, setPicked] = useState(null);
  const [res, setRes] = useState(null);
  if (!quiz) return null;
  const answered = quiz.answered || res;
  const correctIdx = res ? res.answer : quiz.answer;
  const chosen = quiz.answered ? quiz.choice : picked;
  const wasCorrect = quiz.answered ? quiz.correct : res?.correct;
  const explanation = quiz.answered ? quiz.explanation : res?.explanation;

  return (
    <Card className="p-4">
      <SectionTitle icon="🧠" title="Daily quiz" sub={`${quiz.category}${quiz.streak ? ` · 🔥 ${quiz.streak}-day quiz streak` : ""}`} />
      <p className="mb-3 text-sm font-semibold text-gray-800">{quiz.question}</p>
      <div className="space-y-2">
        {quiz.options.map((o, i) => {
          const isRight = answered && i === correctIdx;
          const isWrong = answered && i === chosen && i !== correctIdx;
          return (
            <button key={i} disabled={answered || answer.isPending}
              onClick={() => { setPicked(i); answer.mutate(i, { onSuccess: (d) => { setRes(d); if (d.correct) toast.success("Correct! 🎯"); else toast("Not quite — see the explanation", { icon: "💡" }); } }); }}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${isRight ? "border-emerald-400 bg-emerald-50 font-semibold text-emerald-800" : isWrong ? "border-red-300 bg-red-50 text-red-700" : answered ? "border-gray-200 text-gray-500" : "border-gray-200 hover:border-[#730042] hover:bg-pink-50"}`}>
              <span className="mr-2 inline-block w-5 font-bold text-gray-400">{String.fromCharCode(65 + i)}</span>{o}{isRight && " ✓"}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-3 rounded-xl p-3 text-xs ${wasCorrect ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          <b>{wasCorrect ? "Nice one! " : "Good try. "}</b>{explanation}
          <p className="mt-1 opacity-70">New question tomorrow.</p>
        </div>
      )}
    </Card>
  );
}

// ── streak overview ──
export function StreakStrip({ me }) {
  const freeze = useBuyFreeze();
  const items = [
    { k: "attendance", icon: "🕘", label: "Attendance" },
    { k: "login", icon: "🎁", label: "Daily reward" },
    { k: "quiz", icon: "🧠", label: "Quiz" },
    { k: "kudos", icon: "👏", label: "Kudos" },
  ];
  return (
    <Card className="p-4">
      <SectionTitle icon="🔥" title="Streaks" right={<Button variant="outline" className="!px-2.5 !py-1 text-xs" loading={freeze.isPending} onClick={() => freeze.mutate()}>🧊 Freeze · {fmt(me.freezes)} held</Button>} sub="Leave, holidays and week-offs never break your attendance streak." />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((i) => {
          const s = me.streaks?.[i.k] || {};
          return (
            <div key={i.k} className={`rounded-xl border p-3 ${s.atRisk ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center justify-between text-xs text-gray-500"><span>{i.icon} {i.label}</span>{s.doneToday && <span className="text-emerald-600">✓ today</span>}</div>
              <div className="mt-1 flex items-baseline gap-1"><span className="text-2xl font-extrabold text-gray-800">{s.current || 0}</span><span className="text-xs text-gray-500">days</span></div>
              <div className="text-[10px] text-gray-400">Best: {s.longest || 0}{s.atRisk ? " · at risk!" : ""}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
