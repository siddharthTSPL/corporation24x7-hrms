// WebRTC mesh call manager (non-React singleton). One RTCPeerConnection per other
// participant *socket*; the backend only relays signalling over Socket.IO.
//
// Negotiation uses the "perfect negotiation" pattern, so camera on/off in an audio
// call and screen share can renegotiate at any time without glare.
// Mesh is comfortable up to ~6-8 people; bigger all-hands need an SFU.
import toast from "react-hot-toast";
import { emitAck, emitAckRetry, emitQuiet } from "../chatSocket";
import { useCallStore } from "../../auth/store/call/callStore";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { createEffectProcessor, loadEffectImage } from "./videoEffects";
import { audioConstraints, videoConstraints, setMediaPrefs } from "./mediaPrefs";

const store = () => useCallStore.getState();
const MESH_WARN_AT = 8;

let socket = null;
let ice = [];
let mySocketId = null;
let busy = false; // start/join in flight
const pcs = new Map(); // socketId -> peer entry
const local = { stream: null, screenStream: null, camera: null, processor: null };
const ringTimers = new Map();

const SESSION_KEY = "torchx_meeting_session";
const SESSION_MAX_AGE = 12 * 3600 * 1000;
const NO_EFFECT = { effect: "none", blurIntensity: 50, imageUrl: "", backgroundId: null };

const saveSession = (data) => {
  try {
    const prev = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") || {};
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...prev, ...data, at: Date.now() }));
  } catch {
    return;
  }
};

const readSession = () => {
  try {
    const d = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!d || !d.roomKey || Date.now() - (d.at || 0) > SESSION_MAX_AGE) return null;
    return d;
  } catch {
    return null;
  }
};

const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
};

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
      video: wantVideo ? videoConstraints() : false,
    });
    stream.getAudioTracks().forEach((track) => {
      try { track.contentHint = "speech"; } catch { /* optional browser hint */ }
    });
    return { stream, cameraBlocked: false };
  } catch (err) {
    if (wantVideo) {
      // camera denied/missing: join with audio only instead of failing the call
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
        stream.getAudioTracks().forEach((track) => {
          try { track.contentHint = "speech"; } catch { /* optional browser hint */ }
        });
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
  if (local.stream) {
    local.stream.getTracks().forEach((t) => {
      const sender = entry.pc.addTrack(t, local.stream);
      if (t.kind === "video") entry.videoSender = sender;
    });
  }
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
    videoSender: null,
  };
  pcs.set(socketId, entry);

  pc.onicecandidate = (e) => e.candidate && sendSignal(socketId, { candidate: e.candidate });

  pc.ontrack = (e) => {
    const active = store().active;
    const peer = active?.peers[socketId] || {};
    const remoteStream = e.streams[0] || null;
    const isScreen = remoteStream
      ? entry.remoteScreenStreamId === remoteStream.id || (!!entry.remoteCameraStreamId && entry.remoteCameraStreamId !== remoteStream.id)
      : (!!peer.screen || active?.presenterSocketId === socketId);
    if (remoteStream && !isScreen && !entry.remoteCameraStreamId) entry.remoteCameraStreamId = remoteStream.id;
    if (remoteStream && isScreen) entry.remoteScreenStreamId = remoteStream.id;
    let stream = remoteStream;
    if (!stream) {
      const streamKey = isScreen ? "remoteScreenStream" : "remoteMediaStream";
      stream = entry[streamKey] || (entry[streamKey] = new MediaStream());
      if (!stream.getTracks().some((track) => track.id === e.track.id)) stream.addTrack(e.track);
    }
    // first stream = camera/mic; a different second stream = their screen share
    if (!isScreen && (!peer.stream || peer.stream.id === stream.id)) {
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
  local.camera = stream.getVideoTracks()[0] || null;
  if (ack.mutedOnEntry) stream.getAudioTracks().forEach((t) => (t.enabled = false));

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
    locked: !!ack.locked,
    settings: ack.settings || {},
    lobby: Array.isArray(ack.waiting) ? ack.waiting : [],
    hands: {},
    reactions: [],
    effect: { ...NO_EFFECT },
    peers: {},
  });
  store().setHands(ack.hands);
  store().setWaiting(null);
  if (ack.kind === "meeting") {
    saveSession({
      phase: "in",
      roomKey: ack.roomKey,
      meetingId: ack.meetingId,
      media: ack.media,
      title: ack.title || "",
      audio: stream.getAudioTracks().some((t) => t.enabled),
      video: stream.getVideoTracks().some((t) => t.enabled),
    });
  }

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
  if (local.processor) local.processor.stop();
  if (local.camera) local.camera.stop();
  stopStream(local.stream);
  stopStream(local.screenStream);
  local.stream = null;
  local.screenStream = null;
  local.camera = null;
  local.processor = null;
  clearSession();
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
    const ack = await emitAckRetry("call:start", { conversationId, media });
    setupRoom(ack, stream, m.cameraBlocked);
    busy = false;
    return ack;
  } catch (err) {
    stopStream(stream);
    busy = false;
    // "X is on another call" is shown as a normal toast by the chat header, not as a call error
    if (err.code !== "USER_BUSY" && err.code !== "SELF_BUSY") store().setError(err.message);
    throw err;
  }
};

