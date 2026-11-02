import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Video, CalendarClock, CalendarDays, Compass, History, ListChecks, BarChart3, Settings2, ChevronLeft, ChevronRight, Radio } from "lucide-react";
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
import { groupByDay, useNow, startOfDay, fmtTime, fmtDate } from "../../components/meeting/meetingUtils";
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

/* ---------- Up next banner ---------- */
function UpNext({ meeting: m, now, live, onOpen }) {
  if (!m) return null;
  return (
    <div className={cx("flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4", live ? "border-red-200 bg-red-50/40" : "border-gray-200")}>
      <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", live ? "bg-red-600 text-white" : "bg-[#730042]/10 text-[#730042]")}>
        {live ? <Radio size={18} aria-hidden="true" /> : <Video size={18} aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{live ? "Happening now" : "Up next"}</p>
        <button type="button" onClick={() => onOpen(m.id)} className="block max-w-full truncate text-left text-sm font-semibold text-gray-900 hover:underline">
          {m.title}
        </button>
        <p className="text-xs text-gray-600">
          {fmtDate(m.startTime)}, {fmtTime(m.startTime)}
          {!live && ` · ${untilLabel(m.startTime, now)}`}
        </p>
      </div>
      <JoinButton meeting={m} size="sm" />
    </div>
  );
}

/* ---------- Lists ---------- */
function MeetingList({ meetings, dir = "asc", onOpen, empty, showDate }) {
  const groups = useMemo(() => groupByDay(meetings, dir), [meetings, dir]);
  if (!groups.length) return empty;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-gray-900">
            {g.label}
            <span className="text-xs font-normal text-gray-500">{fmtDate(g.key, { day: "numeric", month: "short" })}</span>
          </h3>
          <div className="space-y-2">
            {g.items.map((m) => (
              <MeetingCard key={m.id} meeting={m} onOpen={onOpen} showDate={showDate} />
            ))}
          </div>
        </section>
      ))}
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

          <TabPanel id="past" idPrefix="mt" active={tab === "past"}>
            {q.isLoading && <ListSkeleton />}
            {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
            {!q.isLoading && !q.isError && (
              <MeetingList meetings={pastQ.data || []} dir="desc" onOpen={open} showDate empty={<EmptyBox icon={CalendarClock} title="No previous meetings" hint="Meetings from the last 90 days show up here." />} />
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
