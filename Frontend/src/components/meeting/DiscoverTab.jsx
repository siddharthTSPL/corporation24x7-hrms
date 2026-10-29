import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, Compass, Star, Users } from "lucide-react";
import Avatar from "../chat/Avatar";
import { useDiscoverMeetings, useSetMeetingInterest } from "../../auth/server-state/meeting/meetingSpace.hook";
import { Btn, Chip, Empty, Spinner, ErrorNote, inputCls } from "./ui";
import { fmtDateTime, errMsg } from "./meetingUtils";

function DiscoverCard({ meeting: m, onOpen }) {
  const interest = useSetMeetingInterest();
  const full = m.capacity > 0 && m.spotsLeft === 0;

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-gray-900">{m.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{fmtDateTime(m.startTime)}</p>
        </div>
        {m.isAttendee ? (
          <Btn variant="secondary" size="sm" onClick={() => onOpen(m.id)}>
            Open
          </Btn>
        ) : (
          <Btn
            variant={m.myInterest ? "soft" : "primary"}
            size="sm"
            loading={interest.isPending}
            onClick={() => interest.mutate({ id: m.id, interested: !m.myInterest }, { onError: (e) => toast.error(errMsg(e)) })}
          >
            <Star size={14} className={m.myInterest ? "fill-current" : ""} /> {m.myInterest ? "Interested" : "I'm interested"}
          </Btn>
        )}
      </div>

      {m.description && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{m.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Avatar name={m.host?.name} photo={m.host?.photo} size={18} /> {m.host?.name}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={13} /> {m.attendeeCount}
          {m.capacity > 0 ? ` of ${m.capacity}` : ""} invited
        </span>
        <span>{m.interestedCount} interested</span>
        {full && <Chip tone="amber">Full</Chip>}
        {m.isAttendee && <Chip tone="green">You're invited</Chip>}
      </div>
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
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search open meetings" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" className="accent-[#730042]" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only ones I'm interested in
        </label>
      </div>
      {query.isLoading && <Spinner />}
      {query.isError && <ErrorNote error={query.error} retry={query.refetch} />}
      {!query.isLoading && !query.isError && list.length === 0 && <Empty icon={Compass} title="No open meetings" hint="When a host opens a meeting to the organisation, it shows up here." />}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((m) => (
          <DiscoverCard key={m.id} meeting={m} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  );
}