// Pick up an incoming call, or join a running one. roomKey from the "call:incoming" payload.
const joinCall = async ({ roomKey, media = "video", audio = true, video = true }) => {
  ensureIdle();
  busy = true;
  store().clearError();
  store().setLastEnded(null);
  let stream;
  try {
    const m = await getLocalMedia(media === "video");
    stream = m.stream;
    if (audio === false) stream.getAudioTracks().forEach((t) => (t.enabled = false));
    if (video === false) stream.getVideoTracks().forEach((t) => (t.enabled = false));
    const hasVideo = stream.getVideoTracks().some((t) => t.enabled);
    const ack = await emitAckRetry("call:join", { roomKey, audio: audio !== false, video: hasVideo });
    // Lobby: the host has to let this person in. Release the mic/camera and wait for "meeting:admitted".
    if (ack.waiting === true) {
      stopStream(stream);
      busy = false;
      store().removeIncoming(roomKey);
      store().setWaiting({ roomKey, meetingId: ack.meetingId || roomKey.replace(/^meeting:/, ""), media, code: "LOBBY", title: ack.title, position: ack.position });
      saveSession({ phase: "lobby", roomKey, meetingId: ack.meetingId || roomKey.replace(/^meeting:/, ""), media, title: ack.title || "", audio: audio !== false, video: video !== false });
      return ack;
    }
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
      saveSession({ phase: "lobby", roomKey, meetingId: roomKey.replace(/^meeting:/, ""), media, audio: audio !== false, video: video !== false });
    } else {
      store().setWaiting(null);
      if (err.code !== "OFFLINE" && err.code !== "TIMEOUT") clearSession();
      store().setError(err.message);
    }
    throw err;
  }
};

// Join a meeting. If the host hasn't started it yet this rejects with
// err.code === "WAITING_FOR_HOST" and the manager keeps retrying automatically when
// the server announces "meeting:started" (state.waiting is set meanwhile).
const joinMeeting = (meetingId, { media = "video", audio = true, video = true } = {}) =>
  joinCall({ roomKey: `meeting:${meetingId}`, media, audio, video });

const cancelWaiting = () => {
  const w = store().waiting;
  store().setWaiting(null);
  clearSession();
  if (w?.code === "LOBBY") emitQuiet("meeting:lobby-leave", { roomKey: w.roomKey });
};

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
  saveSession({ audio: next });
  emitQuiet("call:media-state", { roomKey: a.roomKey, audio: next });
};

// Camera on/off. In an audio-only call this turns the camera on for the first time
// (adds a video track and renegotiates). Turning off hides the video; the camera
// light may stay on until you leave the call.
const currentVideoTrack = () => (local.stream ? local.stream.getVideoTracks()[0] || null : null);

