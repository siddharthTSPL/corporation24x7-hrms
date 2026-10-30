import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaPhoneSlash,
  FaHandPaper,
  FaRegSmile,
  FaCommentDots,
  FaUsers,
  FaMagic,
  FaShieldAlt,
  FaCompressAlt,
  FaLink,
  FaLock,
  FaCheck,
} from "react-icons/fa";
import useCall from "../../../realtime/useCall";
import { useConversation, useChatMessages } from "../../../auth/server-state/chat/chat.hook";
import Avatar from "../../chat/Avatar";
import { formatDuration } from "../../chat/chatUtils";
import RoomTile from "./RoomTile";
import ReactionLayer from "./ReactionLayer";
import ReactionTray from "./ReactionTray";
import ChatPanel from "./ChatPanel";
import PeoplePanel from "./PeoplePanel";
import EffectsPanel, { useRestoreEffect } from "./EffectsPanel";
import HostPanel from "./HostPanel";
import { MediaView, RoomButton } from "./RoomMedia";

const gridCols = (n) => {
  if (n <= 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 md:grid-cols-2";
  if (n <= 4) return "grid-cols-2";
  if (n <= 6) return "grid-cols-2 lg:grid-cols-3";
  if (n <= 9) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-3 lg:grid-cols-4";
};

const useClock = (startedAt, running) => {
  const [now, setNow] = useState(() => Date.now());
  const [mountedAt] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!running) return 0;
  const base = startedAt ? Number(startedAt) : mountedAt;
  return Math.max(0, (now - base) / 1000);
};

const run = (fn) => () => Promise.resolve().then(fn).catch((err) => toast.error(err?.message || "Something went wrong."));

