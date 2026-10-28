// WebRTC mesh call manager (non-React singleton). One RTCPeerConnection per other
// participant *socket*; the backend only relays signalling over Socket.IO.
//
// Negotiation uses the "perfect negotiation" pattern, so camera on/off in an audio
// call and screen share can renegotiate at any time without glare.
// Mesh is comfortable up to ~6-8 people; bigger all-hands need an SFU.
import { emitAck, emitQuiet } from "../chatSocket";
import { useCallStore } from "../../auth/store/call/callStore";

const store = () => useCallStore.getState();
const MESH_WARN_AT = 8;

let socket = null;
let ice = [];
let mySocketId = null;
let busy = false; // start/join in flight
const pcs = new Map(); // socketId -> peer entry
const local = { stream: null, screenStream: null };
const ringTimers = new Map();

// ------------------------------------------------------------------ media

const friendlyMediaError = (err, wantVideo) => {
  const name = err?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return new Error(`Allow microphone${wantVideo ? " and camera" : ""} access in your browser to join the call.`);
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return new Error("No microphone found. Plug one in and try again.");
  if (name === "NotReadableError") return new Error("Your microphone or camera is being used by another app.");
  return new Error(err?.message || "Could not access your microphone.");
};

const getLocalMedia = async (wantVideo) => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Calls need a secure (https) connection and a supported browser.");
  }
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio,
      video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
    });
    return { stream, cameraBlocked: false };
  } catch (err) {
    if (wantVideo) {
      // camera denied/missing: join with audio only instead of failing the call
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
        return { stream, cameraBlocked: true };
      } catch (err2) {
        throw friendlyMediaError(err2, false);
      }
    }
    throw friendlyMediaError(err, false);
  }
};

const stopStream = (s) => s && s.getTracks().forEach((t) => t.stop());

// ------------------------------------------------------------------ peers

const sendSignal = (to, data) => {
  const a = store().active;
  if (a && socket) socket.emit("call:signal", { roomKey: a.roomKey, to, data }, () => {});
};

const addLocalTracks = (entry) => {
  if (entry.tracksAdded) return;
  entry.tracksAdded = true;
  if (local.stream) local.stream.getTracks().forEach((t) => entry.pc.addTrack(t, local.stream));
  if (local.screenStream) {
    const t = local.screenStream.getVideoTracks()[0];
    if (t) entry.screenSender = entry.pc.addTrack(t, local.screenStream);
  }
};

const closePeer = (socketId) => {
  const e = pcs.get(socketId);
  if (!e) return;
  e.pc.onicecandidate = e.pc.ontrack = e.pc.onconnectionstatechange = e.pc.onnegotiationneeded = null;
  try { e.pc.close(); } catch { /* already closed */ }
  pcs.delete(socketId);
};

const createPeer = (socketId, { initiator }) => {
  const existing = pcs.get(socketId);
  if (existing) return existing;

  const pc = new RTCPeerConnection({ iceServers: ice });
  const entry = {
    pc,
    polite: String(mySocketId) < String(socketId), // exactly one side yields on glare
    makingOffer: false,
    ignoreOffer: false,
    remoteSet: false,
    pending: [],
    tracksAdded: false,
    screenSender: null,
  };
  pcs.set(socketId, entry);

  pc.onicecandidate = (e) => e.candidate && sendSignal(socketId, { candidate: e.candidate });

  pc.ontrack = (e) => {
    const stream = e.streams[0] || new MediaStream([e.track]);
    const peer = store().active?.peers[socketId] || {};
    // first stream = camera/mic; a different second stream = their screen share
    if (!peer.stream || peer.stream.id === stream.id) {
      store().patchPeer(socketId, { stream, tracksVersion: (peer.tracksVersion || 0) + 1 });
    } else {
      store().patchPeer(socketId, { screenStream: stream, tracksVersion: (peer.tracksVersion || 0) + 1 });
    }
    stream.onremovetrack = () => {
      if (stream.getTracks().length) return;
      const p = store().active?.peers[socketId];
      if (p?.screenStream?.id === stream.id) store().patchPeer(socketId, { screenStream: null });
    };
  };

  pc.onconnectionstatechange = () => {
    store().patchPeer(socketId, { connectionState: pc.connectionState });
    if (pc.connectionState === "connected") store().patchActive({ status: "connected" });
    if (pc.connectionState === "failed") {
      try { pc.restartIce(); } catch { /* ignore */ }
    }
  };

  pc.onnegotiationneeded = async () => {
    try {
      entry.makingOffer = true;
      await pc.setLocalDescription();
      sendSignal(socketId, { description: pc.localDescription });
    } catch (err) {
      console.warn("[call] negotiation failed:", err);
    } finally {
      entry.makingOffer = false;
    }
  };

  // The newcomer adds its tracks first => negotiationneeded => offer to this peer.
  // Existing peers wait for that offer and add their tracks when answering.
  if (initiator) addLocalTracks(entry);
  return entry;
};

