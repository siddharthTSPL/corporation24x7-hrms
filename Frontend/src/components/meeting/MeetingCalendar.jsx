import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarX2 } from "lucide-react";
import { useMeetingCalendar } from "../../auth/server-state/meeting/meeting.hook";
import MeetingCard from "./MeetingCard";
import { Btn, Empty, ErrorNote, cx } from "./ui";
import { fmtTime, startOfDay } from "./meetingUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");
const dayKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const PILL = {
  live: "bg-red-600 text-white",
  scheduled: "bg-[#730042]/10 text-[#730042]",
  ended: "bg-gray-100 text-gray-500",
};

/**
 * Month view of the meetings I'm invited to / hosting (GET /meetings/calendar).
 * focus: { date, nonce } - jump to a date (e.g. right after scheduling a meeting).
 */
export default function MeetingCalendar({ onOpen, focus }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return startOfDay(d);
  });
  const [selected, setSelected] = useState(() => dayKeyOf(new Date()));

  useEffect(() => {
    if (!focus?.date) return;
    const d = new Date(focus.date);
    setCursor(startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)));
    setSelected(dayKeyOf(d));
  }, [focus?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = useMeetingCalendar(monthKeyOf(cursor));
  const byId = useMemo(() => new Map((q.data?.meetings || []).map((m) => [m.id, m])), [q.data]);
  const dayMeetings = (key) => (q.data?.days?.[key] || []).map((id) => byId.get(id)).filter(Boolean);

  const cells = useMemo(() => {
    const first = new Date(cursor);
    const lead = first.getDay();
    const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= total; d++) out.push(new Date(first.getFullYear(), first.getMonth(), d));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const todayKey = dayKeyOf(new Date());
  const move = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(todayKey);
  };
  const selectedList = dayMeetings(selected);
  const selectedDate = new Date(`${selected}T00:00:00`);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            {cursor.toLocaleDateString([], { month: "long", year: "numeric" })}
          </h2>
          <div className="flex items-center gap-1">
            <Btn variant="secondary" size="sm" onClick={goToday}>Today</Btn>
            <Btn variant="ghost" size="icon" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={18} /></Btn>
            <Btn variant="ghost" size="icon" aria-label="Next month" onClick={() => move(1)}><ChevronRight size={18} /></Btn>
          </div>
        </div>

        {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}

        <div className="grid grid-cols-7 border-b border-gray-100 text-center text-xs font-medium text-gray-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        <div className={cx("grid grid-cols-7", q.isFetching && !q.data && "opacity-60")}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="min-h-[72px] border-b border-r border-gray-50 bg-gray-50/50 sm:min-h-[104px]" />;
            const key = dayKeyOf(date);
            const list = dayMeetings(key);
            const isToday = key === todayKey;
            const isSel = key === selected;
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(key)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(key)}
                className={cx(
                  "min-h-[72px] cursor-pointer border-b border-r border-gray-100 p-1 transition-colors hover:bg-gray-50 sm:min-h-[104px] sm:p-1.5",
                  isSel && "bg-[#730042]/5",
                )}
              >
                <span
                  className={cx(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday ? "bg-[#730042] font-semibold text-white" : "text-gray-700",
                    isSel && !isToday && "font-semibold text-[#730042]",
                  )}
                >
                  {date.getDate()}
                </span>

                <div className="mt-1 hidden space-y-0.5 sm:block">
                  {list.slice(0, 2).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(m.id);
                      }}
                      className={cx("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium", PILL[m.status] || PILL.scheduled)}
                      title={`${fmtTime(m.startTime)} · ${m.title}`}
                    >
                      {fmtTime(m.startTime)} {m.title}
                    </button>
                  ))}
                  {list.length > 2 && <p className="px-1.5 text-[11px] text-gray-500">+{list.length - 2} more</p>}
                </div>

                {list.length > 0 && (
                  <div className="mt-1 flex justify-center gap-0.5 sm:hidden">
                    {list.slice(0, 3).map((m) => (
                      <span key={m.id} className="h-1.5 w-1.5 rounded-full bg-[#730042]" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          {selectedDate.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </h3>
        {selectedList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white">
            <Empty icon={CalendarX2} title="No meetings on this day" />
          </div>
        ) : (
          <div className="space-y-3">
            {selectedList.map((m) => (
              <MeetingCard key={m.id} meeting={m} onOpen={onOpen} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
