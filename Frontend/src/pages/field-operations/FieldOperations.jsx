import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiActivity, FiCheckCircle, FiClock, FiMapPin, FiNavigation, FiPause, FiPlay, FiRefreshCw, FiUserPlus, FiUsers, FiWifiOff, FiXCircle } from "react-icons/fi";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import {
  checkoutFieldDuty, createFieldTeam, endFieldVisit, getFieldOverview, getFieldTeams,
  getFieldTeamOptions, getMyFieldDuty, sendFieldLocation, startFieldDuty, startFieldVisit, updateFieldDutyStatus,
} from "../../auth/api/fieldOperations/fieldOperations.api";
import { pendingFieldEvents, queueFieldEvent, removeFieldEvent } from "./fieldOfflineQueue";

const newId = () => window.crypto?.randomUUID?.() || `field_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const formatTime = (value) => value ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—";
const pointFromPosition = (position) => ({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString(), networkStatus: navigator.onLine ? "online" : "offline" });

function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This browser does not support GPS location."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  });
}

function StatusPill({ status }) {
  const styles = { active: "bg-emerald-100 text-emerald-700", paused: "bg-amber-100 text-amber-700", offline: "bg-slate-200 text-slate-600", checked_out: "bg-slate-100 text-slate-600", in_progress: "bg-blue-100 text-blue-700", completed: "bg-emerald-100 text-emerald-700", follow_up_required: "bg-violet-100 text-violet-700", skipped: "bg-rose-100 text-rose-700" };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${styles[status] || styles.offline}`}>{String(status || "unknown").replaceAll("_", " ")}</span>;
}