const handleSignal = async (from, data) => {
  const a = store().active;
  if (!a) return;
  const entry = pcs.get(from) || createPeer(from, { initiator: false });
  const { pc } = entry;
  const { description, candidate } = data || {};
  try {
    if (description) {
      const collision = description.type === "offer" && (entry.makingOffer || pc.signalingState !== "stable");
      entry.ignoreOffer = !entry.polite && collision;
      if (entry.ignoreOffer) return;

      await pc.setRemoteDescription(description); // polite side rolls back implicitly
      entry.remoteSet = true;
      for (const c of entry.pending.splice(0)) await pc.addIceCandidate(c).catch(() => {});

      if (description.type === "offer") {
        addLocalTracks(entry); // reuses the transceivers the offer created
        await pc.setLocalDescription();
        sendSignal(from, { description: pc.localDescription });
      }
    } else if (candidate) {
      if (!entry.remoteSet) entry.pending.push(candidate);
      else await pc.addIceCandidate(candidate).catch((err) => { if (!entry.ignoreOffer) console.warn("[call] ICE:", err); });
    }
  } catch (err) {
    console.warn("[call] signal handling failed:", err);
  }
};

// ------------------------------------------------------------------ room lifecycle

const setupRoom = (ack, stream, cameraBlocked) => {
  ice = ack.iceServers || [];
  mySocketId = ack.you.socketId;
  local.stream = stream;

  store().setActive({
    roomKey: ack.roomKey,
    callId: ack.callId,
    kind: ack.kind,
    media: ack.media,
    title: ack.title || "",
    conversationId: ack.conversationId,
    meetingId: ack.meetingId,
    hostKeys: ack.hostKeys || [],
    mySocketId,
    status: ack.peers.length || ack.status === "active" ? "connecting" : "ringing",
    startedAt: Date.now(),
    localStream: stream,
    screenStream: null,
    audio: stream.getAudioTracks().some((t) => t.enabled),
    video: stream.getVideoTracks().some((t) => t.enabled),
    screen: false,
    cameraBlocked: !!cameraBlocked,
    mutedByHost: false,
    presenterSocketId: ack.presenterSocketId || null,
    peers: {},
  });

  for (const p of ack.peers) {
    store().patchPeer(p.socketId, { ...p, stream: null, screenStream: null, connectionState: "new", tracksVersion: 0 });
    createPeer(p.socketId, { initiator: true });
  }
  if (ack.peers.length + 1 > MESH_WARN_AT) {
    store().setError(`This call has ${ack.peers.length + 1} people. Video quality may drop on slower devices.`);
  }
};

const cleanup = () => {
  [...pcs.keys()].forEach(closePeer);
  stopStream(local.stream);
  stopStream(local.screenStream);
  local.stream = null;
  local.screenStream = null;
  mySocketId = null;
  busy = false;
  store().setActive(null);
};

const ensureIdle = () => {
  if (store().active || busy) throw new Error("You're already in a call.");
};

// ------------------------------------------------------------------ public actions

