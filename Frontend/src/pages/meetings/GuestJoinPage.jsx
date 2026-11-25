import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Video, Mic, CalendarClock, LogIn, CircleAlert, CalendarX2, LinkIcon, CheckCircle2 } from "lucide-react";
import { getGuestMeetingInfo, guestJoin } from "../../auth/api/meeting/meetingGuest.api";
import { connectSocket, disconnectSocket, getSocket, setGuestToken } from "../../realtime/socket";
import { callManager } from "../../realtime/webrtc/callManager";
import useCall from "../../realtime/useCall";
import MeetingRoom from "../../components/meeting/room/MeetingRoom";
import WaitingScreen from "../../components/meeting/room/WaitingScreen";
import GuestDeviceCheck from "../../components/meeting/GuestDeviceCheck";
import { cx } from "../../components/meeting/meetingClasses";
import { fmtDateTime } from "../../components/meeting/meetingUtils";
import "../../components/meeting/meetingA11y.css";

const fieldCls = "w-full min-h-11 rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#CD166E]/60";

const Shell = ({ children, wide }) => (
  <div className="mtg-root mtg-room mtg-safe-t mtg-safe-b flex min-h-dvh items-center justify-center bg-[#101013] px-4 py-6 text-white">
    <div className={cx("w-full rounded-2xl border border-white/10 bg-[#1b1b20] p-5 shadow-2xl sm:p-7", wide ? "max-w-3xl" : "max-w-md")}>{children}</div>
  </div>
);

