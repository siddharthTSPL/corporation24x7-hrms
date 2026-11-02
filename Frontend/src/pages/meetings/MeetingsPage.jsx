import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Video, CalendarClock, CalendarDays, Compass, History, ListChecks, BarChart3, Settings2, ChevronLeft, ChevronRight, Radio, Search, Sun, CalendarRange, MessageSquareReply, CheckCircle2, XCircle, Timer, Crown } from "lucide-react";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useMeetings, useMeetingCalendar } from "../../auth/server-state/meeting/meeting.hook";
import MeetingCard, { MeetingCardSkeleton } from "../../components/meeting/MeetingCard";
import MeetingDrawer from "../../components/meeting/MeetingDrawer";
import MeetingFormModal from "../../components/meeting/MeetingFormModal";
import MeetingCalendar from "../../components/meeting/MeetingCalendar";
import MeetingAdminSettings from "../../components/meeting/MeetingAdminSettings";
import DiscoverTab from "../../components/meeting/DiscoverTab";
import InsightsTab from "../../components/meeting/InsightsTab";
import MyActionsTab from "../../components/meeting/MyActionsTab";
import JoinButton from "../../components/meeting/JoinButton";
import { Btn, TabPanel, Empty, ErrorNote } from "../../components/meeting/ui";
import { cx } from "../../components/meeting/meetingClasses";
import { groupByDay, useNow, startOfDay, fmtTime, fmtDate, fmtDuration, minutesBetween } from "../../components/meeting/meetingUtils";
import "../../components/meeting/meetingA11y.css";

const HOUR = 3600000;
const DAY = 24 * HOUR;
const ADMIN_ROLES = ["admin", "superadmin", "super_admin", "senior_admin"];

const VIEWS = [
  { id: "upcoming", label: "Upcoming", icon: CalendarClock, sub: "Live and upcoming meetings, grouped by day." },
  { id: "calendar", label: "Calendar", icon: CalendarDays, sub: "Your meetings for the month." },
  { id: "discover", label: "Discover", icon: Compass, sub: "Meetings opened up to the whole organisation." },
  { id: "past", label: "Previous", icon: History, sub: "Meetings from the last 90 days." },
  { id: "actions", label: "Action items", icon: ListChecks, sub: "Tasks assigned to you in meetings." },
  { id: "insights", label: "Insights", icon: BarChart3, sub: "Your meeting load over the last 30 days." },
];

const pad = (n) => String(n).padStart(2, "0");
const dayKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const untilLabel = (start, now) => {
  const mins = Math.round((new Date(start).getTime() - now) / 60000);
  if (mins <= 0) return "starting now";
  if (mins < 60) return `in ${mins} min`;
  if (mins < 24 * 60) return `in ${Math.round(mins / 60)} h`;
  const days = Math.round(mins / (24 * 60));
  return days === 1 ? "tomorrow" : `in ${days} days`;
};

