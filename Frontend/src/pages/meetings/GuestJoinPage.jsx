import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Video, Mic, CalendarClock, ShieldCheck, LogIn } from "lucide-react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaPhoneSlash } from "react-icons/fa";
import { getGuestMeetingInfo, guestJoin } from "../../auth/api/meeting/meetingGuest.api";
import { connectSocket, disconnectSocket, getSocket, setGuestToken } from "../../realtime/socket";
import { callManager } from "../../realtime/webrtc/callManager";
import useCall from "../../realtime/useCall";
import { Tile, MediaView, CtrlButton, gridCols, useElapsed } from "../../components/chat/CallOverlay";
import { formatDuration } from "../../components/chat/chatUtils";
import { fmtDateTime } from "../../components/meeting/meetingUtils";

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#730042] focus:outline-none focus:ring-2 focus:ring-[#730042]/20";

const Shell = ({ children }) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
  </div>
);

function GuestCall({ name }) {
  const { active, peers, isPresenting, toggleAudio, toggleVideo, startScreenShare, stopScreenShare, leave } = useCall();
  const elapsed = useElapsed(active?.startedAt, active?.status === "connected");
  if (!active) return null;

  const run = (fn) => () => Promise.resolve(fn()).catch((err) => toast.error(err?.message || "Something went wrong."));
  const presenter = peers.find((p) => p.screenStream);
  const tiles = [
    { id: "me", name, stream: active.localStream, muted: true, audioOn: active.audio, videoOn: active.video && !!active.localStream, mirror: true, label: isPresenting ? "You (presenting)" : "You" },
    ...peers.map((p) => ({
      id: p.socketId,
      name: p.name || "Participant",
      photo: p.photo || "",
      seed: p.key || p.socketId,
      stream: p.stream,
      muted: false,
      audioOn: p.audio !== false,
      videoOn: !!p.video && !!p.stream,
      mirror: false,
      reconnecting: p.connectionState === "disconnected" || p.connectionState === "failed",
    })),
  ];
  const status = active.status === "connected" ? formatDuration(elapsed) : active.status === "reconnecting" ? "Reconnecting…" : "Connecting…";

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gray-950 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{active.title || "Meeting"}</p>
          <p className="text-xs text-emerald-300">{status}</p>
        </div>
        {active.mutedByHost && <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] text-amber-300">Muted by host</span>}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 md:flex-row">
        {presenter ? (
          <>
            <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl bg-black">
              <MediaView stream={presenter.screenStream} muted contain />
              <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">{presenter.name || "Someone"} is presenting</div>
            </div>
            <div className="flex gap-2 overflow-auto md:w-52 md:flex-col">
              {tiles.map((t) => (
                <div key={t.id} className="aspect-video h-28 flex-shrink-0 md:aspect-auto md:h-32 md:w-full">
                  <Tile {...t} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={`grid ${gridCols(tiles.length)} min-h-0 flex-1 auto-rows-fr gap-2`}>
            {tiles.map((t) => (
              <Tile key={t.id} {...t} avatarSize={72} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 pb-6 pt-1">
        <CtrlButton onClick={toggleAudio} active={active.audio} title={active.audio ? "Mute" : "Unmute"}>
          {active.audio ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </CtrlButton>
        <CtrlButton onClick={run(toggleVideo)} active={active.video} title={active.video ? "Turn camera off" : "Turn camera on"}>
          {active.video ? <FaVideo /> : <FaVideoSlash />}
        </CtrlButton>
        <CtrlButton onClick={run(isPresenting || active.screen ? stopScreenShare : startScreenShare)} active={!active.screen} title={active.screen ? "Stop sharing" : "Share screen"}>
          <FaDesktop />
        </CtrlButton>
        <CtrlButton onClick={run(leave)} danger title="Leave meeting">
          <FaPhoneSlash />
        </CtrlButton>
      </div>
    </div>
  );
}

// Public page for outsiders: email + PIN (from the invitation) -> waiting room -> meeting.
export default function GuestJoinPage() {
  const { id } = useParams();
  const { active, waiting, lastEnded, error, clearError, clearLastEnded } = useCall();

  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", pin: "" });
  const [session, setSession] = useState(null);
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
      if (err.code !== "WAITING_FOR_HOST" && err.code !== "TOO_EARLY") setFormError(err.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setFormError("Enter the email address your invitation was sent to.");
    if (!/^\d{6}$/.test(form.pin.trim())) return setFormError("The PIN is 6 digits.");
    setBusy(true);
    try {
      const sess = await guestJoin({ meetingId: id, email: form.email.trim(), pin: form.pin.trim(), name: form.name.trim() || undefined });
      setSession(sess);
      await enter(sess);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const m = session?.meeting || info;

  if (active && session) return <GuestCall name={session.guest.name} />;

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

  if (session && waiting) {
    const lobby = waiting.code === "LOBBY";
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#730042]/10 text-[#730042]">
            {lobby ? <ShieldCheck size={22} /> : <CalendarClock size={22} />}
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{m.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {lobby ? "You're in the waiting room. The host will let you in shortly." : waiting.code === "TOO_EARLY" ? `This meeting opens shortly (starts ${fmtDateTime(m.startTime)}).` : "Waiting for the host to start the meeting."}
          </p>
          <p className="mt-1 text-xs text-gray-400">You'll join automatically - keep this tab open.</p>
          <button type="button" onClick={callManager.cancelWaiting} className="mt-5 text-sm font-medium text-gray-500 underline">Leave</button>
        </div>
      </Shell>
    );
  }

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