const Notice = ({ icon: Icon, title, children, tone = "text-gray-300" }) => (
  <Shell>
    <div role="alert" className="flex flex-col items-center text-center">
      <span className={cx("mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10", tone)}>
        <Icon size={26} aria-hidden="true" />
      </span>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-gray-400">{children}</p>
    </div>
  </Shell>
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

const pinMessage = (err) => {
  if (err.status === 401) return { field: "pin", text: "That email and PIN don't match. Use the email address your invitation was sent to and the 6-digit PIN from it." };
  if (err.status === 429) return { field: "pin", text: err.message };
  return { field: "form", text: err.message };
};

export default function GuestJoinPage() {
  const { id } = useParams();
  const { active, waiting, lastEnded, error, clearError, clearLastEnded } = useCall();
  const restoredRef = useRef(readGuest(id));

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", pin: "" });
  const [session, setSession] = useState(() => readGuest(id));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [expired, setExpired] = useState("");

  useEffect(() => {
    let live = true;
    getGuestMeetingInfo(id)
      .then((r) => live && setInfo(r.meeting))
      .catch((e) => live && setInfoError(e));
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    const detach = callManager.attach(getSocket());
    return () => {
      detach();
      setGuestToken(null);
      disconnectSocket();
    };
  }, []);

  const enter = async (sess, prefs = {}) => {
    setGuestToken(sess.token);
    disconnectSocket();
    connectSocket();
    clearError();
    clearLastEnded();
    try {
      await callManager.joinMeeting(sess.meeting.id, { media: sess.meeting.media, ...prefs });
    } catch (err) {
      if (err.code === "MEETING_ENDED" || err.code === "MEETING_CANCELLED") return setExpired(err.code);
      if (err.code !== "WAITING_FOR_HOST" && err.code !== "TOO_EARLY") {
        setFormError({ field: "form", text: err.message });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError({ field: "email", text: "Enter the email address your invitation was sent to." });
    if (!/^\d{6}$/.test(form.pin.trim())) return setFormError({ field: "pin", text: "The PIN is 6 digits." });
    setBusy(true);
    try {
      const sess = await guestJoin({ meetingId: id, email: form.email.trim(), pin: form.pin.trim(), name: form.name.trim() || undefined });
      setSession(sess);
      writeGuest(id, sess);
      await enter(sess, { audio: micOn, video: camOn });
    } catch (err) {
      if (err.code === "MEETING_ENDED" || err.code === "MEETING_CANCELLED") setExpired(err.code);
      else setFormError(pinMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const m = session?.meeting || info;

  if (active && session) return <MeetingRoom guest guestName={session.guest.name} />;

  if (expired || info?.status === "ended" || info?.status === "cancelled") {
    const cancelled = expired === "MEETING_CANCELLED" || info?.status === "cancelled";
    return (
      <Notice icon={CalendarX2} title={cancelled ? "This meeting was cancelled" : "This meeting has ended"}>
        {cancelled ? "The host cancelled it, so this link no longer works." : "This invitation link has expired. If you think that's a mistake, ask the host to send you a new invitation."}
      </Notice>
    );
  }
  if (infoError && !info) {
    const gone = infoError.status === 404;
    return (
      <Notice icon={gone ? LinkIcon : CircleAlert} title={gone ? "We couldn't find this meeting" : "Couldn't load the meeting"} tone="text-amber-300">
        {gone ? "The link may be incomplete or the invitation was withdrawn. Check the link in your invitation email." : `${infoError.message}. Check your connection and refresh the page.`}
      </Notice>
    );
  }
  if (!info) {
    return (
      <Shell>
        <div role="status" aria-label="Loading meeting" className="flex justify-center py-10 text-[#CD166E]">
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        </div>
      </Shell>
    );
  }

  if (session && waiting) return <WaitingScreen title={m?.title} hostName={info?.hostName} />;

  const ended = session && (lastEnded || error);
  const audioOnly = info.media === "audio";
  const errFor = (f) => (formError?.field === f ? formError.text : "");
  const submitDisabled = busy;

  return (
    <Shell wide={!session}>
      <div className={cx("grid gap-6", !session && "md:grid-cols-2")}>
        {!session && (
          <div className="order-2 md:order-1">
            <GuestDeviceCheck audioOnly={audioOnly} micOn={micOn} camOn={camOn} onMic={() => setMicOn((v) => !v)} onCam={() => setCamOn((v) => !v)} />
          </div>
        )}

        <div className="order-1 md:order-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#f08bbd]">You're invited</p>
          <h1 className="mt-1 text-xl font-semibold">{info.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={14} aria-hidden="true" /> {fmtDateTime(info.startTime)}
            </span>
            <span className="inline-flex items-center gap-1">
              {audioOnly ? <Mic size={14} aria-hidden="true" /> : <Video size={14} aria-hidden="true" />} {audioOnly ? "Audio" : "Video"}
            </span>
          </p>
          {info.hostName && <p className="mt-0.5 text-sm text-gray-500">Hosted by {info.hostName}</p>}

          {ended && (
            <p role="status" className="mt-4 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
              {error || (lastEnded.reason === "removed" ? "The host removed you from the meeting." : "The meeting has ended or you left.")}
            </p>
          )}

          {session ? (
            <div className="mt-5 space-y-3">
              <p className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 size={16} aria-hidden="true" /> Signed in as {session.guest.name}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setFormError(null);
                  enter(session).finally(() => setBusy(false));
                }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#730042] text-sm font-medium text-white hover:bg-[#5c0035] disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />} Join again
              </button>
              {errFor("form") && (
                <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">
                  {errFor("form")}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-5 space-y-3">
              <div>
                <label htmlFor="g-name" className="mb-1 block text-xs font-medium text-gray-300">Your name</label>
                <input id="g-name" className={cx(fieldCls, "border-white/15")} autoComplete="name" value={form.name} maxLength={60} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="g-email" className="mb-1 block text-xs font-medium text-gray-300">Email from your invitation</label>
                <input id="g-email" type="email" autoComplete="email" aria-invalid={!!errFor("email")} aria-describedby={errFor("email") ? "g-email-err" : undefined} className={cx(fieldCls, errFor("email") ? "border-red-400" : "border-white/15")} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                {errFor("email") && <p id="g-email-err" role="alert" className="mt-1 text-xs text-red-300">{errFor("email")}</p>}
              </div>
              <div>
                <label htmlFor="g-pin" className="mb-1 block text-xs font-medium text-gray-300">6-digit PIN</label>
                <input id="g-pin" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-invalid={!!errFor("pin")} aria-describedby={errFor("pin") ? "g-pin-err" : undefined} className={cx(fieldCls, "tracking-[0.4em]", errFor("pin") ? "border-red-400" : "border-white/15")} value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))} />
                {errFor("pin") && <p id="g-pin-err" role="alert" className="mt-1 text-xs text-red-300">{errFor("pin")}</p>}
              </div>
              {errFor("form") && (
                <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">
                  {errFor("form")}
                </p>
              )}
              <button type="submit" disabled={submitDisabled} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#730042] text-sm font-medium text-white hover:bg-[#5c0035] disabled:opacity-50">
                {busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />} Join meeting
              </button>
              <p className="text-center text-xs text-gray-500">The host admits you from the waiting room. Your camera and microphone are used only during the meeting.</p>
            </form>
          )}
        </div>
      </div>
    </Shell>
  );
}
