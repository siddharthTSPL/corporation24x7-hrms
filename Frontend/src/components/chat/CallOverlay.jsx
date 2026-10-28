import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FaPhoneAlt,
  FaPhoneSlash,
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaDesktop,
  FaCompressAlt,
  FaExpandAlt,
} from "react-icons/fa";
import useCall from "../../realtime/useCall";
import Avatar from "./Avatar";
import { formatDuration } from "./chatUtils";
import { startRingtone, showIncomingCallAlert, isAudioLocked } from "../notifications/callSound";

function MediaView({ stream, muted = false, mirror = false, hidden = false, contain = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = stream || null;
    if (el.srcObject !== next) el.srcObject = next;
    if (next) el.play().catch(() => {});
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${hidden ? "absolute w-0 h-0 opacity-0 pointer-events-none" : `w-full h-full ${contain ? "object-contain" : "object-cover"}`} ${mirror ? "-scale-x-100" : ""}`}
    />
  );
}

function Tile({ name, photo, seed, stream, muted, audioOn, videoOn, mirror, label, reconnecting }) {
  return (
    <div className="relative w-full h-full min-h-0 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center">
      <MediaView stream={stream} muted={muted} mirror={mirror} hidden={!videoOn} />
      {!videoOn && <Avatar name={name} photo={photo} size={72} seed={seed} />}
      <div className="absolute left-2 bottom-2 flex items-center gap-1.5 bg-black/55 text-white text-xs rounded-full px-2.5 py-1 max-w-[80%]">
        {!audioOn && <FaMicrophoneSlash className="text-[10px] text-red-300 flex-shrink-0" />}
        <span className="truncate">{label || name}</span>
      </div>
      {reconnecting && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xs">Reconnecting…</div>
      )}
    </div>
  );
}

function CtrlButton({ onClick, active = true, danger = false, title, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`w-12 h-12 rounded-full flex items-center justify-center text-base transition-colors disabled:opacity-50 ${
        danger ? "bg-red-600 hover:bg-red-700 text-white" : active ? "bg-white/15 hover:bg-white/25 text-white" : "bg-white text-gray-900 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function useElapsed(startedAt, running) {
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!running) return 0;
  const parsed = startedAt ? new Date(startedAt).getTime() : NaN;
  const base = Number.isNaN(parsed) ? mountedAt : parsed;
  return Math.max(0, (now - base) / 1000);
}

function gridCols(n) {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 md:grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 9) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-3 md:grid-cols-4";
}

