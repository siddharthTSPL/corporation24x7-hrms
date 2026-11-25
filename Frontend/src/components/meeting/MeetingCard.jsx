import { Video, Mic, Repeat, Users, Clock } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../chat/Avatar";
import { useRespondToMeeting } from "../../auth/server-state/meeting/meeting.hook";
import JoinButton from "./JoinButton";
import { Chip, Skeleton } from "./ui";
import { cx } from "./meetingClasses";
import { fmtTime, fmtDate, fmtDuration, minutesBetween, errMsg, useNow } from "./meetingUtils";

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
    <div role="group" aria-label="Your response" className="inline-flex gap-0.5 rounded-lg bg-gray-100 p-0.5" onClick={(e) => e.stopPropagation()}>
      {RSVP_BUTTONS.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => set(v)}
          disabled={respond.isPending}
          aria-pressed={m.myRsvp === v}
          className={cx(
            "rounded-md transition-colors",
            size === "sm" ? "min-h-9 px-3 text-xs sm:min-h-8 sm:px-2.5" : "min-h-11 px-4 text-sm sm:min-h-10 sm:px-3.5",
            m.myRsvp === v ? "bg-white font-semibold text-[#730042] shadow-sm" : "text-gray-600 hover:text-gray-900",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function MeetingCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

const startsIn = (start, now) => {
  const mins = Math.round((new Date(start).getTime() - now) / 60000);
  if (mins < 0 || mins > 180) return null;
  if (mins === 0) return "Starting now";
  return mins < 60 ? `Starts in ${mins} min` : `Starts in ${Math.round(mins / 60)} h`;
};

export default function MeetingCard({ meeting: m, onOpen, showDate = false }) {
  const now = useNow(60000);
  const live = m.status === "live";
  const ended = m.status === "ended";
  const cancelled = m.status === "cancelled";
  const Media = m.media === "audio" ? Mic : Video;
  const mins = minutesBetween(m.startTime, m.endTime);
  const hasActions = live || m.status === "scheduled";
  const soon = m.status === "scheduled" ? startsIn(m.startTime, now) : null;

  return (
    <article
      onClick={() => onOpen(m.id)}
      className={cx(
        "group relative flex cursor-pointer flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md focus-within:shadow-md sm:flex-row sm:items-center sm:gap-4",
        live ? "border-red-200 ring-1 ring-red-100 hover:border-red-300" : "border-gray-200 hover:border-[#730042]/30",
        cancelled && "opacity-75",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span
          aria-hidden="true"
          className={cx(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            live ? "bg-red-600 text-white shadow-md shadow-red-500/30" : ended ? "bg-gray-100 text-gray-500" : cancelled ? "bg-red-50 text-red-400" : "bg-gradient-to-br from-[#730042] to-[#CD166E] text-white shadow-md shadow-[#730042]/25",
          )}
        >
          <Media size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 max-w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(m.id);
                }}
                className={cx(
                  "block max-w-full truncate rounded text-left text-[15px] font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-2xl",
                  ended || cancelled ? "text-gray-600" : "text-gray-900",
                  cancelled && "line-through",
                )}
              >
                {m.title}
                <span className="sr-only">
                  {live ? ", live now" : `, ${fmtDate(m.startTime)} at ${fmtTime(m.startTime)}`}
                  {cancelled ? ", cancelled" : ""}
                </span>
              </button>
            </h3>
            {live && (
              <Chip tone="live">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" /> Live{m.live?.participants ? ` · ${m.live.participants} in call` : ""}
              </Chip>
            )}
            {soon && <Chip tone="brand">{soon}</Chip>}
            {ended && <Chip tone="gray">Ended</Chip>}
            {cancelled && <Chip tone="red">Cancelled</Chip>}
            {m.isHost && <Chip tone="brand">Host</Chip>}
            {m.isCoHost && <Chip tone="brand">Co-host</Chip>}
            {m.myRsvp && !m.isHost && m.status === "scheduled" && m.myRsvp === "invited" && <Chip tone="amber">Reply needed</Chip>}
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
            <Clock size={14} className="text-gray-400" aria-hidden="true" />
            {showDate && `${fmtDate(m.startTime, { day: "numeric", month: "short" })}, `}
            {fmtTime(m.startTime)} – {fmtTime(m.endTime)}
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{fmtDuration(mins)}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={m.host?.name} photo={m.host?.photo} size={18} />
              {m.isHost ? "You" : m.host?.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={13} aria-hidden="true" /> {m.attendeeCount}
              {m.rsvp?.accepted > 0 && ` · ${m.rsvp.accepted} going`}
            </span>
            {m.seriesId && (
              <span className="inline-flex items-center gap-1">
                <Repeat size={13} aria-hidden="true" /> Repeats
              </span>
            )}
          </div>
        </div>
      </div>

      {hasActions && (
        <div className="relative z-10 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 sm:shrink-0 sm:border-0 sm:pt-0" onClick={(e) => e.stopPropagation()}>
          {!live && <RsvpButtons meeting={m} />}
          <JoinButton meeting={m} size="sm" />
        </div>
      )}
    </article>
  );
}