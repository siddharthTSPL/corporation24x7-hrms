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
  FaUserPlus,
  FaSearch,
  FaCheck,
} from "react-icons/fa";
import useCall from "../../realtime/useCall";
import { useActiveCalls, useConversation, useDirectorySearch } from "../../auth/server-state/chat/chat.hook";
import Avatar from "./Avatar";
import { formatDuration } from "./chatUtils";
import { startRingtone, showIncomingCallAlert, isAudioLocked } from "../notifications/Callsound";

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

function Tile({ name, photo, seed, stream, muted, audioOn, videoOn, mirror, label, reconnecting, avatarSize = 72 }) {
  return (
    <div className="relative w-full h-full min-h-0 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center">
      <MediaView stream={stream} muted={muted} mirror={mirror} hidden={!videoOn} />
      {!videoOn && <Avatar name={name} photo={photo} size={avatarSize} seed={seed} />}
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
  const { active, peers, myKey, isHost, isPresenting, toggleAudio, toggleVideo, startScreenShare, stopScreenShare, leave, endForAll, invitePeople } = useCall();
  const [minimized, setMinimized] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const { data: conversation } = useConversation(active?.conversationId);
  const { data: directoryPeople = [] } = useDirectorySearch(inviteQuery, { enabled: inviteOpen && conversation?.type === "direct" });
  const elapsed = useElapsed(active?.startedAt, active?.status === "connected");

  useEffect(() => {
    if (active?.callId) setMinimized(false);
  }, [active?.callId]);

  if (!active) return null;

  const statusText =
    active.status === "connected" ? formatDuration(elapsed) : active.status === "ringing" ? "Ringing…" : "Connecting…";
  const directTarget = conversation?.type === "direct" ? conversation.otherPerson : null;
  const title = active.kind === "direct"
    ? directTarget?.name || active.title || conversation?.name || "Call"
    : active.title || conversation?.name || (active.kind === "meeting" ? "Meeting" : "Call");
  const presenter = peers.find((p) => p.screenStream);
  const self = conversation?.participants?.find((p) => p.key === myKey);
  const waitingTarget = active.kind === "direct" && peers.length === 0
    ? directTarget || { key: "call-target", name: title, photo: conversation?.photo || "" }
    : null;
  const joinedKeys = new Set([myKey, ...peers.map((p) => p.key)].filter(Boolean));
  const candidateSource = conversation?.type === "direct" ? directoryPeople : conversation?.participants || [];
  const candidates = candidateSource
    .filter((p) => !joinedKeys.has(p.key))
    .filter((p) => conversation?.type === "direct" || active.kind === "group")
    .filter((p) => `${p.name} ${p.designation || ""} ${p.department || ""}`.toLowerCase().includes(inviteQuery.toLowerCase().trim()));

  const inviteSelected = async () => {
    try {
      const result = await invitePeople(selectedKeys);
      if (result.invited?.length) toast.success(`Calling ${result.invited.map((p) => p.name).join(", ")}.`);
      if (result.busy?.length) toast(`${result.busy.map((p) => p.name).join(", ")} ${result.busy.length === 1 ? "is" : "are"} already on a call.`);
      if (!result.invited?.length && !result.busy?.length) toast("No one new to invite.");
      setSelectedKeys([]);
      setInviteOpen(false);
    } catch (err) {
      toast.error(err?.message || "Couldn't invite people.");
    }
  };

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
    const miniParticipants = active.kind === "direct"
      ? peers.length ? peers.slice(0, 1) : [{ ...waitingTarget, socketId: waitingTarget.key }]
      : peers.slice(0, 3);
    const participantCount = active.kind === "direct" ? 1 : peers.length + 1;
    const connected = active.status === "connected";
    return (
      <div className="fixed bottom-4 right-4 z-[90] w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-slate-950 text-white shadow-[0_18px_55px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#730042] via-fuchsia-500 to-emerald-400" />
        <div className="px-4 pt-3.5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
              {active.media === "video" ? <FaVideo /> : <FaPhoneAlt />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-300">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                <span className={connected ? "text-emerald-300" : "text-amber-200"}>{statusText}</span>
              </p>
            </div>
            <button type="button" onClick={() => setMinimized(false)} title="Open call" className="w-9 h-9 rounded-full text-gray-300 hover:bg-white/10 hover:text-white flex items-center justify-center">
              <FaExpandAlt className="text-xs" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border-y border-white/10 bg-white/[0.03]">
          <div className="flex items-center pl-1">
            {active.kind !== "direct" && <Avatar name="You" size={30} seed="you" />}
            {miniParticipants.map((p) => (
              <div key={p.socketId} className={`${active.kind === "direct" ? "" : "-ml-2.5"} rounded-full ring-2 ring-slate-950`}>
                <Avatar name={p.name || "Participant"} photo={p.photo} size={30} seed={p.key || p.socketId} />
              </div>
            ))}
            {participantCount > 4 && <span className="-ml-2.5 w-[30px] h-[30px] rounded-full ring-2 ring-slate-950 bg-slate-700 text-[9px] flex items-center justify-center">+{participantCount - 4}</span>}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-200">{participantCount} {participantCount === 1 ? "person" : "people"}</p>
            <p className="text-[10px] text-gray-400 truncate">{active.kind === "direct" ? peers.length ? `With ${peers[0].name || waitingTarget.name}` : `${active.status === "ringing" ? "Calling" : "Connecting to"} ${waitingTarget.name}` : peers.length ? peers.map((p) => p.name || "Participant").join(", ") : connected ? "You are the only one here" : "Waiting for someone to join"}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-3.5">
          <button type="button" onClick={toggleAudio} title={active.audio ? "Mute microphone" : "Unmute microphone"} className={`h-10 min-w-20 px-3 rounded-full flex items-center justify-center gap-2 text-xs font-semibold ${active.audio ? "bg-white/10 hover:bg-white/15 text-white" : "bg-amber-300 text-gray-900 hover:bg-amber-200"}`}>
            {active.audio ? <FaMicrophone /> : <FaMicrophoneSlash />}<span>{active.audio ? "Mute" : "Muted"}</span>
          </button>
          <button type="button" onClick={run(toggleVideo)} title={active.video ? "Turn camera off" : "Turn camera on"} className={`h-10 min-w-20 px-3 rounded-full flex items-center justify-center gap-2 text-xs font-semibold ${active.video ? "bg-white/10 hover:bg-white/15 text-white" : "bg-white/10 hover:bg-white/15 text-gray-300"}`}>
            {active.video ? <FaVideo /> : <FaVideoSlash />}<span>{active.video ? "Camera" : "Video off"}</span>
          </button>
          <button type="button" onClick={run(leave)} title="Leave call" className="h-10 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center">
            <FaPhoneSlash />
          </button>
        </div>
        <div className="absolute w-0 h-0 overflow-hidden">
          {peers.map((p) => (
            <MediaView key={p.socketId} stream={p.stream} hidden />
          ))}
        </div>
      </div>
    );
  }

  const selfTile = {
    id: "me",
    name: "You",
    photo: self?.photo || "",
    seed: "me",
    stream: active.localStream,
    muted: true,
    audioOn: active.audio,
    videoOn: active.video && !!active.localStream,
    mirror: true,
    label: isPresenting ? "You (presenting)" : "You",
  };
  const callingTile = waitingTarget ? {
      id: "calling-target",
      name: waitingTarget.name || "Calling…",
      photo: waitingTarget.photo || "",
      seed: waitingTarget.key || "calling-target",
      stream: null,
      muted: false,
      audioOn: false,
      videoOn: false,
      mirror: false,
      label: `${active.status === "ringing" ? "Calling" : active.status === "connected" ? "With" : "Connecting to"} ${waitingTarget.name || "person"}`,
    } : null;
  const peerTiles = peers.map((p) => ({
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
    }));
  const tiles = active.kind === "direct"
    ? (peerTiles.length ? peerTiles : [callingTile || selfTile])
    : [selfTile, ...peerTiles];

  return (
    <div className="fixed inset-0 z-[90] bg-gray-950 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-emerald-300">{statusText}</p>
        </div>
        <div className="flex items-center gap-2">
          {active.mutedByHost && <span className="text-[11px] bg-amber-500/20 text-amber-300 rounded-full px-2.5 py-1">Muted by host</span>}
          {active.kind !== "meeting" && (
            <button type="button" onClick={() => setInviteOpen(true)} title="Invite people" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <FaUserPlus className="text-sm" />
            </button>
          )}
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
              <Tile key={t.id} {...t} avatarSize={active.kind === "direct" ? 144 : 72} />
            ))}
          </div>
        )}
      </div>

      {hiddenAudio}

      {isPresenting && (
        <div className="text-center text-xs text-amber-300 pb-1">You're sharing your screen</div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setInviteOpen(false)}>
          <section className="w-full max-w-sm max-h-[80vh] bg-white text-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-sm">{conversation?.type === "direct" ? "Invite people" : "Invite group members"}</p>
              <div className="relative mt-3">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input value={inviteQuery} onChange={(e) => setInviteQuery(e.target.value)} placeholder="Search members" className="w-full pl-8 pr-3 py-2 rounded-full bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-[#730042]/30" />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {candidates.map((p) => {
                const selected = selectedKeys.includes(p.key);
                return (
                  <button key={p.key} type="button" onClick={() => setSelectedKeys((prev) => selected ? prev.filter((key) => key !== p.key) : [...prev, p.key])} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50">
                    <Avatar name={p.name} photo={p.photo} size={38} seed={p.key} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">{p.name}</span>
                      <span className="block text-xs text-gray-500 truncate">{p.designation || p.department || "Group member"}</span>
                    </span>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? "bg-[#730042] border-[#730042] text-white" : "border-gray-300"}`}>
                      {selected && <FaCheck className="text-[9px]" />}
                    </span>
                  </button>
                );
              })}
              {!candidates.length && <p className="text-center text-xs text-gray-400 py-8">No available members found.</p>}
            </div>
            <div className="flex justify-end gap-2 p-3 border-t border-gray-100">
              <button type="button" onClick={() => setInviteOpen(false)} className="px-3 py-2 text-xs font-semibold text-gray-600 rounded-full hover:bg-gray-100">Cancel</button>
              <button type="button" onClick={inviteSelected} disabled={!selectedKeys.length} className="px-4 py-2 text-xs font-semibold text-white bg-[#730042] rounded-full disabled:opacity-50">Call selected ({selectedKeys.length})</button>
            </div>
          </section>
        </div>
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
            <Avatar name={caller} photo={c.from?.photo || ""} size={48} seed={c.from?.key || c.roomKey} />
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

function RejoinCalls() {
  const { active, incoming, inCall, joinCall } = useCall();
  const { data: calls = [] } = useActiveCalls(!inCall);
  if (inCall || active) return null;
  const ringingKeys = new Set(incoming.map((call) => call.roomKey));
  const available = calls.filter((call) => call.kind === "group" && call.status === "active" && !ringingKeys.has(call.roomKey));
  if (!available.length) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[94] flex flex-col gap-2 w-[min(420px,calc(100vw-2rem))]">
      {available.slice(0, 3).map((call) => (
        <div key={call.roomKey} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-xl border border-emerald-100">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{call.title || "Group call"}</p>
            <p className="text-xs text-gray-500">{call.participants?.length || 0} people in the call</p>
          </div>
          <button
            type="button"
            onClick={() => Promise.resolve(joinCall({ roomKey: call.roomKey, media: call.media })).catch((err) => toast.error(err?.message || "Couldn't rejoin the call."))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex-shrink-0"
          >
            <FaPhoneAlt className="text-[10px]" /> Rejoin
          </button>
        </div>
      ))}
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
      <RejoinCalls />
      <CallScreen />
    </>
  );
}
