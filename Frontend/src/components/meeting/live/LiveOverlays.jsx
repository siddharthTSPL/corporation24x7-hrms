import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaStop } from "react-icons/fa";
import { useLiveStore } from "./liveStore";
import useTimerClock from "./useTimerClock";
import { fmtClock } from "./liveUi";

export function RecordingBadge() {
  const rec = useLiveStore((s) => s.recording);
  if (!rec.on) return null;
  return (
    <span title={rec.by ? `Recording started by ${rec.by}` : "This meeting is being recorded"} className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-semibold text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> REC
    </span>
  );
}

// last couple of caption lines, fading out after a few seconds of silence
export function CaptionsStrip() {
  const captions = useLiveStore((s) => s.captions);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const recent = captions.filter((c) => now - (c.at || 0) < 7000).slice(-2);
  if (!recent.length) return null;
  return (
    <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
      <div className="max-w-2xl space-y-1 rounded-2xl bg-black/75 px-4 py-2.5 text-center text-sm text-white backdrop-blur">
        {recent.map((c) => (
          <p key={c.id} className={c.final ? "" : "opacity-80"}><span className="mr-1.5 text-xs font-semibold text-pink-300">{c.name}:</span>{c.text}</p>
        ))}
      </div>
    </div>
  );
}

// timer + current agenda item, visible to everybody under the header
export function TimerAgendaBar({ onOpen }) {
  const { timer, left, total, finished } = useTimerClock();
  const agenda = useLiveStore((s) => s.agenda);
  const current = agenda.items.find((i) => i.id === agenda.currentId);
  const showTimer = total > 0 && (timer.running || left < total || finished);
  if (!showTimer && !current) return null;
  return (
    <button type="button" onClick={onOpen} className="mx-4 mb-2 flex items-center gap-3 rounded-xl bg-white/5 px-3.5 py-2 text-left text-xs text-gray-200 hover:bg-white/10">
      {showTimer && (
        <span className={`rounded-full px-2.5 py-1 font-mono text-sm font-semibold tabular-nums ${finished ? "animate-pulse bg-red-600 text-white" : left <= 30 && timer.running ? "bg-amber-400 text-gray-900" : "bg-white/10 text-white"}`}>
          {finished ? "Time's up" : fmtClock(left)}
        </span>
      )}
      {timer.label && showTimer ? <span className="truncate text-gray-400">{timer.label}</span> : null}
      {current && <span className="min-w-0 flex-1 truncate"><span className="text-gray-500">Now: </span><span className="font-medium text-white">{current.title}</span></span>}
    </button>
  );
}

export function PresentingBanner({ onStop }) {
  return (
    <div className="mx-auto mb-1 flex w-fit items-center gap-3 rounded-full bg-amber-400 px-4 py-1.5 text-xs font-semibold text-gray-900 shadow">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> You're presenting to everyone
      <button type="button" onClick={onStop} className="flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-white hover:bg-black"><FaStop className="text-[9px]" /> Stop presenting</button>
    </div>
  );
}

// tells people someone started drawing while the board is closed
export function BoardNudge({ open }) {
  const count = useLiveStore((s) => s.board.strokes.length);
  const [seen, setSeen] = useState(count);
  useEffect(() => {
    if (open) setSeen(count);
  }, [open, count]);
  useEffect(() => {
    if (!open && count > seen) {
      toast("Someone is drawing on the whiteboard", { icon: "🖊️", id: "board-nudge", duration: 5000 });
      setSeen(count);
    }
  }, [count, seen, open]);
  useEffect(() => () => toast.dismiss("board-nudge"), []);
  return null;
}
