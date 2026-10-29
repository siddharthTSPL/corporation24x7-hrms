import { Video, Mic, Repeat, Users, Clock } from "lucide-react";
import Avatar from "../chat/Avatar";
import { useRespondToMeeting } from "../../auth/server-state/meeting/meeting.hook";
import JoinButton from "./JoinButton";
import { Chip, cx } from "./ui";
import { fmtTime, fmtDuration, minutesBetween, errMsg } from "./meetingUtils";
import toast from "react-hot-toast";

const RSVP_BUTTONS = [
  ["accepted", "Going"],
  ["tentative", "Maybe"],
  ["declined", "Can't go"],
];

export function RsvpButtons({ meeting: m, size = "sm" }) {
  const respond = useRespondToMeeting();
  if (m.isHost || m.status !== "scheduled" || !m.myRsvp) return null;
  const set = (rsvp) => respond.mutate({ id: m.id, rsvp }, { onError: (e) => toast.error(errMsg(e)) });
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200" onClick={(e) => e.stopPropagation()}>
      {RSVP_BUTTONS.map(([v, label]) => (
        <button
          key={v}
          onClick={() => set(v)}
          disabled={respond.isPending}
          aria-pressed={m.myRsvp === v}
          className={cx(
            "border-r border-gray-200 last:border-r-0 transition-colors",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm",
            m.myRsvp === v ? "bg-[#730042] text-white" : "bg-white text-gray-600 hover:bg-gray-50",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function MeetingCard({ meeting: m, onOpen }) {
  const live = m.status === "live";
  const ended = m.status === "ended";
  const Media = m.media === "audio" ? Mic : Video;
  const mins = minutesBetween(m.startTime, m.endTime);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(m.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(m.id)}
      className={cx(
        "flex gap-4 rounded-xl border bg-white p-4 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#730042]",
        live ? "border-red-200" : "border-gray-200",
      )}
    >
      <div className="w-16 shrink-0 border-r border-gray-100 pr-4">
        <p className="text-sm font-semibold text-gray-900">{fmtTime(m.startTime)}</p>
        <p className="mt-0.5 text-xs text-gray-500">{fmtDuration(mins)}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cx("truncate text-[15px] font-semibold", ended ? "text-gray-600" : "text-gray-900")}>{m.title}</h3>
          {live && (
            <Chip tone="live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live{m.live?.participants ? ` · ${m.live.participants} in call` : ""}
            </Chip>
          )}
          {m.isHost && <Chip tone="brand">Host</Chip>}
          {m.isCoHost && <Chip tone="brand">Co-host</Chip>}
          {m.myRsvp && !m.isHost && m.status === "scheduled" && m.myRsvp === "invited" && <Chip tone="amber">Reply needed</Chip>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={m.host?.name} photo={m.host?.photo} size={18} />
            {m.isHost ? "You" : m.host?.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Media size={13} /> {m.media === "audio" ? "Audio" : "Video"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={13} /> {m.attendeeCount}
            {m.rsvp?.accepted > 0 && ` · ${m.rsvp.accepted} going`}
          </span>
          {m.seriesId && (
            <span className="inline-flex items-center gap-1">
              <Repeat size={13} /> Repeats
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        <JoinButton meeting={m} size="sm" />
        {!live && <RsvpButtons meeting={m} />}
        {ended && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <Clock size={12} /> Ended
          </span>
        )}
      </div>
    </div>
  );
}