// Call someone from a chat. media: "audio" | "video"
const startCall = async ({ conversationId, media = "video" }) => {
  ensureIdle();
  busy = true;
  store().clearError();
  let stream;
  try {
    const m = await getLocalMedia(media === "video");
    stream = m.stream;
    const ack = await emitAck("call:start", { conversationId, media });
    setupRoom(ack, stream, m.cameraBlocked);
    busy = false;
    return ack;
  } catch (err) {
    stopStream(stream);
    busy = false;
    store().setError(err.message);
    throw err;
  }
};

// Pick up an incoming call, or join a running one. roomKey from the "call:incoming" payload.
const joinCall = async ({ roomKey, media = "video" }) => {
  ensureIdle();
  busy = true;
  store().clearError();
  store().setLastEnded(null);
  let stream;
  try {
    const m = await getLocalMedia(media === "video");
    stream = m.stream;
    const hasVideo = stream.getVideoTracks().length > 0;
    const ack = await emitAck("call:join", { roomKey, audio: true, video: hasVideo });
    store().removeIncoming(roomKey);
    store().setWaiting(null);
    setupRoom(ack, stream, m.cameraBlocked);
    busy = false;
    return ack;
  } catch (err) {
    stopStream(stream);
    busy = false;
    if (err.code === "WAITING_FOR_HOST" || err.code === "TOO_EARLY") {
      store().setWaiting({ roomKey, meetingId: roomKey.replace(/^meeting:/, ""), media, code: err.code });
    } else {
      store().setError(err.message);
    }
    throw err;
  }
};

// Join a meeting. If the host hasn't started it yet this rejects with
// err.code === "WAITING_FOR_HOST" and the manager keeps retrying automatically when
// the server announces "meeting:started" (state.waiting is set meanwhile).
const joinMeeting = (meetingId, { media = "video" } = {}) => joinCall({ roomKey: `meeting:${meetingId}`, media });

const cancelWaiting = () => store().setWaiting(null);

const declineCall = async (roomKey, reason = "declined") => {
  store().removeIncoming(roomKey);
  try { await emitAck("call:decline", { roomKey, reason }, 5000); } catch { /* call already over */ }
};

const leave = async () => {
  const a = store().active;
  if (!a) return;
  const roomKey = a.roomKey;
  cleanup(); // hang up locally first so the UI never feels stuck
  try { await emitAck("call:leave", { roomKey }, 3000); } catch { /* server also cleans up on disconnect */ }
};

// Host / group admin only: ends the call for everyone.
const endForAll = async () => {
  const a = store().active;
  if (!a) return;
  try {
    await emitAck("call:end", { roomKey: a.roomKey });
  } catch (err) {
    store().setError(err.message);
    throw err;
  }
};

const toggleAudio = () => {
  const a = store().active;
  if (!a || !local.stream) return;
  const next = !a.audio;
  local.stream.getAudioTracks().forEach((t) => (t.enabled = next));
  store().patchActive({ audio: next, mutedByHost: false });
  emitQuiet("call:media-state", { roomKey: a.roomKey, audio: next });
};

// Camera on/off. In an audio-only call this turns the camera on for the first time
// (adds a video track and renegotiates). Turning off hides the video; the camera
// light may stay on until you leave the call.
const toggleVideo = async () => {
  const a = store().active;
  if (!a || !local.stream) return;
  const track = local.stream.getVideoTracks()[0];
  if (track) {
    const next = !track.enabled;
    track.enabled = next;
    store().patchActive({ video: next });
    emitQuiet("call:media-state", { roomKey: a.roomKey, video: next });
    return;
  }
  try {
    const cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
    const t = cam.getVideoTracks()[0];
    local.stream.addTrack(t);
    pcs.forEach((e) => e.pc.addTrack(t, local.stream)); // fires negotiationneeded
    store().patchActive({ video: true, cameraBlocked: false, localStream: new MediaStream(local.stream.getTracks()) });
    emitQuiet("call:media-state", { roomKey: a.roomKey, video: true });
  } catch (err) {
    const e = friendlyMediaError(err, true);
    store().setError(e.message.replace("microphone and camera", "camera"));
    throw e;
  }
};