const setVideoEnabled = (value) => {
  if (local.camera) local.camera.enabled = value;
  const t = currentVideoTrack();
  if (t) t.enabled = value;
  if (local.processor) local.processor.setPaused(!value);
};

const swapSentVideo = (next) => {
  const prev = currentVideoTrack();
  if (prev === next) return;
  const enabled = prev ? prev.enabled : true;
  if (prev) local.stream.removeTrack(prev);
  if (next) {
    next.enabled = enabled;
    local.stream.addTrack(next);
  }
  pcs.forEach((e) => {
    if (e.videoSender) {
      e.videoSender.replaceTrack(next).catch(() => {});
    } else if (next) {
      e.videoSender = e.pc.addTrack(next, local.stream);
    }
  });
};

let effectChain = Promise.resolve();

const runVideoEffect = async (cfg) => {
  const a = store().active;
  if (!a || !local.stream) return;
  const effect = cfg.effect === "blur" || cfg.effect === "image" ? cfg.effect : "none";
  const next = {
    effect,
    blurIntensity: Number(cfg.blurIntensity) || 50,
    imageUrl: effect === "image" ? cfg.imageUrl || "" : "",
    backgroundId: effect === "image" ? cfg.backgroundId || null : null,
  };
  if (!local.camera) {
    store().patchActive({ effect: next });
    return;
  }
  if (effect === "none") {
    if (local.processor) {
      local.processor.stop();
      local.processor = null;
    }
    swapSentVideo(local.camera);
  } else {
    const image = effect === "image" ? await loadEffectImage(next.imageUrl) : null;
    if (!local.processor) local.processor = await createEffectProcessor(local.camera);
    local.processor.setConfig({ effect, blurIntensity: next.blurIntensity, image });
    swapSentVideo(local.processor.track);
    local.processor.setPaused(!local.camera.enabled);
  }
  const track = currentVideoTrack();
  store().patchActive({
    effect: next,
    localStream: new MediaStream(local.stream.getTracks()),
    video: track ? track.enabled : false,
  });
};

const setVideoEffect = (cfg = {}) => {
  const run = effectChain.then(() => runVideoEffect(cfg));
  effectChain = run.catch(() => {});
  return run;
};

const toggleVideo = async () => {
  const a = store().active;
  if (!a || !local.stream) return;
  const track = currentVideoTrack();
  if (track) {
    const next = !track.enabled;
    setVideoEnabled(next);
    store().patchActive({ video: next });
    saveSession({ video: next });
    emitQuiet("call:media-state", { roomKey: a.roomKey, video: next });
    return;
  }
  try {
    const cam = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() });
    const t = cam.getVideoTracks()[0];
    local.camera = t;
    local.stream.addTrack(t);
    pcs.forEach((e) => {
      e.videoSender = e.pc.addTrack(t, local.stream);
    });
    store().patchActive({ video: true, cameraBlocked: false, localStream: new MediaStream(local.stream.getTracks()) });
    saveSession({ video: true });
    emitQuiet("call:media-state", { roomKey: a.roomKey, video: true });
    const fx = store().active?.effect;
    if (fx && fx.effect !== "none") await setVideoEffect(fx).catch(() => {});
  } catch (err) {
    const e = friendlyMediaError(err, true);
    store().setError(e.message.replace("microphone and camera", "camera"));
    throw e;
  }
};