/* ---------- Left navigation ---------- */
function SideNav({ value, onChange, badges }) {
  const move = (e, i) => {
    const last = VIEWS.length - 1;
    const next = { ArrowDown: i === last ? 0 : i + 1, ArrowUp: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(VIEWS[next].id);
    document.getElementById(`mt-${VIEWS[next].id}`)?.focus();
  };
  return (
    <nav aria-label="Meetings views">
      <div role="tablist" aria-orientation="vertical" className="space-y-0.5">
        {VIEWS.map((v, i) => {
          const Icon = v.icon;
          const active = value === v.id;
          return (
            <button
              key={v.id}
              id={`mt-${v.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`mtpanel-${v.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(v.id)}
              onKeyDown={(e) => move(e, i)}
              className={cx(
                "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active ? "bg-[#730042]/10 text-[#730042]" : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="flex-1 text-left">{v.label}</span>
              {badges[v.id] > 0 && (
                <span className="rounded-full bg-[#730042] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {badges[v.id]}
                  <span className="sr-only"> awaiting your reply</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function BottomNav({ value, onChange, badges }) {
  return (
    <nav aria-label="Meetings views" className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white md:hidden">
      <div role="tablist" className="mtg-safe-b mx-auto grid max-w-xl grid-cols-6 !pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = value === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`mtpanel-${v.id}`}
              onClick={() => onChange(v.id)}
              className={cx("relative flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px] font-medium", active ? "text-[#730042]" : "text-gray-500")}
            >
              <Icon size={20} aria-hidden="true" />
              {v.label.split(" ")[0]}
              {badges[v.id] > 0 && <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-[#CD166E]" aria-label="Awaiting your reply" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- Mini month calendar (sidebar) ---------- */
function MiniCalendar({ onPick }) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const q = useMeetingCalendar(monthKeyOf(cursor));
  const todayKey = dayKeyOf(new Date());

  const cells = useMemo(() => {
    const lead = cursor.getDay();
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return out;
  }, [cursor]);

  const move = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900" aria-live="polite">
          {cursor.toLocaleDateString([], { month: "long", year: "numeric" })}
        </p>
        <div className="flex">
          <button type="button" aria-label="Previous month" onClick={() => move(-1)} className="flex h-7 w-7 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => move(1)} className="flex h-7 w-7 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100">
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-gray-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const key = dayKeyOf(d);
          const n = q.data?.days?.[key]?.length || 0;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(d)}
              aria-label={`${d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}${n ? `, ${n} meeting${n > 1 ? "s" : ""}` : ""}`}
              className={cx("relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors", isToday ? "bg-[#730042] font-semibold text-white" : "text-gray-800 hover:bg-gray-100")}
            >
              {d.getDate()}
              {n > 0 && <span aria-hidden="true" className={cx("absolute bottom-0.5 h-1 w-1 rounded-full", isToday ? "bg-white" : "bg-[#CD166E]")} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Up next hero ---------- */
const countdown = (start, now) => {
  const mins = Math.max(0, Math.round((new Date(start).getTime() - now) / 60000));
  if (mins < 60) return [mins, mins === 1 ? "minute" : "minutes"];
  if (mins < 24 * 60) return [Math.round(mins / 60), "hours"];
  const d = Math.round(mins / (24 * 60));
  return [d, d === 1 ? "day" : "days"];
};

function UpNext({ meeting: m, now, live, onOpen }) {
  if (!m) return null;
  const [n, unit] = countdown(m.startTime, now);
  return (
    <section aria-label={live ? "Happening now" : "Up next"} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#3d0023] via-[#730042] to-[#CD166E] p-5 text-white shadow-lg shadow-[#730042]/25 sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#ff7ac0]/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 flex-1 basis-64">
          <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", live ? "bg-red-500" : "bg-white/15 backdrop-blur")}>
            {live ? <Radio size={12} aria-hidden="true" /> : <Video size={12} aria-hidden="true" />} {live ? "Happening now" : "Up next"}
          </span>
          <button type="button" onClick={() => onOpen(m.id)} className="mt-3 block max-w-full truncate text-left text-xl font-semibold leading-snug hover:underline">
            {m.title}
          </button>
          <p className="mt-1 text-sm text-white/75">
            {fmtDate(m.startTime, { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(m.startTime)} – {fmtTime(m.endTime)}
          </p>
          <p className="mt-0.5 text-sm text-white/60">{m.isHost ? "You're hosting" : m.host?.name ? `Hosted by ${m.host.name}` : ""}{m.attendeeCount ? ` · ${m.attendeeCount} invited` : ""}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <JoinButton meeting={m} size="sm" />
            <button type="button" onClick={() => onOpen(m.id)} className="min-h-9 rounded-lg bg-white/15 px-4 text-xs font-semibold ring-1 ring-white/25 transition hover:bg-white/25 sm:min-h-8">
              View details
            </button>
          </div>
        </div>
        {!live && (
          <div className="flex min-w-24 flex-col items-center rounded-2xl bg-white/12 px-5 py-3 ring-1 ring-white/20 backdrop-blur" aria-label={`Starts in ${n} ${unit}`}>
            <span className="text-3xl font-bold leading-none">{n}</span>
            <span className="mt-1 text-xs text-white/70">{unit} to go</span>
          </div>
        )}
      </div>
    </section>
  );
}

const Stat = ({ icon: Icon, label, value, tint }) => (
  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
    <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tint)}>
      <Icon size={18} aria-hidden="true" />
    </span>
    <div>
      <p className="text-xl font-semibold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-600">{label}</p>
    </div>
  </div>
);

/* ---------- Lists ---------- */
function DayHeader({ group }) {
  const d = new Date(group.key);
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#730042]/10 leading-none text-[#730042]">
        <span className="text-[11px] font-medium">{d.toLocaleDateString([], { month: "short" })}</span>
        <span className="mt-0.5 text-lg font-bold">{d.getDate()}</span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{group.label}</h3>
        <p className="text-xs text-gray-500">
          {d.toLocaleDateString([], { weekday: "long" })} · {group.items.length} meeting{group.items.length > 1 ? "s" : ""}
        </p>
      </div>
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
    </div>
  );
}

function MeetingList({ meetings, dir = "asc", onOpen, empty, showDate, monthHeaders }) {
  const groups = useMemo(() => groupByDay(meetings, dir), [meetings, dir]);
  if (!groups.length) return empty;
  let lastMonth = "";
  return (
    <div className="space-y-7">
      {groups.map((g) => {
        const mk = new Date(g.key).toLocaleDateString([], { month: "long", year: "numeric" });
        const head = monthHeaders && mk !== lastMonth;
        lastMonth = mk;
        return (
          <div key={g.key} className="space-y-7">
            {head && <h2 className="border-b border-gray-200 pb-2 text-sm font-semibold text-[#730042]">{mk}</h2>}
            <section aria-label={g.label}>
              <DayHeader group={g} />
              <div className="space-y-3">
                {g.items.map((m) => (
                  <MeetingCard key={m.id} meeting={m} onOpen={onOpen} showDate={showDate} />
                ))}
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}

const ListSkeleton = () => (
  <div role="status" aria-label="Loading meetings" className="space-y-2">
    {[0, 1, 2].map((i) => (
      <MeetingCardSkeleton key={i} />
    ))}
  </div>
);

const EmptyBox = (props) => (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white">
    <Empty {...props} />
  </div>
);

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { id: openId } = useParams();
  const { data: auth } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(auth?.role);
  const now = useNow(30000);

  const [tab, setTab] = useState("upcoming");
  const [anchor, setAnchor] = useState(() => Date.now());
  const [hostingOnly, setHostingOnly] = useState(false);
  const [pastText, setPastText] = useState("");
  const [pastFilter, setPastFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [calFocus, setCalFocus] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  const changeTab = (next) => {
    setTab(next);
    setAnchor(Date.now());
  };

  const upcomingQ = useMeetings(
    useMemo(() => ({ status: "scheduled,live", from: new Date(anchor - 6 * HOUR).toISOString(), to: new Date(anchor + 90 * DAY).toISOString(), hosting: hostingOnly && tab === "upcoming", limit: 200 }), [anchor, hostingOnly, tab]),
    tab === "upcoming",
  );
  const pastQ = useMeetings(
    useMemo(() => ({ status: "ended,cancelled", from: new Date(anchor - 90 * DAY).toISOString(), to: new Date(anchor).toISOString(), hosting: hostingOnly, limit: 200 }), [anchor, hostingOnly]),
    tab === "past",
  );

  const upcoming = upcomingQ.data || [];
  const live = upcoming.filter((m) => m.status === "live");
  const scheduled = upcoming.filter((m) => m.status !== "live");
  const needsReply = upcoming.filter((m) => !m.isHost && m.status === "scheduled" && m.myRsvp === "invited").length;
  const next = useMemo(() => scheduled.filter((m) => new Date(m.startTime).getTime() >= now - 5 * 60000).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0], [scheduled, now]);
  const banner = live[0] || next;
  const todayStart = startOfDay(now).getTime();
  const todayCount = upcoming.filter((m) => startOfDay(m.startTime).getTime() === todayStart).length;
  const weekCount = upcoming.filter((m) => new Date(m.startTime).getTime() < todayStart + 7 * DAY).length;

  const past = pastQ.data || [];
  const pastShown = useMemo(() => {
    const t = pastText.trim().toLowerCase();
    return past.filter((m) => (pastFilter === "all" || m.status === pastFilter) && (!t || m.title?.toLowerCase().includes(t)));
  }, [past, pastText, pastFilter]);
  const pastEnded = past.filter((m) => m.status === "ended");
  const pastHours = Math.round((pastEnded.reduce((n, m) => n + minutesBetween(m.startTime, m.endTime), 0) / 60) * 10) / 10;

  const open = (id) => navigate(`/meetings/${id}`);
  const close = () => navigate("/meetings");
  const goDay = (date) => {
    setCalFocus({ date, nonce: Date.now() });
    changeTab("calendar");
  };
  const onSaved = (meeting, { instant } = {}) => {
    if (instant && meeting?.id) return open(meeting.id);
    if (meeting?.startTime) goDay(meeting.startTime);
  };

  const view = VIEWS.find((v) => v.id === tab);
  const showHostFilter = tab === "upcoming" || tab === "past";
  const q = tab === "upcoming" ? upcomingQ : pastQ;
  const badges = { upcoming: needsReply };

  return (
    <div className="mtg-root min-h-full bg-[#f5f6f8]">
      <div className="mx-auto flex max-w-[1240px] gap-6 px-3 pb-24 pt-4 sm:px-4 md:p-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-6 space-y-4">
            <div className="space-y-2">
              <Btn className="w-full" onClick={() => setForm({ mode: "create" })}>
                <Plus size={16} aria-hidden="true" /> Schedule meeting
              </Btn>
              <Btn variant="secondary" className="w-full" onClick={() => setForm({ mode: "instant" })}>
                <Video size={16} aria-hidden="true" /> Meet now
              </Btn>
            </div>
            <SideNav value={tab} onChange={changeTab} badges={badges} />
            <MiniCalendar onPick={goDay} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{view.label === "Upcoming" ? "Meetings" : view.label}</h1>
              <p className="mt-0.5 text-sm text-gray-600">{view.sub}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-2 md:hidden">
                <Btn variant="secondary" size="icon" aria-label="Meet now" onClick={() => setForm({ mode: "instant" })}>
                  <Video size={16} aria-hidden="true" />
                </Btn>
                <Btn onClick={() => setForm({ mode: "create" })}>
                  <Plus size={16} aria-hidden="true" /> Schedule
                </Btn>
              </div>
              {showHostFilter && (
                <button
                  type="button"
                  aria-pressed={hostingOnly}
                  onClick={() => setHostingOnly((v) => !v)}
                  className={cx("hidden min-h-10 items-center rounded-lg border px-3 text-sm sm:inline-flex", hostingOnly ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")}
                >
                  Hosted by me
                </button>
              )}
              {isAdmin && (
                <Btn variant="secondary" size="icon" aria-label="Meeting settings for the organisation" onClick={() => setAdminOpen(true)}>
                  <Settings2 size={16} aria-hidden="true" />
                </Btn>
              )}
            </div>
          </header>

          <TabPanel id="upcoming" idPrefix="mt" active={tab === "upcoming"} className="space-y-6">
            {!q.isLoading && !q.isError && <UpNext meeting={banner} now={now} live={!!live[0]} onOpen={open} />}
            {!q.isLoading && !q.isError && upcoming.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat icon={Sun} label="Today" value={todayCount} tint="bg-amber-50 text-amber-600" />
                <Stat icon={CalendarRange} label="Next 7 days" value={weekCount} tint="bg-[#730042]/10 text-[#730042]" />
                <Stat icon={MessageSquareReply} label="Awaiting your reply" value={needsReply} tint="bg-sky-50 text-sky-600" />
              </div>
            )}
            {q.isLoading && <ListSkeleton />}
            {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
            {!q.isLoading && !q.isError && (
              <>
                {live.length > 0 && (
                  <section aria-label="Live now">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                      <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-red-600 motion-reduce:animate-none" /> Live now
                    </h3>
                    <div className="space-y-2">
                      {live.map((m) => (
                        <MeetingCard key={m.id} meeting={m} onOpen={open} />
                      ))}
                    </div>
                  </section>
                )}
                <MeetingList
                  meetings={scheduled}
                  onOpen={open}
                  empty={
                    live.length === 0 && (
                      <EmptyBox
                        icon={CalendarClock}
                        title={hostingOnly ? "You're not hosting anything upcoming" : "No upcoming meetings"}
                        hint={hostingOnly ? "Turn off the filter to see meetings you're invited to." : "Schedule a meeting and everyone you invite gets it on their calendar."}
                        action={
                          <Btn onClick={() => setForm({ mode: "create" })}>
                            <Plus size={16} aria-hidden="true" /> Schedule meeting
                          </Btn>
                        }
                      />
                    )
                  }
                />
              </>
            )}
          </TabPanel>

          <TabPanel id="past" idPrefix="mt" active={tab === "past"} className="space-y-5">
            {q.isLoading && <ListSkeleton />}
            {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
            {!q.isLoading && !q.isError && (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat icon={CheckCircle2} label="Completed" value={pastEnded.length} tint="bg-emerald-50 text-emerald-600" />
                  <Stat icon={XCircle} label="Cancelled" value={past.length - pastEnded.length} tint="bg-red-50 text-red-500" />
                  <Stat icon={Timer} label="Hours in meetings" value={`${pastHours}h`} tint="bg-sky-50 text-sky-600" />
                  <Stat icon={Crown} label="Hosted by you" value={past.filter((m) => m.isHost).length} tint="bg-[#730042]/10 text-[#730042]" />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-56 flex-1">
                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      aria-label="Search previous meetings"
                      value={pastText}
                      onChange={(e) => setPastText(e.target.value)}
                      placeholder="Search by title"
                      className="min-h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-[#730042] focus:outline-none focus:ring-2 focus:ring-[#730042]/25"
                    />
                  </div>
                  <div role="group" aria-label="Filter by status" className="inline-flex gap-0.5 rounded-lg bg-gray-200/70 p-0.5">
                    {[["all", "All"], ["ended", "Completed"], ["cancelled", "Cancelled"]].map(([v, label]) => (
                      <button key={v} type="button" aria-pressed={pastFilter === v} onClick={() => setPastFilter(v)} className={cx("min-h-9 rounded-md px-3.5 text-sm transition-colors", pastFilter === v ? "bg-white font-semibold text-[#730042] shadow-sm" : "text-gray-600 hover:text-gray-900")}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <MeetingList
                  meetings={pastShown}
                  dir="desc"
                  onOpen={open}
                  showDate
                  monthHeaders
                  empty={<EmptyBox icon={CalendarClock} title={past.length ? "No meetings match" : "No previous meetings"} hint={past.length ? "Try a different search or filter." : "Meetings from the last 90 days show up here."} />}
                />
              </>
            )}
          </TabPanel>

          <TabPanel id="calendar" idPrefix="mt" active={tab === "calendar"}>
            <MeetingCalendar onOpen={open} focus={calFocus} />
          </TabPanel>
          <TabPanel id="discover" idPrefix="mt" active={tab === "discover"}>
            <DiscoverTab onOpen={open} />
          </TabPanel>
          <TabPanel id="actions" idPrefix="mt" active={tab === "actions"}>
            <MyActionsTab onOpen={open} />
          </TabPanel>
          <TabPanel id="insights" idPrefix="mt" active={tab === "insights"}>
            <InsightsTab />
          </TabPanel>
        </main>
      </div>

      <BottomNav value={tab} onChange={changeTab} badges={badges} />

      <MeetingDrawer id={openId} onClose={close} onEdit={(meeting) => setForm({ mode: "edit", meeting })} />
      {form && <MeetingFormModal mode={form.mode} meeting={form.meeting} onClose={() => setForm(null)} onSaved={onSaved} />}
      {adminOpen && <MeetingAdminSettings onClose={() => setAdminOpen(false)} />}
    </div>
  );
}