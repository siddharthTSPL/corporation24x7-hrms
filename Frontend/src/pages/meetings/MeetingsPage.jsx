import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FaVideo, FaMicrophone, FaPlus, FaBolt, FaCalendarPlus, FaTimes, FaSearch,
  FaClock, FaUserFriends, FaCheck, FaQuestion, FaBan,
} from "react-icons/fa";
import {
  useMeetings, useCreateMeeting, useCancelMeeting, useRespondToMeeting,
  useEndMeeting, useDownloadMeetingIcs,
} from "../../auth/server-state/meeting/meeting.hook";
import { useCreateInstantMeeting } from "../../auth/server-state/meeting/meetingSpace.hook";
import { useDirectorySearch } from "../../auth/server-state/chat/chat.hook";
import useCall from "../../realtime/useCall";

const BRAND = "#730042";

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
const idOf = (m) => m.id || m._id;

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live now" },
  { key: "past", label: "Past" },
];

function statusOf(m) {
  if (m.status === "cancelled") return "cancelled";
  if (m.status === "live") return "live";
  if (m.status === "ended" || (m.endTime && new Date(m.endTime) < new Date() && m.status !== "live")) return "past";
  return "upcoming";
}

export default function MeetingsPage() {
  const [tab, setTab] = useState("upcoming");
  const [showCreate, setShowCreate] = useState(false);

  const params = useMemo(() => {
    const day = 86400000;
    if (tab === "past") return { from: new Date(Date.now() - 60 * day).toISOString(), to: new Date().toISOString(), limit: 100 };
    return { from: new Date(Date.now() - day).toISOString(), to: new Date(Date.now() + 90 * day).toISOString(), limit: 100 };
  }, [tab]);

  const { data: meetings = [], isLoading, isError, error, refetch } = useMeetings(params);
  const { joinMeeting, waiting, cancelWaiting, error: callError, clearError } = useCall();
  const instant = useCreateInstantMeeting();
  const cancel = useCancelMeeting();
  const respond = useRespondToMeeting();
  const end = useEndMeeting();
  const ics = useDownloadMeetingIcs();

  const visible = useMemo(() => {
    const list = meetings.filter((m) => {
      const s = statusOf(m);
      if (tab === "live") return s === "live";
      if (tab === "past") return s === "past" || s === "cancelled";
      return s === "upcoming" || s === "live";
    });
    return list.sort((a, b) => (tab === "past" ? new Date(b.startTime) - new Date(a.startTime) : new Date(a.startTime) - new Date(b.startTime)));
  }, [meetings, tab]);

  const join = async (m) => {
    try {
      await joinMeeting(idOf(m), { media: m.media || "video" });
    } catch (e) {
      if (e?.code === "TOO_EARLY") toast.error("This meeting hasn't opened yet.");
      else if (e?.code === "WAITING_FOR_HOST") toast("Waiting for the host to start…");
      else toast.error(e?.message || "Could not join the meeting");
    }
  };

  const startInstant = async () => {
    try {
      const res = await instant.mutateAsync({ title: "Instant meeting", media: "video" });
      const id = idOf(res.meeting || res);
      if (id) await joinMeeting(id, { media: "video" });
    } catch (e) {
      toast.error(e?.message || "Could not start an instant meeting");
    }
  };

  const act = (p, okMsg) => p.then(() => okMsg && toast.success(okMsg)).catch((e) => toast.error(e?.message || "Something went wrong"));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500">Schedule, join and manage video or audio meetings with your team.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={startInstant} disabled={instant.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
            style={{ borderColor: BRAND, color: BRAND }}>
            <FaBolt /> {instant.isPending ? "Starting…" : "Meet now"}
          </button>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: BRAND }}>
            <FaPlus /> New meeting
          </button>
        </div>
      </div>

      {waiting && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <span>Waiting for the host to start the meeting — you'll join automatically.</span>
          <button onClick={cancelWaiting} className="font-semibold underline">Cancel</button>
        </div>
      )}
      {callError && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <span>{typeof callError === "string" ? callError : callError.message || "Call error"}</span>
          <button onClick={clearError}><FaTimes /></button>
        </div>
      )}

      <div className="flex gap-1 border-b mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 ${tab === t.key ? "" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            style={tab === t.key ? { borderColor: BRAND, color: BRAND } : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500 text-sm py-10 text-center">Loading meetings…</p>}
      {isError && (
        <div className="text-center py-10">
          <p className="text-red-600 text-sm mb-2">{error?.message || "Failed to load meetings"}</p>
          <button onClick={() => refetch()} className="text-sm font-semibold underline">Retry</button>
        </div>
      )}
      {!isLoading && !isError && visible.length === 0 && (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <FaVideo className="mx-auto text-3xl text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700">No {tab} meetings</p>
          <p className="text-sm text-gray-500 mb-4">Schedule one or start an instant meeting.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: BRAND }}>
            Schedule a meeting
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {visible.map((m) => (
          <MeetingCard key={idOf(m)} m={m}
            onJoin={() => join(m)}
            onRsvp={(rsvp) => act(respond.mutateAsync({ id: idOf(m), rsvp }), "Response saved")}
            onCancel={() => window.confirm("Cancel this meeting?") && act(cancel.mutateAsync({ id: idOf(m), scope: "this" }), "Meeting cancelled")}
            onEnd={() => window.confirm("End this meeting for everyone?") && act(end.mutateAsync(idOf(m)), "Meeting ended")}
            onIcs={() => act(ics.mutateAsync(idOf(m)))}
          />
        ))}
      </div>

      {showCreate && <CreateMeetingModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function MeetingCard({ m, onJoin, onRsvp, onCancel, onEnd, onIcs }) {
  const s = statusOf(m);
  const isHost = m.isHost ?? m.amHost ?? false;
  const rsvp = m.myRsvp || m.rsvp;
  const Icon = m.media === "audio" ? FaMicrophone : FaVideo;
  const badge = { live: "bg-green-100 text-green-700", upcoming: "bg-blue-50 text-blue-700", past: "bg-gray-100 text-gray-600", cancelled: "bg-red-50 text-red-600" }[s];

  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl text-white shrink-0" style={{ background: BRAND }}>
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 truncate">{m.title || "Untitled meeting"}</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${badge}`}>{s === "live" ? "● Live" : s}</span>
          {m.recurrence && <span className="text-xs text-gray-500">↻ recurring</span>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
          <span className="inline-flex items-center gap-1.5"><FaClock /> {fmtDate(m.startTime)}, {fmtTime(m.startTime)}{m.endTime ? ` – ${fmtTime(m.endTime)}` : ""}</span>
          {(m.hostName || m.host?.name) && <span>Host: {m.hostName || m.host?.name}</span>}
          {(m.attendeeCount ?? m.attendees?.length) != null && (
            <span className="inline-flex items-center gap-1.5"><FaUserFriends /> {m.attendeeCount ?? m.attendees.length}</span>
          )}
        </div>
        {m.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{m.description}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {s !== "past" && s !== "cancelled" && !isHost && (
          <div className="inline-flex rounded-lg border overflow-hidden text-xs">
            {[["accepted", <FaCheck key="a" />, "Accept"], ["tentative", <FaQuestion key="t" />, "Maybe"], ["declined", <FaBan key="d" />, "Decline"]].map(([v, ic, label]) => (
              <button key={v} onClick={() => onRsvp(v)} title={label}
                className={`px-2.5 py-1.5 ${rsvp === v ? "text-white" : "hover:bg-gray-50 text-gray-600"}`}
                style={rsvp === v ? { background: BRAND } : undefined}>{ic}</button>
            ))}
          </div>
        )}
        {(s === "upcoming" || s === "live") && (
          <button onClick={onJoin} className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: s === "live" ? "#16a34a" : BRAND }}>
            {isHost && s === "upcoming" ? "Start" : "Join"}
          </button>
        )}
        {s !== "cancelled" && s !== "past" && (
          <button onClick={onIcs} title="Add to calendar" className="p-2.5 rounded-lg border hover:bg-gray-50 text-gray-600"><FaCalendarPlus /></button>
        )}
        {isHost && s === "live" && <button onClick={onEnd} className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50">End</button>}
        {isHost && s === "upcoming" && <button onClick={onCancel} className="px-3 py-2 rounded-lg border text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>}
      </div>
    </div>
  );
}

function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function CreateMeetingModal({ onClose }) {
  const create = useCreateMeeting();
  const start = new Date(Date.now() + 3600000);
  start.setMinutes(0, 0, 0);
  const [form, setForm] = useState({
    title: "", description: "", agenda: "", startTime: toLocalInput(start), durationMin: 30,
    media: "video", allowJoinBeforeHost: false, sendEmail: true, recurrence: "",
  });
  const [everyone, setEveryone] = useState(false);
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState("");
  const { data: results = [] } = useDirectorySearch(q, { enabled: !everyone });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Please enter a title");
    if (!everyone && people.length === 0) return toast.error("Add at least one attendee");
    try {
      const body = {
        title: form.title.trim(),
        description: form.description || undefined,
        agenda: form.agenda || undefined,
        startTime: new Date(form.startTime).toISOString(),
        durationMin: Number(form.durationMin) || 30,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        media: form.media,
        allowJoinBeforeHost: form.allowJoinBeforeHost,
        sendEmail: form.sendEmail,
        ...(everyone ? { audience: { everyone: true } } : { attendees: people.map((p) => ({ model: p.model, id: p.id })) }),
        ...(form.recurrence ? { recurrence: { freq: form.recurrence, interval: 1, count: 10 } } : {}),
      };
      const res = await create.mutateAsync(body);
      if (res?.conflicts?.length) toast(`Scheduled — ${res.conflicts.length} attendee(s) have a clash.`, { icon: "⚠️" });
      else toast.success("Meeting scheduled");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Could not schedule meeting");
    }
  };

  const input = "w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#730042]/30";

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Schedule a meeting</h2>
          <button type="button" onClick={onClose}><FaTimes /></button>
        </div>

        <input className={input} placeholder="Meeting title *" value={form.title} onChange={(e) => set("title", e.target.value)} />
        <textarea className={input} rows={2} placeholder="Description (optional)" value={form.description} onChange={(e) => set("description", e.target.value)} />
        <textarea className={input} rows={2} placeholder="Agenda (optional)" value={form.agenda} onChange={(e) => set("agenda", e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">Starts
            <input type="datetime-local" className={input} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
          </label>
          <label className="text-xs text-gray-500">Duration
            <select className={input} value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)}>
              {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500">Type
            <select className={input} value={form.media} onChange={(e) => set("media", e.target.value)}>
              <option value="video">Video</option>
              <option value="audio">Audio only</option>
            </select>
          </label>
          <label className="text-xs text-gray-500">Repeat
            <select className={input} value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
              <option value="">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} /> Invite everyone in the organisation
          </label>
          {!everyone && (
            <>
              {people.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {people.map((p) => (
                    <span key={p.key} className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full pl-2.5 pr-1.5 py-1" style={{ background: "#F6E8EF", color: BRAND }}>
                      {p.name}
                      <button type="button" onClick={() => setPeople((x) => x.filter((y) => y.key !== p.key))}><FaTimes /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
                <input className={`${input} pl-8`} placeholder="Search people to invite…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {q.trim() && (
                <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto">
                  {results.length === 0 && <p className="p-3 text-xs text-gray-500">No matches</p>}
                  {results.filter((p) => !people.some((x) => x.key === p.key)).map((p) => (
                    <button type="button" key={p.key} onClick={() => { setPeople((x) => [...x, p]); setQ(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                      {p.name} <span className="text-xs text-gray-400">{p.role || p.model}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowJoinBeforeHost} onChange={(e) => set("allowJoinBeforeHost", e.target.checked)} /> Allow joining before the host</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.sendEmail} onChange={(e) => set("sendEmail", e.target.checked)} /> Email invitations</label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          <button disabled={create.isPending} className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{ background: BRAND }}>
            {create.isPending ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}
