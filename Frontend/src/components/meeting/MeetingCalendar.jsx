import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarX2, CalendarDays, Clock, Radio, Sparkles, Video } from "lucide-react";
import { useMeetingCalendar } from "../../auth/server-state/meeting/meeting.hook";
import MeetingCard from "./MeetingCard";
import JoinButton from "./JoinButton";
import { Empty, ErrorNote } from "./ui";
import { cx } from "./meetingClasses";
import { fmtTime, startOfDay } from "./meetingUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const dayKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const CHIP = {
  live: "border-red-500 bg-red-50 text-red-700",
  scheduled: "border-[#CD166E] bg-gradient-to-r from-[#730042]/10 to-[#CD166E]/5 text-[#5c0035]",
  ended: "border-gray-300 bg-gray-100 text-gray-500",
  cancelled: "border-red-200 bg-red-50/60 text-red-400 line-through",
};

const DOT = {
  live: "bg-red-500",
  scheduled: "bg-[#CD166E]",
  ended: "bg-gray-400",
  cancelled: "bg-red-300",
};

const LEGEND = [
  ["live", "Live"],
  ["scheduled", "Scheduled"],
  ["ended", "Ended"],
  ["cancelled", "Cancelled"],
];

const untilLabel = (start) => {
  const mins = Math.round((new Date(start).getTime() - Date.now()) / 60000);
  if (mins <= 0) return "Starting now";
  if (mins < 60) return `in ${mins} min`;
  if (mins < 24 * 60) return `in ${Math.round(mins / 60)} h`;
  const days = Math.round(mins / (24 * 60));
  return days === 1 ? "tomorrow" : `in ${days} days`;
};

function StatCard({ icon: Icon, value, label, tone = "glass" }) {
  return (
    <div className={cx("flex items-center gap-3 rounded-2xl px-3.5 py-2.5 backdrop-blur-md ring-1", tone === "live" ? "bg-red-500/90 ring-red-300/40" : "bg-white/12 ring-white/20")}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-white/75">{label}</p>
      </div>
    </div>
  );
}