const stopScreenShare = async () => {
  const a = store().active;
  if (!a || !local.screenStream) return;
  pcs.forEach((e) => {
    if (e.screenSender) {
      try { e.pc.removeTrack(e.screenSender); } catch { /* ignore */ }
      e.screenSender = null;
    }
  });
  stopStream(local.screenStream);
  local.screenStream = null;
  store().patchActive({ screen: false, screenStream: null, presenterSocketId: a.presenterSocketId === mySocketId ? null : a.presenterSocketId });
  try { await emitAck("call:screen-share:stop", { roomKey: a.roomKey }, 3000); } catch { /* ignore */ }
};

// Share your screen / a window / a tab. Only one person can present at a time
// (rejects with err.code === "SHARE_IN_USE" if someone else already is).
const startScreenShare = async () => {
  const a = store().active;
  if (!a || local.screenStream) return;
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen sharing isn't supported on this device or browser.");

  let ds;
  try {
    ds = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
  } catch (err) {
    if (err?.name === "NotAllowedError" || err?.name === "AbortError") return; // user pressed Cancel
    throw err;
  }
  try {
    await emitAck("call:screen-share:start", { roomKey: a.roomKey });
  } catch (err) {
    stopStream(ds);
    store().setError(err.message);
    throw err;
  }

  const track = ds.getVideoTracks()[0];
  track.onended = () => stopScreenShare(); // browser's own "Stop sharing" button
  local.screenStream = ds;
  pcs.forEach((e) => {
    e.screenSender = e.pc.addTrack(track, ds); // fires negotiationneeded
  });
  store().patchActive({ screen: true, screenStream: ds, presenterSocketId: mySocketId });
  emitQuiet("call:media-state", { roomKey: a.roomKey, screen: true });
};

const kick = (socketId) => emitAck("call:kick", { roomKey: store().active?.roomKey, socketId });
const requestMute = (socketId) => emitAck("call:mute-request", { roomKey: store().active?.roomKey, socketId });

// ------------------------------------------------------------------ socket wiring

