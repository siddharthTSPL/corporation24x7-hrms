import { Video, Mic, Repeat, Users, Clock } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../chat/Avatar";
import { useRespondToMeeting } from "../../auth/server-state/meeting/meeting.hook";
import JoinButton from "./JoinButton";
import { Chip, Skeleton } from "./ui";
import { cx } from "./meetingClasses";
import { fmtTime, fmtDate, fmtDuration, minutesBetween, errMsg } from "./meetingUtils";

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
    <div role="group" aria-label="Your response" className="inline-flex overflow-hidden rounded-lg border border-gray-300" onClick={(e) => e.stopPropagation()}>
      {RSVP_BUTTONS.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => set(v)}
          disabled={respond.isPending}
          aria-pressed={m.myRsvp === v}
          className={cx(
            "border-r border-gray-300 transition-colors last:border-r-0",
            size === "sm" ? "min-h-9 px-3 text-xs sm:min-h-8 sm:px-2.5" : "min-h-11 px-4 text-sm sm:min-h-10 sm:px-3.5",
            m.myRsvp === v ? "bg-[#730042] text-white" : "bg-white text-gray-700 hover:bg-gray-50",
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
    <div aria-hidden="true" className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="w-16 space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-9" />
      </div>
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function MeetingCard({ meeting: m, onOpen, showDate = false }) {
  const live = m.status === "live";
  const ended = m.status === "ended";
  const cancelled = m.status === "cancelled";
  const Media = m.media === "audio" ? Mic : Video;
  const mins = minutesBetween(m.startTime, m.endTime);
  const hasActions = live || m.status === "scheduled";

  return (
    <article
      onClick={() => onOpen(m.id)}
      className={cx(
        "relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-white p-3.5 transition-colors hover:border-gray-300 hover:bg-gray-50/60 focus-within:border-[#730042] sm:flex-row sm:items-center sm:gap-4 sm:p-4",
        live ? "border-red-200" : "border-gray-200",
        cancelled && "opacity-75",
      )}
    >
      <div className="flex min-w-0 flex-1 items-stretch gap-3">
        <div className="w-16 shrink-0 text-right sm:w-20">
          <p className="text-sm font-semibold text-gray-900">{fmtTime(m.startTime)}</p>
          <p className="mt-0.5 text-xs text-gray-500">{showDate ? fmtDate(m.startTime, { day: "numeric", month: "short" }) : fmtDuration(mins)}</p>
        </div>
        <span aria-hidden="true" className={cx("w-1 shrink-0 rounded-full", live ? "bg-red-500" : ended || cancelled ? "bg-gray-300" : "bg-[#730042]")} />

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
                  "block max-w-full truncate rounded text-left text-sm font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-xl",
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
            {cancelled && <Chip tone="red">Cancelled</Chip>}
            {m.isHost && <Chip tone="brand">Host</Chip>}
            {m.isCoHost && <Chip tone="brand">Co-host</Chip>}
            {m.myRsvp && !m.isHost && m.status === "scheduled" && m.myRsvp === "invited" && <Chip tone="amber">Reply needed</Chip>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={m.host?.name} photo={m.host?.photo} size={18} />
              {m.isHost ? "You" : m.host?.name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Media size={13} aria-hidden="true" /> {m.media === "audio" ? "Audio" : "Video"}
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

      {(hasActions || ended) && (
        <div className={cx("relative z-10 flex flex-wrap items-center gap-2 sm:shrink-0", hasActions && "border-t border-gray-100 pt-3 sm:border-0 sm:pt-0")} onClick={(e) => e.stopPropagation()}>
          {!live && <RsvpButtons meeting={m} />}
          <JoinButton meeting={m} size="sm" />
          {ended && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
              <Clock size={12} aria-hidden="true" /> Ended
            </span>
          )}
        </div>
      )}
    </article>
  );
}
