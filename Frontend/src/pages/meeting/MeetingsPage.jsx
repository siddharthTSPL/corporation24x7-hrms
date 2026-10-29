import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus, Zap, CalendarX2 } from "lucide-react";
import toast from "react-hot-toast";
import useCall from "../../realtime/useCall";
import { useMeetings } from "../../auth/server-state/meeting/meeting.hook";
import MeetingCard from "../../components/meeting/MeetingCard";
import MeetingDrawer from "../../components/meeting/MeetingDrawer";
import MeetingFormModal from "../../components/meeting/MeetingFormModal";
import DiscoverTab from "../../components/meeting/DiscoverTab";
import MyActionsTab from "../../components/meeting/MyActionsTab";
import InsightsTab from "../../components/meeting/InsightsTab";
import { Btn, Empty, Spinner, ErrorNote, Tabs } from "../../components/meeting/ui";
import { addDays, dayLabel, fmtDate, groupByDay, startOfDay, errMsg } from "../../components/meeting/meetingUtils";

function MeetingList({ query, onOpen, dir = "asc", empty }) {
  if (query.isLoading) return <Spinner />;
  if (query.isError) return <ErrorNote error={query.error} retry={query.refetch} />;
  const groups = groupByDay(query.data, dir);
  if (!groups.length) return empty;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-gray-900">
            {g.label}
            {["Today", "Tomorrow", "Yesterday"].includes(g.label) && <span className="text-xs font-normal text-gray-500">{fmtDate(g.key)}</span>}
          </h3>
          <div className="space-y-2">
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
  const [tab, setTab] = useState("upcoming");
  const [form, setForm] = useState(null); // { mode, meeting? }
  const [params, setParams] = useSearchParams();
  const openId = params.get("meeting"); // deep link: /meetings?meeting=<id>
  const { joinMeeting } = useCall();

  // Fixed anchors so query keys stay stable between renders
  const range = useMemo(() => {
    const today = startOfDay();
    return { from: today.toISOString(), to: addDays(today, 60).toISOString(), pastFrom: addDays(today, -60).toISOString(), now: new Date().toISOString() };
  }, []);

  const upcoming = useMeetings({ from: range.from, to: range.to, status: "scheduled,live", limit: 200 }, tab === "upcoming");
  const hosting = useMeetings({ from: range.from, to: range.to, status: "scheduled,live", hosting: true, limit: 200 }, tab === "hosting");
  const past = useMeetings({ from: range.pastFrom, to: range.now, status: "ended", limit: 200 }, tab === "past");

  const open = (id) => setParams((p) => { const n = new URLSearchParams(p); n.set("meeting", id); return n; }, { replace: true });
  const close = () => setParams((p) => { const n = new URLSearchParams(p); n.delete("meeting"); return n; }, { replace: true });

  const needReply = (upcoming.data || []).filter((m) => !m.isHost && m.myRsvp === "invited").length;

  const onSaved = async (meeting, { instant } = {}) => {
    if (!meeting) return;
    if (instant) {
      try {
        await joinMeeting(meeting.id, { media: meeting.media });
      } catch (e) {
        toast.error(errMsg(e));
      }
    }
  };

  const noMeetings = (title, hint) => (
    <Empty
      icon={CalendarX2}
      title={title}
      hint={hint}
      action={
        <Btn onClick={() => setForm({ mode: "create" })}>
          <CalendarPlus size={15} /> Schedule a meeting
        </Btn>
      }
    />
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500">{dayLabel(new Date())}, {fmtDate(new Date(), { day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setForm({ mode: "instant" })}>
            <Zap size={15} /> Start now
          </Btn>
          <Btn onClick={() => setForm({ mode: "create" })}>
            <CalendarPlus size={15} /> Schedule
          </Btn>
        </div>
      </header>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "upcoming", label: "Upcoming", badge: needReply },
          { id: "hosting", label: "Hosting" },
          { id: "past", label: "Past" },
          { id: "discover", label: "Discover" },
          { id: "actions", label: "My action items" },
          { id: "insights", label: "Insights" },
        ]}
      />

      {tab === "upcoming" && (
        <>
          {needReply > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">You have {needReply} invitation{needReply > 1 ? "s" : ""} waiting for a reply.</p>}
          <MeetingList query={upcoming} onOpen={open} empty={noMeetings("Nothing scheduled", "Your next 60 days are clear.")} />
        </>
      )}
      {tab === "hosting" && <MeetingList query={hosting} onOpen={open} empty={noMeetings("You're not hosting anything", "Meetings you schedule will be listed here.")} />}
      {tab === "past" && <MeetingList query={past} onOpen={open} dir="desc" empty={<Empty icon={CalendarX2} title="No past meetings" hint="Meetings from the last 60 days appear here, with notes and feedback." />} />}
      {tab === "discover" && <DiscoverTab onOpen={open} />}
      {tab === "actions" && <MyActionsTab onOpen={open} />}
      {tab === "insights" && <InsightsTab />}

      {openId && <MeetingDrawer key={openId} id={openId} onClose={close} onEdit={(m) => setForm({ mode: "edit", meeting: m })} />}
      {form && <MeetingFormModal key={form.meeting?.id || form.mode} mode={form.mode} meeting={form.meeting} onClose={() => setForm(null)} onSaved={onSaved} />}
    </div>
  );
}