// Change microphone / camera in the middle of a meeting (also remembered for next time).
const switchDevice = async (kind, deviceId) => {
  const a = store().active;
  if (kind === "audio") setMediaPrefs({ audioDeviceId: deviceId });
  else setMediaPrefs({ videoDeviceId: deviceId });
  if (!a || !local.stream) return;

  if (kind === "audio") {
    const fresh = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints({ audioDeviceId: deviceId }) }).catch((err) => {
      throw friendlyMediaError(err, false);
    });
    const next = fresh.getAudioTracks()[0];
    const prev = local.stream.getAudioTracks()[0];
    next.enabled = prev ? prev.enabled : a.audio;
    if (prev) {
      local.stream.removeTrack(prev);
      prev.stop();
    }
    local.stream.addTrack(next);
    pcs.forEach((e) => {
      const sender = e.pc.getSenders().find((s) => s.track?.kind === "audio" && s.track !== local.screenStream?.getAudioTracks()[0]) || null;
      if (sender) sender.replaceTrack(next).catch(() => {});
    });
    store().patchActive({ localStream: new MediaStream(local.stream.getTracks()) });
    return;
  }

  if (!local.camera) return; // no camera running yet: the choice is used the next time it is turned on
  const fresh = await navigator.mediaDevices.getUserMedia({ video: videoConstraints({ videoDeviceId: deviceId }) }).catch((err) => {
    throw friendlyMediaError(err, true);
  });
  const next = fresh.getVideoTracks()[0];
  next.enabled = local.camera.enabled;
  const oldCamera = local.camera;
  const hadEffect = !!local.processor;
  if (local.processor) {
    local.processor.stop();
    local.processor = null;
  }
  local.camera = next;
  swapSentVideo(next);
  oldCamera.stop();
  store().patchActive({ localStream: new MediaStream(local.stream.getTracks()) });
  const fx = store().active?.effect;
  if (hadEffect && fx && fx.effect !== "none") await setVideoEffect(fx).catch(() => {});
};

const stopScreenShare = async () => {
  const a = store().active;
  if (!a || !local.screenStream) return;
  pcs.forEach((e) => {
    if (e.screenSender) {
      try { e.pc.removeTrack(e.screenSender); } catch { /* ignore */ }
      e.screenSender = null;
    }
    if (e.screenAudioSender) {
      try { e.pc.removeTrack(e.screenAudioSender); } catch { /* ignore */ }
      e.screenAudioSender = null;
    }
  });
  stopStream(local.screenStream);
  local.screenStream = null;
  store().patchActive({ screen: false, screenStream: null, screenAudio: false, presenterSocketId: a.presenterSocketId === mySocketId ? null : a.presenterSocketId });
  try { await emitAck("call:screen-share:stop", { roomKey: a.roomKey }, 3000); } catch { /* ignore */ }
};

// Share your screen / a window / a tab. Only one person can present at a time
// (rejects with err.code === "SHARE_IN_USE" if someone else already is).
const startScreenShare = async ({ audio = false } = {}) => {
  const a = store().active;
  if (!a || local.screenStream) return;
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error("Screen sharing isn't supported on this device or browser.");

  let ds;
  try {
    ds = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: !!audio });
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
  const shareAudio = ds.getAudioTracks()[0] || null; // tab / system audio, only when the browser offers it
  pcs.forEach((e) => {
    e.screenSender = e.pc.addTrack(track, ds); // fires negotiationneeded
    e.screenAudioSender = shareAudio ? e.pc.addTrack(shareAudio, ds) : null;
  });
  store().patchActive({ screen: true, screenStream: ds, screenAudio: !!shareAudio, presenterSocketId: mySocketId });
  emitQuiet("call:media-state", { roomKey: a.roomKey, screen: true });
};

const kick = (socketId) => emitAck("call:kick", { roomKey: store().active?.roomKey, socketId });
const requestMute = (socketId) => emitAck("call:mute-request", { roomKey: store().active?.roomKey, socketId });
const invitePeople = (keys) => emitAck("call:invite", { roomKey: store().active?.roomKey, keys });