// Called once by useChatRealtime. Returns a detach function.
const attach = (sock) => {
  socket = sock;
  let lostConnection = false;

  const onIncoming = (c) => {
    store().addIncoming({ ...c, expiresAt: Date.now() + (c.ringSeconds || 45) * 1000 });
    clearTimeout(ringTimers.get(c.roomKey));
    ringTimers.set(c.roomKey, setTimeout(() => store().removeIncoming(c.roomKey), (c.ringSeconds || 45) * 1000));
  };
  const onDismissed = ({ roomKey }) => {
    clearTimeout(ringTimers.get(roomKey));
    store().removeIncoming(roomKey);
  };
  const onPeerJoined = ({ roomKey, peer }) => {
    const a = store().active;
    if (!a || a.roomKey !== roomKey) return;
    store().patchPeer(peer.socketId, { ...peer, stream: null, screenStream: null, connectionState: "new", tracksVersion: 0 });
    createPeer(peer.socketId, { initiator: false }); // they will send us an offer
    if (a.status === "ringing") store().patchActive({ status: "connecting" }); // someone picked up
    if (Object.keys(store().active.peers).length + 1 > MESH_WARN_AT) {
      store().setError(`This call has ${Object.keys(store().active.peers).length + 1} people. Video quality may drop on slower devices.`);
    }
  };
  const onPeerLeft = ({ roomKey, socketId }) => {
    if (store().active?.roomKey !== roomKey) return;
    closePeer(socketId);
    store().removePeer(socketId);
  };
  const onSignal = ({ roomKey, from, data }) => {
    if (store().active?.roomKey === roomKey) handleSignal(from, data);
  };
  const onMediaState = ({ roomKey, socketId, audio, video, screen }) => {
    if (store().active?.roomKey !== roomKey) return;
    store().patchPeer(socketId, { audio, video, screen });
  };
  const onScreenShare = ({ roomKey, socketId, sharing }) => {
    const a = store().active;
    if (!a || a.roomKey !== roomKey) return;
    store().patchPeer(socketId, { screen: sharing, ...(sharing ? {} : { screenStream: null }) });
    if (sharing) store().patchActive({ presenterSocketId: socketId });
    else if (a.presenterSocketId === socketId) store().patchActive({ presenterSocketId: null });
  };
  const onAnswered = ({ roomKey }) => {
    if (store().active?.roomKey === roomKey) store().patchActive({ status: "connecting" });
  };
  const onEnded = ({ roomKey, reason, status, durationSec }) => {
    onDismissed({ roomKey });
    if (store().active?.roomKey !== roomKey) return;
    cleanup();
    store().setLastEnded({ roomKey, reason, status, durationSec });
  };
  const onKicked = ({ roomKey }) => {
    if (store().active?.roomKey !== roomKey) return;
    cleanup();
    store().setLastEnded({ roomKey, reason: "removed", status: "ended", durationSec: 0 });
  };
  const onMuteRequest = ({ roomKey }) => {
    const a = store().active;
    if (!a || a.roomKey !== roomKey || !local.stream) return;
    local.stream.getAudioTracks().forEach((t) => (t.enabled = false));
    store().patchActive({ audio: false, mutedByHost: true });
    emitQuiet("call:media-state", { roomKey, audio: false });
  };
  // host opened a meeting I was waiting for -> go in
  const onMeetingStarted = ({ meetingId }) => {
    const w = store().waiting;
    if (w && w.meetingId === meetingId && !store().active) joinMeeting(meetingId, { media: w.media }).catch(() => {});
  };

  // Network blip: the server drops us from the call on disconnect, so rejoin on reconnect.
  const onDisconnect = () => {
    if (store().active) {
      lostConnection = true;
      store().patchActive({ status: "reconnecting" });
    }
  };
  const onConnect = async () => {
    const a = store().active;
    if (!lostConnection || !a) return;
    lostConnection = false;
    try {
      [...pcs.keys()].forEach(closePeer);
      store().patchActive({ peers: {} });
      const ack = await emitAck("call:join", { roomKey: a.roomKey, audio: a.audio, video: a.video });
      ice = ack.iceServers || ice;
      mySocketId = ack.you.socketId;
      store().patchActive({ mySocketId, status: "connecting", presenterSocketId: ack.presenterSocketId || null });
      for (const p of ack.peers) {
        store().patchPeer(p.socketId, { ...p, stream: null, screenStream: null, connectionState: "new", tracksVersion: 0 });
        createPeer(p.socketId, { initiator: true });
      }
    } catch {
      cleanup();
      store().setLastEnded({ roomKey: a.roomKey, reason: "disconnected", status: "ended", durationSec: 0 });
    }
  };

  const handlers = {
    "call:incoming": onIncoming,
    "call:dismissed": onDismissed,
    "call:peer-joined": onPeerJoined,
    "call:peer-left": onPeerLeft,
    "call:signal": onSignal,
    "call:media-state": onMediaState,
    "call:screen-share": onScreenShare,
    "call:answered": onAnswered,
    "call:ended": onEnded,
    "call:kicked": onKicked,
    "call:mute-request": onMuteRequest,
    "meeting:started": onMeetingStarted,
    disconnect: onDisconnect,
    connect: onConnect,
  };
  Object.entries(handlers).forEach(([ev, fn]) => sock.on(ev, fn));

  return () => {
    Object.entries(handlers).forEach(([ev, fn]) => sock.off(ev, fn));
    ringTimers.forEach(clearTimeout);
    ringTimers.clear();
    if (store().active) cleanup();
    socket = null;
  };
};

export const callManager = {
  attach,
  startCall,
  joinCall,
  joinMeeting,
  cancelWaiting,
  declineCall,
  leave,
  endForAll,
  toggleAudio,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  kick,
  requestMute,
};
