import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, Compass, Star, Users } from "lucide-react";
import Avatar from "../chat/Avatar";
import { useDiscoverMeetings, useSetMeetingInterest } from "../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Chip, Empty, SkeletonList, ErrorNote } from "./ui";
import { inputCls, cx } from "./meetingClasses";
import { fmtDate, fmtTime, errMsg } from "./meetingUtils";

function DiscoverCard({ meeting: m, onOpen }) {
  const interest = useSetMeetingInterest();
  const full = m.capacity > 0 && m.spotsLeft === 0;

  return (
    <li className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[#730042]/10 text-[#730042]">
        <span className="text-[11px] font-medium">{fmtDate(m.startTime, { month: "short" })}</span>
        <span className="text-xl font-semibold leading-none">{new Date(m.startTime).getDate()}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-gray-900">{m.title}</h3>
        <p className="mt-0.5 text-xs text-gray-600">
          {fmtDate(m.startTime, { weekday: "long" })}, {fmtTime(m.startTime)}
        </p>
        {m.description && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{m.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={m.host?.name} photo={m.host?.photo} size={18} /> {m.host?.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={13} aria-hidden="true" /> {m.attendeeCount}
            {m.capacity > 0 ? ` of ${m.capacity}` : ""} invited
          </span>
          <span>{m.interestedCount} interested</span>
          {full && <Chip tone="amber">Full</Chip>}
          {m.isAttendee && <Chip tone="green">You're invited</Chip>}
        </div>
      </div>

      {m.isAttendee ? (
        <Btn variant="secondary" size="sm" onClick={() => onOpen(m.id)}>
          Open
        </Btn>
      ) : (
        <Btn variant={m.myInterest ? "soft" : "secondary"} size="sm" loading={interest.isPending} onClick={() => interest.mutate({ id: m.id, interested: !m.myInterest }, { onError: (e) => toast.error(errMsg(e)) })}>
          <Star size={14} aria-hidden="true" className={m.myInterest ? "fill-current" : ""} /> {m.myInterest ? "Interested" : "I'm interested"}
        </Btn>
      )}
    </li>
  );
}

export default function DiscoverTab({ onOpen }) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const query = useDiscoverMeetings({ q, interested: mine, limit: 50 });
  const list = query.data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input aria-label="Search open meetings" className={`${inputCls} bg-white pl-9`} placeholder="Search open meetings" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <button
          type="button"
          aria-pressed={mine}
          onClick={() => setMine((v) => !v)}
          className={cx("inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm", mine ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")}
        >
          <Star size={14} aria-hidden="true" className={mine ? "fill-current" : ""} /> Interested
        </button>
      </div>
      {query.isLoading && <SkeletonList />}
      {query.isError && <ErrorNote error={query.error} retry={query.refetch} />}
      {!query.isLoading && !query.isError && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white">
          <Empty icon={Compass} title="No open meetings" hint="When a host opens a meeting to the organisation, it shows up here." />
        </div>
      )}
      <ul className="space-y-3">
        {list.map((m) => (
          <DiscoverCard key={m.id} meeting={m} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  );
}
