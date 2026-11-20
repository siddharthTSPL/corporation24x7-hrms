import { useEffect, useMemo, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useMeetings } from "../../auth/server-state/meeting/meeting.hook";
import useCall from "../../realtime/useCall";
import JoinButton from "./JoinButton";
import { Btn } from "./ui";
import { playSound } from "./room/live/sounds";
import { fmtTime, useNow } from "./meetingUtils";
import "./meetingA11y.css";

const WINDOW_MIN = 10;

export default function MeetingSoonBanner() {
  const now = useNow(15000);
  const { active, waiting } = useCall();
  const [dismissed, setDismissed] = useState(() => new Set());
  const [anchor, setAnchor] = useState(() => Date.now());
  const params = useMemo(
    () => ({ status: "scheduled,live", from: new Date(anchor - 60 * 60000).toISOString(), to: new Date(anchor + 60 * 60000).toISOString(), limit: 20 }),
    [anchor],
  );
  const q = useMeetings(params, true);

  useEffect(() => {
    const t = setInterval(() => setAnchor(Date.now()), 10 * 60000);
    return () => clearInterval(t);
  }, []);

  const next = (q.data || [])
    .filter((m) => m.status === "scheduled" && m.myRsvp !== "declined" && !dismissed.has(m.id))
    .filter((m) => {
      const start = new Date(m.startTime).getTime();
      return start - now <= WINDOW_MIN * 60000 && start - now > -5 * 60000;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

  const nextId = next?.id;
  useEffect(() => {
    if (nextId) playSound("soon");
  }, [nextId]);

  if (!next || active || waiting) return null;
  const mins = Math.max(0, Math.ceil((new Date(next.startTime).getTime() - now) / 60000));

  return (
    <div role="status" aria-live="polite" className="mtg-root mtg-safe-t pointer-events-none fixed inset-x-0 top-0 z-[75] flex justify-center px-3 pt-3">
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-[#730042]/20 bg-white p-3 shadow-xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#730042]/10 text-[#730042]">
          <BellRing size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{next.title}</p>
          <p className="text-xs text-gray-600">{mins <= 0 ? "Starting now" : `Starts in ${mins} min`} · {fmtTime(next.startTime)}</p>
        </div>
        <JoinButton meeting={next} size="sm" />
        <Btn variant="ghost" size="icon" aria-label="Dismiss reminder" onClick={() => setDismissed((d) => new Set(d).add(next.id))}>
          <X size={16} aria-hidden="true" />
        </Btn>
      </div>
    </div>
  );
}