export default function MeetingCalendar({ onOpen, focus }) {
  const [cursor, setCursor] = useState(() => {
    const d = focus?.date ? new Date(focus.date) : new Date();
    return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [selected, setSelected] = useState(() => dayKeyOf(focus?.date ? new Date(focus.date) : new Date()));
  const [seenNonce, setSeenNonce] = useState(focus?.nonce);

  if (focus?.nonce !== seenNonce) {
    setSeenNonce(focus?.nonce);
    if (focus?.date) {
      const d = new Date(focus.date);
      setCursor(startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)));
      setSelected(dayKeyOf(d));
    }
  }

  const q = useMeetingCalendar(monthKeyOf(cursor));
  const byId = useMemo(() => new Map((q.data?.meetings || []).map((m) => [m.id, m])), [q.data]);
  const dayMeetings = (key) => (q.data?.days?.[key] || []).map((id) => byId.get(id)).filter(Boolean);

  const cells = useMemo(() => {
    const first = new Date(cursor);
    const lead = first.getDay();
    const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const out = [];
    for (let i = lead; i > 0; i--) out.push({ date: new Date(first.getFullYear(), first.getMonth(), 1 - i), inMonth: false });
    for (let d = 1; d <= total; d++) out.push({ date: new Date(first.getFullYear(), first.getMonth(), d), inMonth: true });
    let next = 1;
    while (out.length % 7) out.push({ date: new Date(first.getFullYear(), first.getMonth() + 1, next++), inMonth: false });
    return out;
  }, [cursor]);

  const todayKey = dayKeyOf(new Date());
  const move = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(todayKey);
  };
  const jumpMonth = (m) => setCursor((c) => new Date(c.getFullYear(), m, 1));
  const pickOutside = (date) => {
    setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelected(dayKeyOf(date));
  };

  const selectedList = dayMeetings(selected);
  const selectedDate = new Date(`${selected}T00:00:00`);
  const monthMeetings = q.data?.meetings || [];
  const liveCount = monthMeetings.filter((m) => m.status === "live").length;
  const upcomingCount = monthMeetings.filter((m) => m.status === "scheduled").length;
  const loading = q.isFetching && !q.data;

  const upNext = useMemo(() => {
    const live = monthMeetings.find((m) => m.status === "live");
    if (live) return live;
    const now = Date.now();
    return monthMeetings
      .filter((m) => m.status === "scheduled" && new Date(m.startTime).getTime() >= now - 5 * 60000)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];
  }, [monthMeetings]);

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes torchx-cal-in { 0% { opacity: 0; transform: translateY(8px) scale(.99); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes torchx-cal-live { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,.6); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
        @keyframes torchx-cal-orb { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(24px, -18px) scale(1.12); } }
        @keyframes torchx-cal-glow { 0%, 100% { box-shadow: 0 8px 24px -8px rgba(205,22,110,.5); } 50% { box-shadow: 0 8px 32px -4px rgba(205,22,110,.75); } }
      `}</style>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3d0023] via-[#730042] to-[#CD166E] p-5 text-white shadow-[0_24px_60px_-24px_rgba(115,0,66,0.7)] sm:p-6">
        <span className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#ff7ac0]/30 blur-3xl" style={{ animation: "torchx-cal-orb 10s ease-in-out infinite" }} />
        <span className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[#2a0018]/60 blur-3xl" style={{ animation: "torchx-cal-orb 13s ease-in-out infinite reverse" }} />
        <span className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              <CalendarDays size={13} aria-hidden="true" /> TorchX Meetings
            </p>
            <h2 aria-live="polite" className="mt-1.5 text-2xl font-bold leading-none tracking-tight sm:text-3xl">
              {cursor.toLocaleDateString([], { month: "long" })}
              <span className="ml-2 align-baseline text-base font-light text-white/60 sm:text-lg">{cursor.getFullYear()}</span>
            </h2>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-white/15 p-1 ring-1 ring-white/25 backdrop-blur-md">
            <button type="button" aria-label="Previous month" onClick={() => move(-1)} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/20">
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={goToday} className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#730042] shadow transition hover:bg-[#fdf2f8]">
              Today
            </button>
            <button type="button" aria-label="Next month" onClick={() => move(1)} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/20">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={CalendarDays} value={monthMeetings.length} label="This month" />
          <StatCard icon={Clock} value={upcomingCount} label="Upcoming" />
          <div className="col-span-2 sm:col-span-1">
            <StatCard icon={Radio} value={liveCount} label={liveCount ? "Live now" : "Live"} tone={liveCount ? "live" : "glass"} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-3xl border border-gray-200/80 bg-white p-3 shadow-[0_18px_50px_-24px_rgba(115,0,66,0.35)] sm:p-5">
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {MONTHS.map((label, m) => {
              const active = m === cursor.getMonth();
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => jumpMonth(m)}
                  aria-pressed={active}
                  className={cx(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                    active ? "bg-gradient-to-r from-[#730042] to-[#CD166E] text-white shadow-md shadow-[#730042]/30" : "bg-gray-100 text-gray-500 hover:bg-[#730042]/10 hover:text-[#730042]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}

          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider sm:gap-2">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={cx("py-1.5", i === 0 || i === 6 ? "text-[#CD166E]" : "text-gray-400")}>{d}</div>
            ))}
          </div>

          <div
            key={monthKeyOf(cursor)}
            className={cx("grid grid-cols-7 gap-1.5 sm:gap-2", loading && "animate-pulse opacity-60")}
            style={{ animation: loading ? undefined : "torchx-cal-in .4s ease-out both" }}
          >
            {cells.map(({ date, inMonth }, i) => {
              const key = dayKeyOf(date);
              const list = inMonth ? dayMeetings(key) : [];
              const isToday = key === todayKey;
              const isSel = key === selected;
              const hasLive = list.some((m) => m.status === "live");
              const tint = list.length >= 3 ? "bg-[#730042]/[0.10]" : list.length === 2 ? "bg-[#730042]/[0.06]" : list.length === 1 ? "bg-[#730042]/[0.03]" : "bg-gray-50/80";

              return (
                <div
                  key={`${key}-${i}`}
                  onClick={() => (inMonth ? setSelected(key) : pickOutside(date))}
                  style={isToday && !isSel ? { animation: "torchx-cal-glow 2.8s ease-in-out infinite" } : undefined}
                  className={cx(
                    "group relative min-h-[62px] cursor-pointer rounded-xl border p-1.5 transition-all duration-200 sm:min-h-[108px] sm:rounded-2xl sm:p-2",
                    !inMonth && "border-transparent bg-transparent opacity-50 hover:opacity-100",
                    inMonth && !isSel && cx(tint, "border-transparent hover:-translate-y-0.5 hover:border-[#730042]/25 hover:bg-white hover:shadow-lg hover:shadow-[#730042]/10"),
                    isToday && !isSel && "border-[#CD166E]/60 bg-white",
                    isSel && "border-transparent bg-gradient-to-br from-[#730042] to-[#CD166E] text-white shadow-xl shadow-[#730042]/35 sm:-translate-y-0.5",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <button
                      type="button"
                      aria-pressed={isSel}
                      aria-label={`${date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}${list.length ? `, ${list.length} meeting${list.length > 1 ? "s" : ""}` : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (inMonth) setSelected(key);
                        else pickOutside(date);
                      }}
                      className={cx(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs transition",
                        isSel ? (isToday ? "bg-white font-bold text-[#730042]" : "font-bold text-white") : isToday ? "bg-gradient-to-br from-[#730042] to-[#CD166E] font-bold text-white" : inMonth ? "font-medium text-gray-700" : "text-gray-400",
                      )}
                    >
                      {date.getDate()}
                    </button>
                    {hasLive && <span aria-hidden="true" className="mr-0.5 mt-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" style={{ animation: "torchx-cal-live 1.6s ease-out infinite" }} />}
                  </div>

                  <div className="mt-1.5 hidden space-y-1 sm:block">
                    {list.slice(0, 2).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(m.id);
                        }}
                        className={cx(
                          "block w-full truncate rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight transition hover:brightness-95",
                          isSel ? "border-white bg-white/20 text-white" : CHIP[m.status] || CHIP.scheduled,
                        )}
                        title={`${fmtTime(m.startTime)} · ${m.title}`}
                      >
                        <span className="font-semibold">{fmtTime(m.startTime)}</span> {m.title}
                      </button>
                    ))}
                    {list.length > 2 && <p className={cx("px-1.5 text-[11px] font-semibold", isSel ? "text-white/90" : "text-[#730042]")}>+{list.length - 2} more</p>}
                  </div>

                  {list.length > 0 && (
                    <div className="mt-1.5 flex justify-center gap-0.5 sm:hidden">
                      {list.slice(0, 3).map((m) => (
                        <span key={m.id} aria-hidden="true" className={cx("h-1.5 w-1.5 rounded-full", isSel ? "bg-white" : DOT[m.status] || DOT.scheduled)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-gray-100 pt-3">
            {LEGEND.map(([status, label]) => (
              <span key={status} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <span className={cx("h-2 w-2 rounded-full", DOT[status])} /> {label}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="h-2 w-6 rounded-full bg-gradient-to-r from-[#730042]/[0.03] to-[#730042]/[0.18]" /> busier day
            </span>
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b0a14] via-[#3d0023] to-[#730042] p-5 text-white shadow-xl shadow-[#730042]/25">
            <span className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#CD166E]/40 blur-3xl" />
            <p className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f08bbd]">
              <Sparkles size={13} aria-hidden="true" /> {upNext?.status === "live" ? "Happening now" : "Up next"}
            </p>
            {upNext ? (
              <div className="relative mt-3">
                <p className="text-base font-semibold leading-snug">{upNext.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <Clock size={12} aria-hidden="true" />
                  {new Date(upNext.startTime).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(upNext.startTime)}
                  <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">{upNext.status === "live" ? "Live" : untilLabel(upNext.startTime)}</span>
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <JoinButton meeting={upNext} size="sm" />
                  <button type="button" onClick={() => onOpen(upNext.id)} className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/25">
                    Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative mt-3">
                <p className="text-base font-semibold">You're all caught up</p>
                <p className="mt-1 text-xs text-white/70">No upcoming meetings in {cursor.toLocaleDateString([], { month: "long" })}.</p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-[0_18px_50px_-24px_rgba(115,0,66,0.3)]">
            <div className="flex items-center gap-4 border-b border-gray-100 bg-gradient-to-r from-[#fdf2f8] to-white px-5 py-4">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#730042] to-[#CD166E] text-white shadow-lg shadow-[#730042]/30">
                <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-white/80">{selectedDate.toLocaleDateString([], { month: "short" })}</span>
                <span className="mt-0.5 text-2xl font-bold leading-none">{selectedDate.getDate()}</span>
              </div>
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900">
                  {selectedDate.toLocaleDateString([], { weekday: "long" })}
                  {selected === todayKey && <span className="rounded-full bg-[#730042] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Today</span>}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  <Video size={12} aria-hidden="true" />
                  {selectedList.length === 0 ? "Nothing scheduled" : `${selectedList.length} meeting${selectedList.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            <div className="p-5">
              {selectedList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50">
                  <Empty icon={CalendarX2} title="No meetings on this day" hint="Pick another day, or schedule something new." />
                </div>
              ) : (
                <ol className="relative ml-2 space-y-5 border-l-2 border-dashed border-[#730042]/20 pl-5">
                  {selectedList.map((m) => (
                    <li key={m.id} className="relative">
                      <span className={cx("absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white", DOT[m.status] || DOT.scheduled)} />
                      <p className="mb-1.5 text-xs font-bold text-[#730042]">{fmtTime(m.startTime)}</p>
                      <MeetingCard meeting={m} onOpen={onOpen} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}