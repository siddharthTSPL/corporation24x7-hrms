import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaStop } from "react-icons/fa";
import { useLiveStore } from "./liveStore";
import useTimerClock from "./useTimerClock";
import { fmtClock } from "./liveHelpers";

export function RecordingBadge() {
  const rec = useLiveStore((s) => s.recording);
  if (!rec.on) return null;
  return (
    <span title={rec.by ? `Recording started by ${rec.by}` : "This meeting is being recorded"} className="flex h-[30px] items-center gap-2 rounded-full bg-[#DC2626] px-3 text-xs font-bold text-white">
      <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-white" /> REC
    </span>
  );
}

// Live captions. They sit at the TOP of the stage (the room puts them in a stack under the agenda bar),
// show the last couple of lines and fade out after a few seconds of silence.
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
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none flex w-full justify-center px-3">
      <div className="max-w-3xl space-y-1 rounded-2xl border border-white/10 bg-black/85 px-5 py-3 text-center text-[15px] leading-snug text-white shadow-2xl backdrop-blur">
        {recent.map((c) => (
          <p key={c.id} className={c.final ? "" : "opacity-75"}>
            <span className="mr-2 text-xs font-semibold text-[#F9A8D4]">{c.name}</span>
            {c.text}
          </p>
        ))}
      </div>
    </div>
  );
}

// timer + current / next agenda item, visible to everybody under the header
export function TimerAgendaBar({ onOpen }) {
  const { timer, left, total, finished } = useTimerClock();
  const agenda = useLiveStore((s) => s.agenda);
  const items = agenda.items || [];
  const idx = items.findIndex((i) => i.id === agenda.currentId);
  const current = idx >= 0 ? items[idx] : null;
  const next = idx >= 0 ? items[idx + 1] : null;
  const showTimer = total > 0 && (timer.running || left < total || finished);
  if (!showTimer && !current) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open activities: timer and agenda"
      className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-[#2E2E35] bg-[#17171b]/90 px-3 py-2 text-left text-xs text-gray-200 hover:bg-[#1d1d22] sm:mx-4"
    >
      {showTimer && (
        <span className={`rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums ${finished ? "animate-pulse bg-red-600 text-white" : left <= 30 && timer.running ? "bg-[#FBBF24] text-gray-900" : "bg-[#730042] text-white"}`}>
          {finished ? "Time's up" : fmtClock(left)}
        </span>
      )}
      {timer.label && showTimer && !current ? <span className="truncate text-gray-400">{timer.label}</span> : null}
      {current && (
        <span className="min-w-0 truncate text-[13px]">
          <span className="text-gray-500">Now: </span>
          <span className="font-semibold text-white">{current.title}</span>
        </span>
      )}
      {next && (
        <span className="hidden min-w-0 truncate text-gray-500 md:inline">
          Next: {next.title}
        </span>
      )}
      <span className="flex-1" />
      {current && items.length > 0 && <span className="shrink-0 text-gray-400">Agenda {idx + 1} of {items.length}</span>}
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
export function BoardNudge({ open, onOpen }) {
  const count = useLiveStore((s) => s.board.strokes.length);
  const seen = useRef(count);
  useEffect(() => {
    if (open) {
      seen.current = count;
      return;
    }
    if (count > seen.current) {
      toast("Someone is drawing on the whiteboard", { icon: "🖊️", id: "board-nudge", duration: 3000 });
      seen.current = count;
      onOpen?.(); // open the board for everyone so they can draw together
    }
  }, [open, count, onOpen]);
  useEffect(() => () => toast.dismiss("board-nudge"), []);
  return null;
}