function EndDialog({ onClose, onLeave, onEnd }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1b1b20] p-5 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold">Leave this meeting?</p>
        <p className="mt-1 text-sm text-gray-400">You can leave and let others continue, or end the meeting for everyone.</p>
        <div className="mt-5 space-y-2">
          <button type="button" onClick={onLeave} className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">Just leave</button>
          <button type="button" onClick={onEnd} className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold hover:bg-red-700">End for everyone</button>
          <button type="button" onClick={onClose} className="w-full rounded-xl px-4 py-2.5 text-sm text-gray-400 hover:text-white">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function LobbyBanner({ onOpen }) {
  const { active, admit } = useCall();
  const lobby = active?.lobby || [];
  if (!lobby.length) return null;
  const first = lobby[0];
  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-30 flex w-[min(460px,calc(100%-1.5rem))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-400/40 bg-[#2a2418]/95 px-4 py-3 shadow-2xl backdrop-blur">
      <Avatar name={first.name} photo={first.photo} size={38} seed={first.key} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-amber-50">{first.name || "Someone"}{lobby.length > 1 ? ` and ${lobby.length - 1} more` : ""}</p>
        <p className="text-[11px] text-amber-200/70">{lobby.length > 1 ? "are waiting to join" : "is waiting to join"}</p>
      </div>
      <button type="button" onClick={onOpen} className="rounded-full px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-white/10">View</button>
      <button type="button" onClick={run(() => admit(first.socketId))} className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">
        <FaCheck className="text-[10px]" /> Admit
      </button>
    </div>
  );
}

export default function MeetingRoom({ onMinimize, guest = false, guestName = "" }) {
  const {
    active, peers, myKey, isHost, isPresenting,
    toggleAudio, toggleVideo, startScreenShare, stopScreenShare, leave, endForAll, raiseHand, lowerHand,
  } = useCall();

  const [panel, setPanel] = useState(null);
  const [tray, setTray] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [pinnedId, setPinnedId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [seenLastId, setSeenLastId] = useState(null);
  const seededRef = useRef(false);
  const lastToastRef = useRef(null);

  const conversationId = guest ? null : active?.conversationId;
  const { data: conversation } = useConversation(conversationId);
  const { messages, isFetched: chatReady } = useChatMessages(conversationId);
  const elapsed = useClock(active?.startedAt, active?.status === "connected");

  useRestoreEffect({ isGuest: guest });

  const self = conversation?.participants?.find((p) => p.key === myKey);
  const selfName = guest ? guestName || "You" : self?.name || "You";
  const settings = active?.settings || {};
  const hands = active?.hands || {};
  const handKeys = Object.entries(hands).sort((a, b) => new Date(a[1].raisedAt) - new Date(b[1].raisedAt)).map(([k]) => k);
  const myHand = !!(myKey && hands[myKey]);
  const lobbyCount = (active?.lobby || []).length;
  const chatAllowed = !guest && !!conversationId;
  const canShare = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
  const shareBlocked = settings.screenShare === "host" && !isHost;
  const handsBlocked = settings.handRaiseEnabled === false && !isHost;
  const reactionsBlocked = settings.reactionsEnabled === false && !isHost;

  useEffect(() => {
    if (!chatReady || seededRef.current) return;
    seededRef.current = true;
    setSeenLastId(messages.length ? messages[messages.length - 1].id : null);
  }, [chatReady, messages]);

  const unread = useMemo(() => {
    if (!seededRef.current && !chatReady) return 0;
    const idx = seenLastId ? messages.findIndex((m) => m.id === seenLastId) : -1;
    return messages.slice(idx + 1).filter((m) => m.senderKey !== myKey && !m.deletedAt).length;
  }, [messages, seenLastId, myKey, chatReady]);

  useEffect(() => {
    if (panel === "chat" || !seededRef.current || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last.senderKey === myKey || last.pending || lastToastRef.current === last.id) return;
    lastToastRef.current = last.id;
    toast(`${last.sender?.name || "Someone"}: ${String(last.text || "Sent a file").slice(0, 80)}`, { icon: "💬", id: "meeting-chat-new" });
  }, [messages, panel, myKey]);

  useEffect(() => {
    if (panel === "host" && !isHost) setPanel(null);
  }, [panel, isHost]);

  useEffect(() => {
    if (pinnedId && pinnedId !== "me" && !peers.some((p) => p.socketId === pinnedId)) setPinnedId(null);
  }, [peers, pinnedId]);

  if (!active) return null;

  const presenter = peers.find((p) => p.screenStream);
  const hasCameraTrack = !!active.localStream?.getVideoTracks().length;
  const orderOf = (key) => {
    const idx = handKeys.indexOf(key);
    return idx >= 0 ? idx + 1 : 0;
  };

  const selfTile = {
    id: "me",
    name: selfName,
    photo: self?.photo || "",
    seed: myKey || "me",
    stream: active.localStream,
    muted: true,
    audioOn: active.audio,
    videoOn: active.video && hasCameraTrack,
    mirror: true,
    label: isPresenting ? `${selfName} (presenting)` : `${selfName} (You)`,
    handRaised: myHand,
    handOrder: myHand ? orderOf(myKey) : 0,
    isHostTile: (active.hostKeys || []).includes(myKey) && active.ownerKey === myKey,
  };

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
    handRaised: !!hands[p.key],
    handOrder: hands[p.key] ? orderOf(p.key) : 0,
    isHostTile: active.ownerKey === p.key,
  }));

  const allTiles = [selfTile, ...peerTiles];
  const pinned = pinnedId ? allTiles.find((t) => t.id === pinnedId) : null;
  const togglePin = (id) => setPinnedId((cur) => (cur === id ? null : id));

  const status =
    active.status === "reconnecting" ? "Reconnecting…" : active.status === "connected" ? formatDuration(elapsed) : "Connecting…";

  const openPanel = (name) => {
    setTray(false);
    setPanel((cur) => (cur === name ? null : name));
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL || "/"}meetings/${active.meetingId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  const onLeave = () => {
    if (isHost && peers.length > 0) setConfirmEnd(true);
    else run(leave)();
  };

  const toggleHand = run(() => (myHand ? lowerHand() : raiseHand()));
  const toggleShare = run(() => (isPresenting || active.screen ? stopScreenShare() : startScreenShare()));

  const renderStage = () => {
    if (presenter || pinned) {
      const rest = (pinned ? allTiles.filter((t) => t.id !== pinned.id) : allTiles);
      return (
        <div className="flex h-full min-h-0 flex-col gap-2 lg:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-black ring-1 ring-white/5">
            {presenter ? (
              <>
                <MediaView stream={presenter.screenStream} muted contain />
                <div className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1.5 text-xs backdrop-blur-sm">{presenter.name || "Someone"} is presenting</div>
              </>
            ) : (
              <RoomTile tile={pinned} large pinned onPin={() => togglePin(pinned.id)} />
            )}
          </div>
          <div className="flex min-h-0 gap-2 overflow-auto lg:w-56 lg:flex-col">
            {rest.map((t) => (
              <div key={t.id} className="aspect-video h-24 shrink-0 lg:h-auto lg:w-full">
                <RoomTile tile={t} compact onPin={() => togglePin(t.id)} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (allTiles.length === 2) {
      const other = peerTiles[0];
      return (
        <div className="relative h-full min-h-0">
          <RoomTile tile={other} large onPin={() => togglePin(other.id)} />
          <div className="absolute bottom-3 right-3 z-10 aspect-video w-36 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/20 sm:w-48">
            <RoomTile tile={selfTile} compact />
          </div>
        </div>
      );
    }

    if (allTiles.length === 1) {
      return (
        <div className="h-full min-h-0">
          <RoomTile tile={selfTile} large />
        </div>
      );
    }

    const many = allTiles.length > 12;
    return (
      <div className={`grid h-full min-h-0 gap-2 ${gridCols(allTiles.length)} ${many ? "auto-rows-[minmax(150px,1fr)] overflow-y-auto" : "auto-rows-fr"}`}>
        {allTiles.map((t) => (
          <RoomTile key={t.id} tile={t} onPin={t.id === "me" ? undefined : () => togglePin(t.id)} />
        ))}
      </div>
    );
  };

  const panelBody = {
    chat: <ChatPanel onClose={() => setPanel(null)} onSeen={setSeenLastId} />,
    people: <PeoplePanel onClose={() => setPanel(null)} selfPerson={{ name: selfName, photo: self?.photo }} />,
    effects: <EffectsPanel onClose={() => setPanel(null)} isGuest={guest} />,
    host: <HostPanel onClose={() => setPanel(null)} onEndAll={() => setConfirmEnd(true)} />,
  }[panel];

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#101013] text-white">
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{active.title || "Meeting"}</p>
          <p className="flex items-center gap-2 text-xs text-gray-400">
            <span className={`h-1.5 w-1.5 rounded-full ${active.status === "connected" ? "bg-emerald-400" : "animate-pulse bg-amber-400"}`} />
            <span className={active.status === "connected" ? "text-emerald-300" : "text-amber-200"}>{status}</span>
            <span className="text-gray-600">·</span>
            <span>{peers.length + 1} in meeting</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {active.locked && (
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-medium text-amber-200 sm:flex">
              <FaLock className="text-[9px]" /> Locked
            </span>
          )}
          {active.mutedByHost && <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] text-amber-300">Muted by host</span>}
          {!guest && active.meetingId && (
            <button type="button" onClick={copyLink} title="Copy meeting link" className="flex h-9 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-medium hover:bg-white/20">
              {copied ? <FaCheck className="text-emerald-300" /> : <FaLink />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
            </button>
          )}
          {onMinimize && (
            <button type="button" onClick={onMinimize} title="Minimise" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <FaCompressAlt className="text-xs" />
            </button>
          )}
        </div>
      </header>

      {active.status === "reconnecting" && (
        <div className="mx-4 mb-2 rounded-xl bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-200">Connection lost. Trying to get you back in…</div>
      )}

      <div className="relative flex min-h-0 flex-1 gap-3 px-3 pb-2">
        <div className="relative min-w-0 flex-1">
          {renderStage()}
          <ReactionLayer />
          {isHost && panel !== "people" && <LobbyBanner onOpen={() => openPanel("people")} />}
        </div>

        {panelBody && (
          <aside className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#1b1b20] shadow-2xl md:static md:z-auto md:w-[380px] md:shrink-0 md:rounded-2xl">
            {panelBody}
          </aside>
        )}
      </div>

      {isPresenting && <p className="pb-1 text-center text-xs text-amber-300">You're sharing your screen</p>}

      <footer className="relative flex flex-wrap items-center justify-center gap-2 px-3 pb-5 pt-2 sm:gap-3">
        {tray && !reactionsBlocked && (
          <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2">
            <ReactionTray onDone={() => setTray(false)} canLoad={!guest} />
          </div>
        )}

        <RoomButton onClick={toggleAudio} active={!active.audio} title={active.audio ? "Mute" : "Unmute"}>
          {active.audio ? <FaMicrophone /> : <FaMicrophoneSlash className="text-red-600" />}
        </RoomButton>
        <RoomButton onClick={run(toggleVideo)} active={!active.video} title={active.video ? "Turn camera off" : "Turn camera on"}>
          {active.video ? <FaVideo /> : <FaVideoSlash className="text-red-600" />}
        </RoomButton>
        <RoomButton onClick={() => openPanel("effects")} active={panel === "effects" || active.effect?.effect !== "none"} disabled={!hasCameraTrack} title="Backgrounds & effects">
          <FaMagic />
        </RoomButton>
        <RoomButton onClick={() => setTray((v) => !v)} active={tray} disabled={reactionsBlocked} title={reactionsBlocked ? "Reactions are off" : "Reactions"}>
          <FaRegSmile />
        </RoomButton>
        <RoomButton onClick={toggleHand} active={myHand} disabled={handsBlocked} title={handsBlocked ? "Raise hand is off" : myHand ? "Lower hand" : "Raise hand"}>
          <FaHandPaper className={myHand ? "text-amber-600" : ""} />
        </RoomButton>
        {canShare && (
          <RoomButton onClick={toggleShare} active={isPresenting || active.screen} disabled={shareBlocked} title={shareBlocked ? "Only the host can share" : active.screen ? "Stop sharing" : "Share screen"} className="hidden sm:flex">
            <FaDesktop />
          </RoomButton>
        )}

        <span className="mx-1 hidden h-7 w-px bg-white/10 md:block" />

        <RoomButton onClick={() => openPanel("people")} active={panel === "people"} badge={lobbyCount || (handKeys.length ? handKeys.length : 0)} title="People">
          <FaUsers />
        </RoomButton>
        {chatAllowed && (
          <RoomButton onClick={() => openPanel("chat")} active={panel === "chat"} badge={panel === "chat" ? 0 : unread} title="Chat">
            <FaCommentDots />
          </RoomButton>
        )}
        {isHost && (
          <RoomButton onClick={() => openPanel("host")} active={panel === "host"} title="Host controls">
            <FaShieldAlt />
          </RoomButton>
        )}

        <RoomButton onClick={onLeave} danger wide title="Leave meeting" className="ml-1">
          <FaPhoneSlash />
          <span className="hidden text-sm font-semibold sm:inline">Leave</span>
        </RoomButton>
      </footer>

      {confirmEnd && (
        <EndDialog
          onClose={() => setConfirmEnd(false)}
          onLeave={() => {
            setConfirmEnd(false);
            run(leave)();
          }}
          onEnd={() => {
            setConfirmEnd(false);
            run(endForAll)();
          }}
        />
      )}
    </div>
  );
}
