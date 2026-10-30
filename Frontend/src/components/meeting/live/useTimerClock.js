import { useEffect, useState } from "react";
import { useLiveStore } from "./liveStore";
import { playSound } from "./sounds";

// Seconds left on the shared meeting timer (ticks once a second while it runs).
export default function useTimerClock() {
  const timer = useLiveStore((s) => s.timer);
  const [, force] = useState(0);

  useEffect(() => {
    if (!timer.running) return undefined;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [timer.running]);

  const left = timer.running && timer.endsAt ? Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000)) : timer.remainingSec;

  useEffect(() => {
    if (timer.running && timer.endsAt && left === 0) playSound("done");
  }, [left, timer.running, timer.endsAt]);

  return { timer, left, total: timer.durationSec, finished: timer.durationSec > 0 && left === 0 };
}
