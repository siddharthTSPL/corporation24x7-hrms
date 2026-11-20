import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Zap, CalendarClock } from "lucide-react";
import { useMeetings } from "../../auth/server-state/meeting/meeting.hook";
import MeetingCard from "../../components/meeting/MeetingCard";
import MeetingDrawer from "../../components/meeting/MeetingDrawer";
import MeetingFormModal from "../../components/meeting/MeetingFormModal";
import MeetingCalendar from "../../components/meeting/MeetingCalendar";
import DiscoverTab from "../../components/meeting/DiscoverTab";
import InsightsTab from "../../components/meeting/InsightsTab";
import MyActionsTab from "../../components/meeting/MyActionsTab";
import { Btn, Tabs, Empty, Spinner, ErrorNote, cx } from "../../components/meeting/ui";
import { groupByDay } from "../../components/meeting/meetingUtils";

const HOUR = 3600000;
const DAY = 24 * HOUR;

// Everything on this page comes from the /meetings API (list, calendar, discover, insights,
// action items, drawer tabs). Joining a live meeting is handled by <JoinButton/>, which first asks
// GET /meetings/:id/join-info whether the room is open and only then enters it.
function MeetingList({ meetings, dir = "asc", onOpen, empty }) {
  const groups = useMemo(() => groupByDay(meetings, dir), [meetings, dir]);
  if (!groups.length) return empty;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">{g.label}</h3>
          <div className="space-y-3">
            {g.items.map((m) => (
              <MeetingCard key={m.id} meeting={m} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { id: openId } = useParams();

  const [tab, setTab] = useState("upcoming");
  const [hostingOnly, setHostingOnly] = useState(false);
  const [form, setForm] = useState(null); // { mode: "create" | "instant" | "edit", meeting? }
  const [calFocus, setCalFocus] = useState(null);

  const upcomingQ = useMeetings(
    useMemo(() => ({ status: "scheduled,live", from: new Date(Date.now() - 6 * HOUR).toISOString(), to: new Date(Date.now() + 90 * DAY).toISOString(), hosting: hostingOnly, limit: 200 }), [hostingOnly]),
    tab === "upcoming",
  );
  const pastQ = useMeetings(
    useMemo(() => ({ status: "ended,cancelled", from: new Date(Date.now() - 90 * DAY).toISOString(), to: new Date().toISOString(), hosting: hostingOnly, limit: 200 }), [hostingOnly]),
    tab === "past",
  );

  const upcoming = upcomingQ.data || [];
  const live = upcoming.filter((m) => m.status === "live");
  const scheduled = upcoming.filter((m) => m.status !== "live");
  const needsReply = upcoming.filter((m) => !m.isHost && m.status === "scheduled" && m.myRsvp === "invited").length;

  const open = (id) => navigate(`/meetings/${id}`);
  const close = () => navigate("/meetings");

  const onSaved = (meeting, { instant } = {}) => {
    if (instant && meeting?.id) return open(meeting.id); // instant meeting: open it, Join is right there
    if (meeting?.startTime) {
      // Scheduled/rescheduled: show it on the calendar straight away.
      setCalFocus({ date: meeting.startTime, nonce: Date.now() });
      setTab("calendar");
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
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="mt-0.5 text-sm text-gray-500">Schedule meetings, track RSVPs, notes and action items in one place.</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setForm({ mode: "instant" })}>
            <Zap size={16} /> Meet now
          </Btn>
          <Btn onClick={() => setForm({ mode: "create" })}>
            <Plus size={16} /> Schedule meeting
          </Btn>
        </div>
      </header>

      <div className="mb-5 flex items-center justify-between gap-3 border-b border-gray-200">
        <Tabs tabs={tabs} value={tab} onChange={setTab} className="border-b-0" />
        {showHostFilter && (
          <label className="mb-1 flex shrink-0 cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={hostingOnly} onChange={(e) => setHostingOnly(e.target.checked)} className="accent-[#730042]" />
            Hosted by me
          </label>
        )}
      </div>

      {(tab === "upcoming" || tab === "past") && (
        <>
          {q.isLoading && <Spinner />}
          {q.isError && <ErrorNote error={q.error} retry={q.refetch} />}

          {tab === "upcoming" && !q.isLoading && !q.isError && (
            <div className="space-y-8">
              {live.length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" /> Live now
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
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white">
                      <Empty
                        icon={CalendarClock}
                        title="Nothing scheduled"
                        hint="Schedule a meeting and everyone you invite gets it on their calendar."
                        action={<Btn onClick={() => setForm({ mode: "create" })}><Plus size={16} /> Schedule meeting</Btn>}
                      />
                    </div>
                  )
                }
              />
            </div>
          )}

          {tab === "past" && !q.isLoading && !q.isError && (
            <MeetingList
              meetings={pastQ.data || []}
              dir="desc"
              onOpen={open}
              empty={<div className="rounded-xl border border-dashed border-gray-200 bg-white"><Empty icon={CalendarClock} title="No past meetings" hint="Meetings from the last 90 days show up here." /></div>}
            />
          )}
        </>
      )}

      {tab === "calendar" && <MeetingCalendar onOpen={open} focus={calFocus} />}
      {tab === "discover" && <DiscoverTab onOpen={open} />}
      {tab === "actions" && <MyActionsTab onOpen={open} />}
      {tab === "insights" && <InsightsTab />}

      <MeetingDrawer id={openId} onClose={close} onEdit={(meeting) => setForm({ mode: "edit", meeting })} />

      {form && <MeetingFormModal mode={form.mode} meeting={form.meeting} onClose={() => setForm(null)} onSaved={onSaved} />}
    </div>
  );
}
