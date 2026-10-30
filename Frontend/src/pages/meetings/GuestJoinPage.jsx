import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Video, Mic, CalendarClock, LogIn } from "lucide-react";
import { getGuestMeetingInfo, guestJoin } from "../../auth/api/meeting/meetingGuest.api";
import { connectSocket, disconnectSocket, getSocket, setGuestToken } from "../../realtime/socket";
import { callManager } from "../../realtime/webrtc/callManager";
import useCall from "../../realtime/useCall";
import MeetingRoom from "../../components/meeting/room/MeetingRoom";
import WaitingScreen from "../../components/meeting/room/WaitingScreen";
import { fmtDateTime } from "../../components/meeting/meetingUtils";

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#730042] focus:outline-none focus:ring-2 focus:ring-[#730042]/20";

const Shell = ({ children }) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
  </div>
);

const guestKey = (id) => `torchx_guest_${id}`;

const readGuest = (id) => {
  try {
    return JSON.parse(sessionStorage.getItem(guestKey(id)) || "null");
  } catch {
    return null;
  }
};

const writeGuest = (id, value) => {
  try {
    if (value) sessionStorage.setItem(guestKey(id), JSON.stringify(value));
    else sessionStorage.removeItem(guestKey(id));
  } catch {
    return;
  }
};

// Public page for outsiders: email + PIN (from the invitation) -> waiting room -> meeting.
export default function GuestJoinPage() {
  const { id } = useParams();
  const { active, waiting, lastEnded, error, clearError, clearLastEnded } = useCall();
  const restoredRef = useRef(readGuest(id));

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", pin: "" });
  const [session, setSession] = useState(() => readGuest(id));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let live = true;
    getGuestMeetingInfo(id)
      .then((r) => live && setInfo(r.meeting))
      .catch((e) => live && setInfoError(e.message));
    return () => {
      live = false;
    };
  }, [id]);

  // Same call engine as members, attached to the guest socket
  useEffect(() => {
    const detach = callManager.attach(getSocket());
    return () => {
      detach();
      setGuestToken(null);
      disconnectSocket();
    };
  }, []);

  const enter = async (sess) => {
    setGuestToken(sess.token);
    disconnectSocket();
    connectSocket();
    clearError();
    clearLastEnded();
    try {
      await callManager.joinMeeting(sess.meeting.id, { media: sess.meeting.media });
    } catch (err) {
      // WAITING_FOR_HOST / TOO_EARLY are shown as the waiting screen
      if (err.code !== "WAITING_FOR_HOST" && err.code !== "TOO_EARLY") {
        setFormError(err.message);
        if (restoredRef.current) {
          restoredRef.current = null;
          writeGuest(id, null);
          setSession(null);
        }
      }
    }
  };

  useEffect(() => {
    const saved = restoredRef.current;
    if (saved) enter(saved);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError("Enter the email address your invitation was sent to.");
    if (!/^\d{6}$/.test(form.pin.trim())) return setFormError("The PIN is 6 digits.");
    setBusy(true);
    try {
      const sess = await guestJoin({ meetingId: id, email: form.email.trim(), pin: form.pin.trim(), name: form.name.trim() || undefined });
      setSession(sess);
      writeGuest(id, sess);
      await enter(sess);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const m = session?.meeting || info;

  if (active && session) return <MeetingRoom guest guestName={session.guest.name} />;

  if (infoError && !info) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-gray-900">Meeting not found</h1>
        <p className="mt-2 text-sm text-gray-500">{infoError}. Check the link in your invitation email.</p>
      </Shell>
    );
  }
  if (!info) {
    return (
      <Shell>
        <div className="flex justify-center py-8 text-[#730042]"><Loader2 className="animate-spin" /></div>
      </Shell>
    );
  }

  if (session && waiting) return <WaitingScreen title={m?.title} hostName={info?.hostName} />;

  const ended = session && (lastEnded || error);
  return (
    <Shell>
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#730042]">You're invited</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">{info.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1"><CalendarClock size={14} /> {fmtDateTime(info.startTime)}</span>
          <span className="inline-flex items-center gap-1">{info.media === "audio" ? <Mic size={14} /> : <Video size={14} />} {info.media === "audio" ? "Audio" : "Video"}</span>
        </p>
        {info.hostName && <p className="mt-0.5 text-sm text-gray-500">Hosted by {info.hostName}</p>}
      </div>

      {ended && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error || (lastEnded.reason === "removed" ? "The host removed you from the meeting." : "The meeting has ended or you left.")}
        </p>
      )}
      {info.status === "cancelled" && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">This meeting was cancelled.</p>}

      {session ? (
        <button type="button" disabled={busy} onClick={() => { setBusy(true); enter(session).finally(() => setBusy(false)); }} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#730042] text-sm font-medium text-white hover:bg-[#5c0035] disabled:opacity-50">
          <LogIn size={16} /> Join again
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input className={inputCls} placeholder="Your name" value={form.name} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} type="email" autoComplete="email" placeholder="Email address from your invitation" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className={`${inputCls} tracking-[0.4em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit PIN" value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))} />
          {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
          <button type="submit" disabled={busy || info.status === "cancelled"} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#730042] text-sm font-medium text-white hover:bg-[#5c0035] disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Join meeting
          </button>
          <p className="text-center text-xs text-gray-400">Your camera and microphone are used only during the meeting. The host admits you from the waiting room.</p>
        </form>
      )}
      {session && formError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
    </Shell>
  );
}