// Meeting host / co-host controls (the server rejects anyone else)
const roomNow = () => store().active?.roomKey;
const admit = (socketId) => emitAck("meeting:lobby-admit", { roomKey: roomNow(), socketId });
const admitAll = () => emitAck("meeting:lobby-admit", { roomKey: roomNow(), all: true });
const deny = (socketId, block = false) => emitAck("meeting:lobby-deny", { roomKey: roomNow(), socketId, block });
const denyAll = () => emitAck("meeting:lobby-deny", { roomKey: roomNow(), all: true });
const setLocked = (locked) => emitAck("meeting:lock", { roomKey: roomNow(), locked });
const muteAll = () => emitAck("call:mute-all", { roomKey: roomNow() });
const updateMeetingSettings = (settings) => emitAck("meeting:settings", { roomKey: roomNow(), settings });
const raiseHand = () => emitAck("call:hand:raise", { roomKey: roomNow() });
const lowerHand = (key) => emitAck("call:hand:lower", { roomKey: roomNow(), key });
const lowerAllHands = () => emitAck("call:hand:lower-all", { roomKey: roomNow() });
const sendReaction = (emoji) => emitAck("call:reaction", { roomKey: roomNow(), emoji });
const setCoHost = (key, cohost = true) => emitAck("meeting:set-cohost", { roomKey: roomNow(), key, cohost });

const resumeMeeting = async () => {
  const saved = readSession();
  if (!saved || store().active || busy) return false;
  const meetingId = saved.meetingId || String(saved.roomKey).replace(/^meeting:/, "");
  store().setWaiting({ roomKey: saved.roomKey, meetingId, media: saved.media || "video", code: "RESUME", title: saved.title || "" });
  try {
    await joinCall({ roomKey: saved.roomKey, media: saved.media || "video", audio: saved.audio, video: saved.video });
    return true;
  } catch (err) {
    const w = store().waiting;
    if (!w || w.code === "RESUME") store().setWaiting(null);
    if (!["WAITING_FOR_HOST", "TOO_EARLY", "OFFLINE", "TIMEOUT"].includes(err.code)) clearSession();
    return false;
  }
};

let resumeRequested = false;

const startResume = (sock) => {
  if (sock.connected) resumeMeeting();
  else sock.once("connect", () => resumeMeeting());
};

const requestResume = () => {
  if (!readSession()) return;
  if (socket) startResume(socket);
  else resumeRequested = true;
};

const hasSavedMeeting = () => !!readSession();

// ------------------------------------------------------------------ socket wiring

