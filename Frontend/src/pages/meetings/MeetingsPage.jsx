import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Zap, CalendarClock, Settings2, Radio } from "lucide-react";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useMeetings } from "../../auth/server-state/meeting/meeting.hook";
import MeetingCard, { MeetingCardSkeleton } from "../../components/meeting/MeetingCard";
import MeetingDrawer from "../../components/meeting/MeetingDrawer";
import MeetingFormModal from "../../components/meeting/MeetingFormModal";
import MeetingCalendar from "../../components/meeting/MeetingCalendar";
import MeetingAdminSettings from "../../components/meeting/MeetingAdminSettings";
import DiscoverTab from "../../components/meeting/DiscoverTab";
import InsightsTab from "../../components/meeting/InsightsTab";
import MyActionsTab from "../../components/meeting/MyActionsTab";
import { Btn, Tabs, TabPanel, Empty, ErrorNote } from "../../components/meeting/ui";
import { cx } from "../../components/meeting/meetingClasses";
import { groupByDay } from "../../components/meeting/meetingUtils";
import "../../components/meeting/meetingA11y.css";

const HOUR = 3600000;
const DAY = 24 * HOUR;
const ADMIN_ROLES = ["admin", "superadmin", "super_admin", "senior_admin"];

function MeetingList({ meetings, dir = "asc", onOpen, empty, showDate }) {
  const groups = useMemo(() => groupByDay(meetings, dir), [meetings, dir]);
  if (!groups.length) return empty;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{g.label}</h3>
          <div className="space-y-3">
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
  <div role="status" aria-label="Loading meetings" className="space-y-3">
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
    useMemo(() => ({ status: "scheduled,live", from: new Date(anchor - 6 * HOUR).toISOString(), to: new Date(anchor + 90 * DAY).toISOString(), hosting: hostingOnly, limit: 200 }), [anchor, hostingOnly]),
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

  const open = (id) => navigate(`/meetings/${id}`);
  const close = () => navigate("/meetings");

  const onSaved = (meeting, { instant } = {}) => {
    if (instant && meeting?.id) return open(meeting.id);
    if (meeting?.startTime) {
      setCalFocus({ date: meeting.startTime, nonce: Date.now() });
      changeTab("calendar");
    }
  };

  const tabs = [
    { id: "upcoming", label: "Upcoming", badge: needsReply },
    { id: "calendar", label: "Calendar" },
    { id: "discover", label: "Discover" },
    { id: "past", label: "Past" },
    { id: "actions", label: "My action items" },
    { id: "insights", label: "Insights" },
  ];
  const showHostFilter = tab === "upcoming" || tab === "past";
  const q = tab === "upcoming" ? upcomingQ : pastQ;

  return (
    <div className="mtg-root mx-auto max-w-5xl px-3 py-4 sm:px-4 md:p-6">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Meetings</h1>
          <p className="mt-0.5 text-sm text-gray-600">Schedule meetings, track RSVPs, notes and action items in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Btn variant="secondary" onClick={() => setAdminOpen(true)} aria-label="Meeting settings for the organisation">
              <Settings2 size={16} aria-hidden="true" /> <span className="hidden sm:inline">Settings</span>
            </Btn>
          )}
          <Btn variant="secondary" className="flex-1 sm:flex-none" onClick={() => setForm({ mode: "instant" })}>
            <Zap size={16} aria-hidden="true" /> Meet now
          </Btn>
          <Btn className="flex-1 sm:flex-none" onClick={() => setForm({ mode: "create" })}>
            <Plus size={16} aria-hidden="true" /> Schedule meeting
          </Btn>
        </div>
      </header>

      <div className="mb-5 flex flex-col gap-2 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <Tabs tabs={tabs} value={tab} onChange={changeTab} label="Meetings views" idPrefix="mt" className="border-b-0" />
        {showHostFilter && (
          <button
            type="button"
            aria-pressed={hostingOnly}
            onClick={() => setHostingOnly((v) => !v)}
            className={cx(
              "mb-2 inline-flex min-h-9 shrink-0 items-center gap-2 self-start rounded-full border px-3 text-sm transition-colors sm:mb-1",
              hostingOnly ? "border-[#730042] bg-[#730042]/10 text-[#730042]" : "border-gray-300 text-gray-700 hover:bg-gray-50",
            )}
          >
            Hosted by me
          </button>
        )}
      </div>

      <TabPanel id="upcoming" idPrefix="mt" active={tab === "upcoming"}>
        {q.isLoading && <ListSkeleton />}
        {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
        {!q.isLoading && !q.isError && (
          <div className="space-y-8">
            {live.length > 0 && (
              <section aria-label="Live now">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                  <Radio size={15} aria-hidden="true" /> Live now
                </h3>
                <div className="space-y-3">
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
                    title={hostingOnly ? "You're not hosting anything upcoming" : "Nothing scheduled"}
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
          </div>
        )}
      </TabPanel>

      <TabPanel id="past" idPrefix="mt" active={tab === "past"}>
        {q.isLoading && <ListSkeleton />}
        {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}
        {!q.isLoading && !q.isError && (
          <MeetingList
            meetings={pastQ.data || []}
            dir="desc"
            onOpen={open}
            showDate
            empty={<EmptyBox icon={CalendarClock} title="No past meetings" hint="Meetings from the last 90 days show up here." />}
          />
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

      <MeetingDrawer id={openId} onClose={close} onEdit={(meeting) => setForm({ mode: "edit", meeting })} />

      {form && <MeetingFormModal mode={form.mode} meeting={form.meeting} onClose={() => setForm(null)} onSaved={onSaved} />}
      {adminOpen && <MeetingAdminSettings onClose={() => setAdminOpen(false)} />}
    </div>
  );
}