function LiveMap({ session }) {
  const location = session?.lastLocation || session?.startLocation;
  if (!location) return <div className="grid min-h-64 place-items-center rounded-2xl bg-slate-100 text-sm text-slate-500">No live GPS point yet</div>;
  const lat = Number(location.latitude); const lon = Number(location.longitude); const pad = 0.012;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - pad}%2C${lat - pad}%2C${lon + pad}%2C${lat + pad}&layer=mapnik&marker=${lat}%2C${lon}`;
  return <iframe title="Live field location" className="h-72 w-full rounded-2xl border border-slate-200" src={src} loading="lazy" />;
}

function EmployeeDuty({ session, setSession, refresh, pendingCount, setPendingCount }) {
  const watchId = useRef(null);
  const lastSent = useRef(0);
  const [busy, setBusy] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitForm, setVisitForm] = useState({ customerName: "", organisationName: "", contactNumber: "", purpose: "" });
  const [openVisit, setOpenVisit] = useState(null);

  const syncQueue = useCallback(async () => {
    const queued = await pendingFieldEvents();
    for (const event of queued) {
      try { await sendFieldLocation(event.sessionId, event.payload); await removeFieldEvent(event.id); }
      catch { break; }
    }
    setPendingCount((await pendingFieldEvents()).length);
  }, [setPendingCount]);

  const sendLocation = useCallback(async (position) => {
    if (!session?._id || session.status !== "active") return;
    const now = Date.now();
    if (now - lastSent.current < 30000) return;
    lastSent.current = now;
    const payload = { ...pointFromPosition(position), eventId: newId() };
    try {
      if (!navigator.onLine) throw new Error("offline");
      await sendFieldLocation(session._id, payload);
    } catch {
      await queueFieldEvent({ id: payload.eventId, sessionId: session._id, payload, createdAt: Date.now() });
      setPendingCount((await pendingFieldEvents()).length);
    }
  }, [session, setPendingCount]);

  useEffect(() => {
    if (!session?._id || session.status !== "active" || !navigator.geolocation) return undefined;
    watchId.current = navigator.geolocation.watchPosition(sendLocation, () => {}, { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 });
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [session?._id, session?.status, sendLocation]);

  useEffect(() => {
    const onOnline = () => syncQueue();
    window.addEventListener("online", onOnline);
    if (navigator.onLine) syncQueue();
    return () => window.removeEventListener("online", onOnline);
  }, [syncQueue]);

  const beginDuty = async () => {
    setBusy(true);
    try {
      if (!navigator.onLine) throw new Error("Connect to the internet once to start field duty. GPS updates are safely queued after duty starts.");
      const position = await currentPosition();
      const result = await startFieldDuty({ location: pointFromPosition(position), eventId: newId() });
      setSession(result.session); toast.success("Field duty started. Live location sharing is on.");
    } catch (error) { toast.error(error?.response?.data?.message || error.message || "Could not start duty"); }
    finally { setBusy(false); }
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try { const result = await updateFieldDutyStatus(session._id, status); setSession(result.session); toast.success(status === "paused" ? "Location sharing paused" : "Location sharing resumed"); }
    catch (error) { toast.error(error?.response?.data?.message || "Could not update duty"); }
    finally { setBusy(false); }
  };

  const endDuty = async () => {
    setBusy(true);
    try {
      let body = {};
      try { body = { location: pointFromPosition(await currentPosition()) }; } catch { body = {}; }
      const result = await checkoutFieldDuty(session._id, body); setSession(result.session); setOpenVisit(null); toast.success("Field duty checked out. Location sharing stopped.");
    } catch (error) { toast.error(error?.response?.data?.message || "Could not check out"); }
    finally { setBusy(false); }
  };

  const beginVisit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const position = await currentPosition();
      const result = await startFieldVisit(session._id, { ...visitForm, location: pointFromPosition(position), eventId: newId() });
      setOpenVisit(result.visit); setVisitOpen(false); setVisitForm({ customerName: "", organisationName: "", contactNumber: "", purpose: "" }); toast.success("Visit started");
    } catch (error) { toast.error(error?.response?.data?.message || error.message || "Could not start visit"); }
    finally { setBusy(false); }
  };

  const finishVisit = async () => {
    if (!openVisit) return; setBusy(true);
    try {
      let location = {}; try { location = { location: pointFromPosition(await currentPosition()) }; } catch { location = {}; }
      await endFieldVisit(openVisit._id, { ...location, status: "completed" }); setOpenVisit(null); toast.success("Visit completed"); refresh();
    } catch (error) { toast.error(error?.response?.data?.message || "Could not complete visit"); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-[#7A004B]">Field Operations</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Your field duty</h1><p className="mt-1 text-sm text-slate-500">Location is shared only while your field duty is active.</p></header>
    <div className="rounded-2xl bg-gradient-to-br from-[#7A004B] to-[#31001d] p-5 text-white shadow-lg">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-white/70">Duty status</p><p className="mt-1 text-2xl font-extrabold">{session ? (session.status === "checked_out" ? "Duty completed" : "Field duty active") : "Ready to start"}</p></div>{session && <StatusPill status={session.status} />}</div>
      {session ? <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/10 p-3"><FiClock className="mb-1" />Started {formatTime(session.startedAt)}</div><div className="rounded-xl bg-white/10 p-3"><FiMapPin className="mb-1" />Last seen {formatTime(session.lastSeenAt)}</div></div> : <p className="mt-4 text-sm text-white/80">Allow precise location when prompted. We stop tracking automatically after checkout.</p>}
      {!session || session.status === "checked_out" ? <button disabled={busy} onClick={beginDuty} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-[#7A004B] disabled:opacity-60"><FiPlay /> Start field duty</button> : <div className="mt-5 grid grid-cols-2 gap-3"><button disabled={busy || session.status !== "active"} onClick={() => changeStatus("paused")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 font-bold disabled:opacity-40"><FiPause /> Pause</button><button disabled={busy} onClick={endDuty} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 font-bold"><FiXCircle /> Check out</button></div>}
      {session?.status === "paused" && <button disabled={busy} onClick={() => changeStatus("active")} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-[#7A004B]"><FiPlay /> Resume location sharing</button>}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><FiWifiOff className={navigator.onLine ? "text-emerald-600" : "text-amber-600"} size={20} /><div><p className="font-bold text-slate-800">{navigator.onLine ? "Online" : "Offline"} · {pendingCount} update{pendingCount === 1 ? "" : "s"} pending</p><p className="text-xs text-slate-500">GPS points are stored securely on this device and sync when you reconnect.</p></div></div>{pendingCount > 0 && <button onClick={syncQueue} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#7A004B]"><FiRefreshCw /> Sync now</button>}</div>
    {session && session.status !== "checked_out" && <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Customer visit</h2><p className="text-xs text-slate-500">Log time and outcome at each customer location.</p></div>{openVisit ? <StatusPill status="in_progress" /> : null}</div>{openVisit ? <div className="mt-4 rounded-xl bg-blue-50 p-3"><p className="font-bold text-blue-900">{openVisit.customerName}</p><p className="text-xs text-blue-700">Started {formatTime(openVisit.startedAt)}</p><button disabled={busy} onClick={finishVisit} className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">End visit</button></div> : <button disabled={busy || session.status !== "active"} onClick={() => setVisitOpen(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#7A004B] px-4 py-3 font-bold text-[#7A004B] disabled:opacity-40"><FiUserPlus /> Start customer visit</button>}</div>}
    {visitOpen && <form onSubmit={beginVisit} className="rounded-2xl border border-[#d7a6c0] bg-[#fff8fb] p-4 space-y-3"><h2 className="font-bold">Start a customer visit</h2>{[["customerName", "Customer / contact name *"], ["organisationName", "Organisation / place"], ["contactNumber", "Contact number"], ["purpose", "Visit purpose"]].map(([name, label]) => <input key={name} required={name === "customerName"} value={visitForm[name]} onChange={(e) => setVisitForm({ ...visitForm, [name]: e.target.value })} placeholder={label} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#7A004B]" />)}<div className="flex gap-2"><button disabled={busy} className="flex-1 rounded-lg bg-[#7A004B] px-3 py-2 text-sm font-bold text-white">Start visit</button><button type="button" onClick={() => setVisitOpen(false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button></div></form>}
  </div>;
}

function ManagerDashboard({ overview, reload, teams, setTeams, canManageTeams }) {
  const [selected, setSelected] = useState(null); const [showSetup, setShowSetup] = useState(false); const [options, setOptions] = useState(null); const [form, setForm] = useState({ name: "", territory: "", managers: [], members: [] }); const [saving, setSaving] = useState(false);
  const live = overview?.live || []; const active = selected || live[0] || null;
  const openSetup = async () => { try { setOptions(await getFieldTeamOptions()); setShowSetup(true); } catch (e) { toast.error(e?.response?.data?.message || "Could not load team members"); } };
  const toggle = (key, id) => setForm((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id] }));
  const createTeam = async (event) => { event.preventDefault(); setSaving(true); try { await createFieldTeam(form); toast.success("Field team created"); setShowSetup(false); setForm({ name: "", territory: "", managers: [], members: [] }); const data = await getFieldTeams(); setTeams(data.teams); } catch (e) { toast.error(e?.response?.data?.message || "Could not create team"); } finally { setSaving(false); } };
  return <div className="space-y-5 p-4 sm:p-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#7A004B]">Field Operations</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">Live field map</h1><p className="mt-1 text-sm text-slate-500">Updates refresh every 45 seconds while a duty session is open.</p></div><div className="flex gap-2"><button onClick={reload} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold"><FiRefreshCw /> Refresh</button>{canManageTeams && <button onClick={openSetup} className="inline-flex items-center gap-2 rounded-lg bg-[#7A004B] px-3 py-2 text-sm font-bold text-white"><FiUsers /> Create field team</button>}</div></header>
    <div className="grid gap-3 sm:grid-cols-3"><Stat icon={<FiActivity />} label="Active now" value={overview?.summary?.active || 0} /><Stat icon={<FiWifiOff />} label="Offline" value={overview?.summary?.offline || 0} /><Stat icon={<FiCheckCircle />} label="Visits completed today" value={overview?.summary?.completedVisits || 0} /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]"><section className="rounded-2xl border border-slate-200 bg-white p-3"><LiveMap session={active} />{active && <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="font-bold text-slate-900">{active.employee?.f_name} {active.employee?.l_name}</p><p className="text-xs text-slate-500">{active.team?.name || "Field team"} · Last seen {formatTime(active.lastSeenAt)}</p></div><StatusPill status={active.status} /></div>}</section><section className="rounded-2xl border border-slate-200 bg-white p-3"><h2 className="px-1 pb-3 font-bold text-slate-900">Field employees ({live.length})</h2><div className="max-h-[380px] space-y-2 overflow-y-auto">{live.length ? live.map((item) => <button key={item._id} onClick={() => setSelected(item)} className={`w-full rounded-xl p-3 text-left ${active?._id === item._id ? "bg-[#fdf0f6] ring-1 ring-[#d7a6c0]" : "bg-slate-50"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-sm text-slate-900">{item.employee?.f_name} {item.employee?.l_name}</p><p className="mt-0.5 text-xs text-slate-500">{item.team?.territory || item.employee?.office_location || "No territory"}</p><p className="mt-1 text-xs text-slate-500">Last seen {formatTime(item.lastSeenAt)}</p></div><StatusPill status={item.status} /></div></button>) : <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No field employee is on duty right now.</p>}</div></section></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold text-slate-900">Today’s visits</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2">Employee</th><th className="pb-2">Customer</th><th className="pb-2">Purpose</th><th className="pb-2">Started</th><th className="pb-2">Status</th></tr></thead><tbody>{(overview?.visits || []).map((visit) => <tr key={visit._id} className="border-b last:border-0"><td className="py-3 font-medium">{visit.employee?.f_name} {visit.employee?.l_name}</td><td className="py-3">{visit.customerName}</td><td className="py-3 text-slate-500">{visit.purpose || "—"}</td><td className="py-3">{formatTime(visit.startedAt)}</td><td className="py-3"><StatusPill status={visit.status} /></td></tr>)}{!overview?.visits?.length && <tr><td className="py-5 text-center text-slate-500" colSpan="5">No visits recorded today.</td></tr>}</tbody></table></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-bold text-slate-900">Your field teams</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{teams.map((team) => <div key={team._id} className="rounded-xl bg-slate-50 p-3"><p className="font-bold">{team.name}</p><p className="text-xs text-slate-500">{team.territory || "No territory"} · {team.members?.length || 0} field employee(s)</p></div>)}{!teams.length && <p className="text-sm text-slate-500">Create a team and assign a manager and field employees to begin.</p>}</div></section>
    {showSetup && <form onSubmit={createTeam} className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><div className="mx-auto my-6 max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between"><h2 className="text-lg font-extrabold">Create field team</h2><button type="button" onClick={() => setShowSetup(false)}>×</button></div><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Team name *" className="mt-4 w-full rounded-lg border px-3 py-2" /><input value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} placeholder="Territory / area" className="mt-2 w-full rounded-lg border px-3 py-2" /><p className="mt-4 text-sm font-bold">Managers</p><div className="mt-2 grid max-h-32 grid-cols-2 gap-2 overflow-y-auto">{options?.managers?.map((person) => <label key={person._id} className="flex gap-2 rounded bg-slate-50 p-2 text-xs"><input type="checkbox" checked={form.managers.includes(person._id)} onChange={() => toggle("managers", person._id)} />{person.f_name} {person.l_name}</label>)}</div><p className="mt-4 text-sm font-bold">Field employees</p><div className="mt-2 grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">{options?.employees?.map((person) => <label key={person._id} className="flex gap-2 rounded bg-slate-50 p-2 text-xs"><input type="checkbox" checked={form.members.includes(person._id)} onChange={() => toggle("members", person._id)} />{person.f_name} {person.l_name}</label>)}</div><button disabled={saving} className="mt-5 w-full rounded-lg bg-[#7A004B] py-2.5 font-bold text-white disabled:opacity-50">Create team</button></div></form>}
  </div>;
}

function Stat({ icon, label, value }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-[#7A004B]">{icon}<span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span></div><p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p></div>; }

export default function FieldOperations() {
  const { data: auth } = useAuth(); const role = auth?.role; const [session, setSession] = useState(null); const [overview, setOverview] = useState(null); const [teams, setTeams] = useState([]); const [pendingCount, setPendingCount] = useState(0); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { if (role === "employee") { const data = await getMyFieldDuty(); setSession(data.session); } else { const [data, teamData] = await Promise.all([getFieldOverview(), getFieldTeams()]); setOverview(data); setTeams(teamData.teams); } setPendingCount((await pendingFieldEvents()).length); } catch (error) { toast.error(error?.response?.data?.message || "Could not load Field Operations"); } finally { setLoading(false); } }, [role]);
  useEffect(() => { if (role) load(); }, [role, load]);
  useEffect(() => { if (role === "employee" || !role) return undefined; const timer = window.setInterval(load, 45000); return () => window.clearInterval(timer); }, [role, load]);
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading Field Operations…</div>;
  return role === "employee" ? <EmployeeDuty session={session} setSession={setSession} refresh={load} pendingCount={pendingCount} setPendingCount={setPendingCount} /> : <ManagerDashboard overview={overview} reload={load} teams={teams} setTeams={setTeams} canManageTeams={["admin", "superadmin"].includes(role)} />;
}