// Called once by useChatRealtime. Returns a detach function.
const attach = (sock) => {
  socket = sock;
  let lostConnection = false;

  const onIncoming = (c) => {
    // the server tags every ring with the person it is for: never ring for someone else's call
    const me = useChatStore.getState().myKey;
    if (c.to && me && c.to !== me) return;
    // already on a call: tell the caller we're busy instead of ringing on top of it
    if (store().active || busy) {
      emitQuiet("call:decline", { roomKey: c.roomKey, reason: "busy" });
      return;
    }
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
  const onReaction = (reaction) => {
    if (store().active?.roomKey !== reaction.roomKey) return;
    store().addReaction(reaction);
    const id = store().active?.reactions?.at(-1)?.id;
    setTimeout(() => store().removeReaction(id), 3200);
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
  const onHand = ({ roomKey, key, name, raised, raisedAt, order }) => {
    const a = store().active;
    if (!a || a.roomKey !== roomKey) return;
    if (raised) {
      store().patchHand(key, { raisedAt, order, name });
      if (key !== useChatStore.getState().myKey && (a.hostKeys || []).includes(useChatStore.getState().myKey)) {
        toast(`${name || "Someone"} raised a hand`, { icon: "✋", id: `hand-${key}` });
      }
    } else {
      store().patchHand(key, null);
    }
  };
  const onHandsCleared = ({ roomKey, keys }) => {
    if (store().active?.roomKey === roomKey) store().clearHands(keys);
  };
  const onReaction = ({ roomKey, socketId, key, name, emoji }) => {
    if (store().active?.roomKey !== roomKey) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    store().addReaction({ emoji, name, key, socketId, ref: id, left: 8 + Math.round(Math.random() * 84) });
    setTimeout(() => {
      const list = store().active?.reactions || [];
      const hit = list.find((r) => r.ref === id);
      if (hit) store().removeReaction(hit.id);
    }, 3600);
  };
  const onMuteRequest = ({ roomKey }) => {
    const a = store().active;
    if (!a || a.roomKey !== roomKey || !local.stream) return;
    local.stream.getAudioTracks().forEach((t) => (t.enabled = false));
    store().patchActive({ audio: false, mutedByHost: true });
    emitQuiet("call:media-state", { roomKey, audio: false });
  };
  const onCallUpdated = ({ roomKey, kind, title }) => {
    if (store().active?.roomKey === roomKey) store().patchActive({ kind, title: title || store().active.title });
  };
  // host opened a meeting I was waiting for -> go in
  const onMeetingStarted = ({ meetingId }) => {
    const w = store().waiting;
    if (w && w.code !== "LOBBY" && w.code !== "RESUME" && w.meetingId === meetingId && !store().active) {
      const saved = readSession();
      joinMeeting(meetingId, { media: w.media, audio: saved?.audio, video: saved?.video }).catch(() => {});
    }
  };
  // host let me in from the lobby -> go in
  const onAdmitted = ({ roomKey }) => {
    const w = store().waiting;
    if (!w || w.roomKey !== roomKey || store().active) return;
    const saved = readSession();
    joinCall({ roomKey, media: w.media, audio: saved?.audio, video: saved?.video }).catch(() => {});
  };
  const onDenied = ({ roomKey }) => {
    const w = store().waiting;
    if (!w || w.roomKey !== roomKey) return;
    store().setWaiting(null);
    clearSession();
    store().setError("The host did not let you into this meeting.");
  };
  // moderators: who is waiting in the lobby
  const onLobbyUpdate = ({ roomKey, waiting }) => {
    const a = store().active;
    if (!a || a.roomKey !== roomKey) return;
    const list = waiting || [];
    const known = new Set((a.lobby || []).map((w) => w.socketId));
    list.filter((w) => !known.has(w.socketId)).forEach((w) => toast(`${w.name || "Someone"} is waiting to join`, { icon: "🚪", id: `lobby-${w.socketId}` }));
    store().patchActive({ lobby: list });
  };
  const onLocked = ({ roomKey, locked }) => {
    if (store().active?.roomKey === roomKey) store().patchActive({ locked: !!locked });
  };
  const onRoles = ({ roomKey, hostKeys }) => {
    if (store().active?.roomKey === roomKey && Array.isArray(hostKeys)) store().patchActive({ hostKeys });
  };
  const onMeetingSettings = ({ roomKey, settings }) => {
    if (store().active?.roomKey === roomKey) store().patchActive({ settings: settings || {} });
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
      const ack = await emitAckRetry("call:join", { roomKey: a.roomKey, audio: a.audio, video: a.video });
      ice = ack.iceServers || ice;
      mySocketId = ack.you.socketId;
      store().patchActive({ mySocketId, status: "connecting", presenterSocketId: ack.presenterSocketId || null, locked: !!ack.locked, settings: ack.settings || store().active?.settings || {} });
      store().setHands(ack.hands);
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
    "call:reaction": onReaction,
    "call:answered": onAnswered,
    "call:ended": onEnded,
    "call:kicked": onKicked,
    "call:hand": onHand,
    "call:hands-cleared": onHandsCleared,
    "call:reaction": onReaction,
    "call:mute-request": onMuteRequest,
    "call:updated": onCallUpdated,
    "meeting:started": onMeetingStarted,
    "meeting:admitted": onAdmitted,
    "meeting:denied": onDenied,
    "meeting:lobby-update": onLobbyUpdate,
    "meeting:locked": onLocked,
    "meeting:roles": onRoles,
    "meeting:settings": onMeetingSettings,
    disconnect: onDisconnect,
    connect: onConnect,
  };
  Object.entries(handlers).forEach(([ev, fn]) => sock.on(ev, fn));
  if (resumeRequested) {
    resumeRequested = false;
    startResume(sock);
  }

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
  invitePeople,
  admit,
  admitAll,
  deny,
  denyAll,
  setLocked,
  muteAll,
  updateMeetingSettings,
  raiseHand,
  lowerHand,
  lowerAllHands,
  sendReaction,
  setCoHost,
  setVideoEffect,
  switchDevice,
  resumeMeeting,
  requestResume,
  hasSavedMeeting,
};
