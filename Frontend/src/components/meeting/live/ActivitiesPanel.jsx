import { useEffect, useMemo, useRef, useState } from "react";
import { FaPlay, FaPause, FaRedo, FaForward, FaPlus, FaTrash } from "react-icons/fa";
import useCall from "../../../../realtime/useCall";
import { emitAck } from "../../../../realtime/chatSocket";
import { useMeetingKudos } from "../../../../auth/server-state/meeting/meetingLive.hook";
import { PanelHeader } from "../RoomMedia";
import { EV } from "./liveEvents";
import { useLiveStore } from "./liveStore";
import useTimerClock from "./useTimerClock";
import { act, darkInput, PillButton, Tabs, Empty, fmtClock } from "./liveUi";

// ---------------------------------------------------------------- Plan: timer + agenda
function PlanTab({ roomKey, isHost }) {
  const { timer, left, total } = useTimerClock();
  const agenda = useLiveStore((s) => s.agenda);
  const [minutes, setMinutes] = useState(5);
  const [label, setLabel] = useState("");
  const [draft, setDraft] = useState("");

  const send = (event, payload = {}) => act(() => emitAck(event, { roomKey, ...payload }));
  const saveAgenda = (items, currentId = agenda.currentId) => send(EV.agendaSet, { items, currentId });
  const pct = total ? Math.min(100, ((total - left) / total) * 100) : 0;

  return (
    <div className="space-y-5 px-4 py-4">
      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Timer</p>
        <div className="rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-4xl font-semibold tabular-nums text-white">{fmtClock(total ? left : minutes * 60)}</p>
          {timer.label ? <p className="mt-1 text-xs text-gray-400">{timer.label}</p> : null}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#CD166E] transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
        {isHost ? (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))} className={`${darkInput} w-20`} aria-label="Minutes" />
              <input className={darkInput} placeholder="Label (optional)" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <PillButton tone="brand" onClick={() => send(EV.timerStart, { durationSec: minutes * 60, label: label.trim() })}><FaPlay className="mr-1 inline text-[9px]" /> Start</PillButton>
              {timer.running ? (
                <PillButton onClick={() => send(EV.timerPause)}><FaPause className="mr-1 inline text-[9px]" /> Pause</PillButton>
              ) : total && left > 0 && left < total ? (
                <PillButton onClick={() => send(EV.timerResume, { remainingSec: left, durationSec: total, label: timer.label })}><FaPlay className="mr-1 inline text-[9px]" /> Resume</PillButton>
              ) : null}
              <PillButton onClick={() => send(EV.timerReset)}><FaRedo className="mr-1 inline text-[9px]" /> Reset</PillButton>
              {[1, 5, 10].map((m) => <PillButton key={m} tone="ghost" onClick={() => setMinutes(m)}>{m}m</PillButton>)}
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Agenda</p>
          {isHost && agenda.items.length > 0 && <PillButton tone="ghost" onClick={() => send(EV.agendaNext)}><FaForward className="mr-1 inline text-[9px]" /> Next item</PillButton>}
        </div>
        {!agenda.items.length && <p className="rounded-xl bg-white/5 px-3 py-3 text-xs text-gray-500">{isHost ? "Add the topics you want to cover." : "The host hasn't set an agenda."}</p>}
        <ol className="space-y-1.5">
          {agenda.items.map((it, i) => {
            const current = it.id === agenda.currentId;
            return (
              <li key={it.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${current ? "bg-[#CD166E]/25 text-white ring-1 ring-[#CD166E]/50" : "bg-white/5 text-gray-200"}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${it.done ? "bg-emerald-500 text-white" : "bg-white/15"}`}>{it.done ? "✓" : i + 1}</span>
                <span className={`min-w-0 flex-1 truncate ${it.done ? "text-gray-500 line-through" : ""}`}>{it.title}</span>
                {isHost && (
                  <>
                    {!current && <button type="button" className="text-[11px] text-gray-400 hover:text-white" onClick={() => saveAgenda(agenda.items, it.id)}>Now</button>}
                    <button type="button" aria-label="Remove item" className="text-gray-500 hover:text-red-300" onClick={() => saveAgenda(agenda.items.filter((x) => x.id !== it.id))}><FaTrash className="text-[10px]" /></button>
                  </>
                )}
              </li>
            );
          })}
        </ol>
        {isHost && (
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (!t) return; setDraft(""); saveAgenda([...agenda.items, { id: `${Date.now()}`, title: t }], agenda.currentId || undefined); }}>
            <input className={darkInput} placeholder="Add an agenda item" maxLength={120} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <PillButton type="submit" tone="brand" disabled={!draft.trim()}><FaPlus /></PillButton>
          </form>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Pulse check
function PulseTab({ roomKey, isHost }) {
  const pulse = useLiveStore((s) => s.pulse);
  const mineSet = useLiveStore((s) => s.pulseMine);
  const [q, setQ] = useState("How are we feeling about this?");
  const send = (event, payload = {}) => act(() => emitAck(event, { roomKey, ...payload }));
  const scale = pulse?.scale || 5;
  const faces = ["😟", "😕", "😐", "🙂", "😄"];
  const total = pulse?.total || 0;
  const avg = useMemo(() => {
    if (!pulse || !total) return 0;
    return Object.entries(pulse.votes).reduce((a, [k, v]) => a + Number(k) * Number(v), 0) / total;
  }, [pulse, total]);

  return (
    <div className="space-y-4 px-4 py-4">
      {pulse ? (
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">{pulse.question}</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: scale }, (_, i) => i + 1).map((n) => {
              const count = Number(pulse.votes[n] || 0);
              return (
                <button key={n} type="button" disabled={!pulse.open} onClick={() => { mineSet(n); send(EV.pulseVote, { pulseId: pulse.id, value: n }); }} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xl transition-colors ${pulse.mine === n ? "bg-[#CD166E]" : "bg-white/10 hover:bg-white/15"} disabled:opacity-60`} aria-label={`Rate ${n}`}>
                  {faces[Math.round(((n - 1) / (scale - 1)) * 4)]}
                  <span className="text-[10px] font-semibold text-gray-200">{count}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">{total} {total === 1 ? "response" : "responses"}{total ? ` · average ${avg.toFixed(1)} / ${scale}` : ""}{pulse.open ? "" : " · closed"}</p>
          {isHost && pulse.open && <PillButton className="mt-3" onClick={() => send(EV.pulseClose, { pulseId: pulse.id })}>Close pulse</PillButton>}
        </div>
      ) : (
        <Empty icon="💓" title="No pulse check running" hint={isHost ? "Ask a quick 1–5 question below." : "The host can start a quick pulse check."} />
      )}
      {isHost && (!pulse || !pulse.open) && (
        <div className="space-y-2">
          <input className={darkInput} value={q} maxLength={120} onChange={(e) => setQ(e.target.value)} />
          <PillButton tone="brand" disabled={!q.trim()} onClick={() => send(EV.pulseStart, { question: q.trim(), scale: 5 })}>Start pulse check</PillButton>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Wheel
function WheelTab({ roomKey, isHost }) {
  const { peers, active, myKey } = useCall();
  const wheel = useLiveStore((s) => s.wheel);
  const [shown, setShown] = useState("");
  const [spinning, setSpinning] = useState(false);
  const timer = useRef(null);
  const names = useMemo(() => [active?.localStream ? "You" : "", ...peers.map((p) => p.name || "Participant")].filter(Boolean), [peers, active?.localStream]);

  // slot-machine style reveal whenever a result arrives
  useEffect(() => {
    if (!wheel?.winner) return undefined;
    const pool = wheel.names.length ? wheel.names : names;
    let i = 0;
    setSpinning(true);
    timer.current = setInterval(() => {
      setShown(pool[i % pool.length] || wheel.winner);
      i += 1;
      if (i > 22) {
        clearInterval(timer.current);
        setShown(wheel.winnerKey && wheel.winnerKey === myKey ? "You" : wheel.winner);
        setSpinning(false);
      }
    }, 90);
    return () => clearInterval(timer.current);
  }, [wheel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#3b0022] to-[#730042] p-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-pink-200">Picked</p>
        <p className={`mt-2 min-h-10 truncate text-3xl font-semibold text-white ${spinning ? "opacity-80" : ""}`}>{shown || "🎡"}</p>
      </div>
      {isHost ? (
        <PillButton tone="brand" disabled={spinning || !peers.length} onClick={() => act(() => emitAck(EV.wheelSpin, { roomKey, names }))}>Spin the wheel</PillButton>
      ) : (
        <p className="text-center text-xs text-gray-500">The host spins the wheel for everyone.</p>
      )}
      {!peers.length && isHost && <p className="text-xs text-gray-500">You need at least one more person in the meeting.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Kudos
function KudosTab({ roomKey, meetingId }) {
  const { peers } = useCall();
  const { data: given = [] } = useMeetingKudos(meetingId, true);
  const feed = useLiveStore((s) => s.kudosFeed);
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [emoji, setEmoji] = useState("👏");
  const targets = peers.filter((p) => p.key);

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="space-y-2 rounded-2xl bg-white/5 p-3.5">
        <select value={to} onChange={(e) => setTo(e.target.value)} className={darkInput}>
          <option value="" className="text-gray-900">Who deserves a shout-out?</option>
          {targets.map((p) => <option key={p.key} value={p.key} className="text-gray-900">{p.name || "Participant"}</option>)}
        </select>
        <div className="flex gap-1.5">
          {["👏", "🙌", "🔥", "💡", "❤️", "🚀"].map((e) => <button key={e} type="button" onClick={() => setEmoji(e)} className={`h-9 w-9 rounded-xl text-lg ${emoji === e ? "bg-[#CD166E]" : "bg-white/10 hover:bg-white/15"}`}>{e}</button>)}
        </div>
        <input className={darkInput} placeholder="Say why (optional)" maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} />
        <PillButton tone="brand" disabled={!to} onClick={() => act(async () => { await emitAck(EV.kudosGive, { roomKey, meetingId, toKey: to, message: message.trim(), emoji }); setMessage(""); setTo(""); })}>Send kudos</PillButton>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Given in this meeting</p>
        {!given.length && !feed.length && <p className="text-xs text-gray-500">No kudos yet. Be the first.</p>}
        <ul className="space-y-1.5">
          {feed.map((k) => <li key={k.id} className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{k.emoji} <b>{k.from}</b> sent you kudos{k.message ? `: ${k.message}` : ""}</li>)}
          {given.map((k, i) => <li key={k.id || i} className="rounded-xl bg-white/5 px-3 py-2 text-sm text-gray-200">{k.emoji || "👏"} <b>{k.fromName || k.from?.name || "Someone"}</b> → <b>{k.toName || k.to?.name || "someone"}</b>{k.message ? <span className="text-gray-400"> · {k.message}</span> : null}</li>)}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Decisions
function DecisionsTab({ roomKey, isHost }) {
  const decisions = useLiveStore((s) => s.decisions);
  const apply = useLiveStore((s) => s.decisionApply);
  const [text, setText] = useState("");
  return (
    <div className="space-y-3 px-4 py-4">
      {!decisions.length && <Empty icon="✅" title="No decisions logged" hint="Write down what the group agreed on." />}
      <ul className="space-y-1.5">
        {decisions.map((d) => (
          <li key={d.id} className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-gray-100">
            <span className="mt-0.5 text-emerald-400">✓</span>
            <span className="min-w-0 flex-1 break-words">{d.text}{d.by ? <span className="block text-[11px] text-gray-500">{d.by}</span> : null}</span>
            {isHost && <button type="button" aria-label="Remove decision" className="text-gray-500 hover:text-red-300" onClick={() => act(async () => { await emitAck(EV.decisionRemove, { roomKey, decisionId: d.id }); apply({ removedId: d.id }); })}><FaTrash className="text-[10px]" /></button>}
          </li>
        ))}
      </ul>
      {isHost ? (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(""); act(async () => { const res = await emitAck(EV.decisionAdd, { roomKey, text: t }); apply(res?.decision ? res : { text: t, id: `${Date.now()}` }); }); }}>
          <input className={darkInput} placeholder="We decided to…" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
          <PillButton type="submit" tone="brand" disabled={!text.trim()}>Log</PillButton>
        </form>
      ) : (
        <p className="text-center text-xs text-gray-500">Only the host can log decisions.</p>
      )}
    </div>
  );
}

const TABS = [["plan", "Timer & agenda"], ["pulse", "Pulse"], ["wheel", "Wheel"], ["kudos", "Kudos"], ["decisions", "Decisions"]];

export default function ActivitiesPanel({ onClose, initialTab = "plan" }) {
  const { active, isHost } = useCall();
  const [tab, setTab] = useState(initialTab);
  const roomKey = active?.roomKey;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Activities" subtitle="Keep the meeting on track" onClose={onClose} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "plan" && <PlanTab roomKey={roomKey} isHost={isHost} />}
        {tab === "pulse" && <PulseTab roomKey={roomKey} isHost={isHost} />}
        {tab === "wheel" && <WheelTab roomKey={roomKey} isHost={isHost} />}
        {tab === "kudos" && <KudosTab roomKey={roomKey} meetingId={active?.meetingId} />}
        {tab === "decisions" && <DecisionsTab roomKey={roomKey} isHost={isHost} />}
      </div>
    </div>
  );
}