function CallScreen() {
  const { active, peers, isHost, isPresenting, toggleAudio, toggleVideo, startScreenShare, stopScreenShare, leave, endForAll } = useCall();
  const [minimized, setMinimized] = useState(false);
  const elapsed = useElapsed(active?.startedAt, active?.status === "connected");

  if (!active) return null;

  const statusText =
    active.status === "connected" ? formatDuration(elapsed) : active.status === "ringing" ? "Ringing…" : "Connecting…";
  const title = active.title || (active.kind === "meeting" ? "Meeting" : "Call");
  const presenter = peers.find((p) => p.screenStream);

  const run = (fn) => () => Promise.resolve(fn()).catch((err) => toast.error(err?.message || "Something went wrong."));

  const controls = (
    <>
      <CtrlButton onClick={toggleAudio} active={active.audio} title={active.audio ? "Mute" : "Unmute"}>
        {active.audio ? <FaMicrophone /> : <FaMicrophoneSlash />}
      </CtrlButton>
      <CtrlButton onClick={run(toggleVideo)} active={active.video} title={active.video ? "Turn camera off" : "Turn camera on"}>
        {active.video ? <FaVideo /> : <FaVideoSlash />}
      </CtrlButton>
      <CtrlButton
        onClick={run(isPresenting || active.screen ? stopScreenShare : startScreenShare)}
        active={!active.screen}
        title={active.screen ? "Stop sharing" : "Share screen"}
      >
        <FaDesktop />
      </CtrlButton>
      <CtrlButton onClick={run(leave)} danger title="Leave call">
        <FaPhoneSlash />
      </CtrlButton>
    </>
  );

  const hiddenAudio = (
    <div className="hidden">
      {presenter && <MediaView stream={presenter.screenStream} muted />}
    </div>
  );

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[90] w-72 rounded-2xl bg-gray-900 text-white shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            <p className="text-[11px] text-emerald-300">{statusText}</p>
          </div>
          <button type="button" onClick={() => setMinimized(false)} title="Expand" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
            <FaExpandAlt className="text-xs" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 pb-3">
          <CtrlButton onClick={toggleAudio} active={active.audio} title="Mute">
            {active.audio ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </CtrlButton>
          <CtrlButton onClick={run(leave)} danger title="Leave call">
            <FaPhoneSlash />
          </CtrlButton>
        </div>
        <div className="absolute w-0 h-0 overflow-hidden">
          {peers.map((p) => (
            <MediaView key={p.socketId} stream={p.stream} hidden />
          ))}
        </div>
      </div>
    );
  }

  const tiles = [
    {
      id: "me",
      name: "You",
      photo: "",
      seed: "me",
      stream: active.localStream,
      muted: true,
      audioOn: active.audio,
      videoOn: active.video && !!active.localStream,
      mirror: true,
      label: isPresenting ? "You (presenting)" : "You",
    },
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

  return (
    <div className="fixed inset-0 z-[90] bg-gray-950 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-emerald-300">{statusText}</p>
        </div>
        <div className="flex items-center gap-2">
          {active.mutedByHost && <span className="text-[11px] bg-amber-500/20 text-amber-300 rounded-full px-2.5 py-1">Muted by host</span>}
          <button type="button" onClick={() => setMinimized(true)} title="Minimise" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <FaCompressAlt className="text-xs" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-3 pb-3 flex flex-col md:flex-row gap-2">
        {presenter ? (
          <>
            <div className="flex-1 min-h-0 min-w-0 rounded-xl overflow-hidden bg-black relative">
              <MediaView stream={presenter.screenStream} muted contain />
              <div className="absolute left-3 top-3 bg-black/60 text-xs rounded-full px-3 py-1">
                {presenter.name || "Someone"} is presenting
              </div>
            </div>
            <div className="flex md:flex-col gap-2 md:w-52 overflow-auto">
              {tiles.map((t) => (
                <div key={t.id} className="h-28 md:h-32 aspect-video md:aspect-auto md:w-full flex-shrink-0">
                  <Tile {...t} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={`grid ${gridCols(tiles.length)} auto-rows-fr gap-2 flex-1 min-h-0`}>
            {tiles.map((t) => (
              <Tile key={t.id} {...t} />
            ))}
          </div>
        )}
      </div>

      {hiddenAudio}

      {isPresenting && (
        <div className="text-center text-xs text-amber-300 pb-1">You're sharing your screen</div>
      )}

      <div className="flex items-center justify-center gap-3 pb-6 pt-1">
        {controls}
        {isHost && active.kind !== "direct" && (
          <button
            type="button"
            onClick={run(endForAll)}
            className="ml-2 px-4 h-12 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 text-xs font-semibold"
          >
            End for all
          </button>
        )}
      </div>
    </div>
  );
}

function useRingtone(ringing, calls) {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!ringing) return undefined;
    setLocked(isAudioLocked());
    const onUnlock = () => setLocked(false);
    window.addEventListener("torchx-audio-unlocked", onUnlock);

    const stopRing = startRingtone();
    const first = calls[0];
    const closeAlert = showIncomingCallAlert({
      title: first?.from?.name || first?.conversationName || "Incoming call",
      body: `${first?.media === "video" ? "Video" : "Voice"} call - tap to answer`,
    });
    return () => {
      window.removeEventListener("torchx-audio-unlocked", onUnlock);
      stopRing();
      closeAlert();
    };
    // restart only when ringing starts/stops, not on every store tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringing]);

  return locked;
}

function IncomingCalls() {
  const { incoming, inCall, joinCall, declineCall } = useCall();
  const audioLocked = useRingtone(incoming.length > 0 && !inCall, incoming);

  if (!incoming.length) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[95] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
      {audioLocked && incoming.length > 0 && !inCall && (
        <div className="text-center text-[11px] text-amber-200 bg-amber-900/80 rounded-lg px-3 py-1">
          Click anywhere on the page to enable the ringtone
        </div>
      )}
      {incoming.map((c) => {
        const caller = c.from?.name || c.conversationName || "Incoming call";
        const sub =
          c.kind === "group" && c.conversationName
            ? `${c.conversationName} · ${c.media === "video" ? "Video" : "Voice"} call`
            : c.kind === "meeting"
              ? "Meeting"
              : `${c.media === "video" ? "Video" : "Voice"} call`;
        return (
          <div key={c.roomKey} className="bg-gray-900 text-white rounded-2xl shadow-2xl border border-white/10 p-4 flex items-center gap-3">
            <Avatar name={caller} photo="" size={48} seed={c.from?.key || c.roomKey} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{caller}</p>
              <p className="text-xs text-gray-400 truncate">{inCall ? `${sub} · you're in another call` : sub}</p>
            </div>
            <button
              type="button"
              onClick={() => declineCall(c.roomKey)}
              title="Decline"
              className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
            >
              <FaPhoneSlash />
            </button>
            {!inCall && (
              <button
                type="button"
                onClick={() =>
                  Promise.resolve(joinCall({ roomKey: c.roomKey, media: c.media })).catch((err) =>
                    toast.error(err?.message || "Couldn't join the call."),
                  )
                }
                title="Accept"
                className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center"
              >
                {c.media === "video" ? <FaVideo /> : <FaPhoneAlt />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CallOverlay() {
  const { lastEnded, clearLastEnded, error, clearError, inCall } = useCall();

  useEffect(() => {
    if (!lastEnded || inCall) return;
    const dur = lastEnded.durationSec ? ` · ${formatDuration(lastEnded.durationSec)}` : "";
    toast(`Call ended${dur}`, { icon: "📞" });
    clearLastEnded();
  }, [lastEnded, inCall, clearLastEnded]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    clearError();
  }, [error, clearError]);

  return (
    <>
      <IncomingCalls />
      <CallScreen />
    </>
  );
}