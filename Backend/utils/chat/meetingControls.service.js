const Meeting = require("../../Models/meeting.model");
const { getIO } = require("../../config/socket");
const rooms = require("./callRooms");
const { httpError } = require("./people.utils");

const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🎉", "🙏", "👎", "🔥", "💯", "🚀", "💡", "🤔", "😢"];
const SCREEN_SHARE_MODES = ["everyone", "host"];
const BOOLEAN_SETTINGS = ["lobby", "muteOnEntry", "allowUnmute", "chatEnabled", "reactionsEnabled", "handRaiseEnabled"];

const withCode = (message, code, statusCode = 409) => Object.assign(httpError(message, statusCode), { code });
const roomOf = (roomKey) => `call:${roomKey}`;

const normalizeSettings = (input, base = {}) => {
  const src = input && typeof input === "object" ? input : {};
  const out = {
    lobby: false,
    muteOnEntry: false,
    allowUnmute: true,
    chatEnabled: true,
    reactionsEnabled: true,
    handRaiseEnabled: true,
    screenShare: "everyone",
    ...base,
  };
  for (const k of BOOLEAN_SETTINGS) {
    if (typeof src[k] === "boolean") out[k] = src[k];
  }
  if (SCREEN_SHARE_MODES.includes(src.screenShare)) out.screenShare = src.screenShare;
  return out;
};

const plainSettings = (s) => normalizeSettings(s && typeof s.toObject === "function" ? s.toObject() : s);

const requireRoom = (roomKey) => {
  const room = rooms.get(String(roomKey));
  if (!room || room.ending) throw withCode("This meeting is not running.", "CALL_ENDED", 404);
  return room;
};

const requireMeetingRoom = (roomKey) => {
  const room = requireRoom(roomKey);
  if (room.kind !== "meeting") throw httpError("This control is only available in scheduled meetings.", 400);
  return room;
};

const requireInRoom = (room, socket) => {
  const peer = room.peers.get(socket.id);
  if (!peer) throw httpError("You are not in this call.", 403);
  return peer;
};

const requireModerator = (room, socket, actor) => {
  requireInRoom(room, socket);
  if (!rooms.isModerator(room, actor.key)) throw httpError("Only the host can do this.", 403);
};

const emitToModerators = (room, event, payload) => {
  const io = getIO();
  if (!io) return;
  for (const sid of rooms.moderatorSocketIds(room)) io.to(sid).emit(event, payload);
};

const emitLobby = (room) => {
  emitToModerators(room, "meeting:lobby-update", { roomKey: room.roomKey, waiting: rooms.lobbyList(room) });
};

const setHandOnPeers = (room, key, raisedAt) => {
  for (const p of room.peers.values()) {
    if (p.key === key) p.handRaisedAt = raisedAt;
  }
};

const raiseHand = (room, socket, actor) => {
  const peer = requireInRoom(room, socket);
  if (!room.settings.handRaiseEnabled && !rooms.isModerator(room, actor.key)) throw withCode("Raising hands is turned off in this meeting.", "HANDS_DISABLED", 403);
  if (room.hands.has(actor.key)) return { raised: true, raisedAt: room.hands.get(actor.key) };
  const raisedAt = Date.now();
  room.hands.set(actor.key, raisedAt);
  setHandOnPeers(room, actor.key, raisedAt);
  const order = rooms.handQueue(room).findIndex((h) => h.key === actor.key) + 1;
  getIO().to(roomOf(room.roomKey)).emit("call:hand", { roomKey: room.roomKey, key: actor.key, name: peer.name, raised: true, raisedAt: new Date(raisedAt), order });
  return { raised: true, raisedAt, order };
};

const lowerHand = (room, socket, actor, targetKey = null) => {
  requireInRoom(room, socket);
  const key = targetKey && targetKey !== actor.key ? String(targetKey) : actor.key;
  if (key !== actor.key && !rooms.isModerator(room, actor.key)) throw httpError("Only the host can lower someone else's hand.", 403);
  if (!room.hands.has(key)) return { raised: false };
  room.hands.delete(key);
  setHandOnPeers(room, key, null);
  getIO().to(roomOf(room.roomKey)).emit("call:hand", { roomKey: room.roomKey, key, raised: false, by: actor.key });
  return { raised: false };
};

const lowerAllHands = (room, socket, actor) => {
  requireModerator(room, socket, actor);
  const keys = [...room.hands.keys()];
  for (const key of keys) setHandOnPeers(room, key, null);
  room.hands.clear();
  getIO().to(roomOf(room.roomKey)).emit("call:hands-cleared", { roomKey: room.roomKey, by: actor.key, keys });
  return { cleared: keys.length };
};

const sendReaction = (room, socket, actor, emoji) => {
  const peer = requireInRoom(room, socket);
  if (!room.settings.reactionsEnabled && !rooms.isModerator(room, actor.key)) throw withCode("Reactions are turned off in this meeting.", "REACTIONS_DISABLED", 403);
  if (!REACTIONS.includes(emoji)) throw httpError("That reaction is not supported.", 400);
  getIO().to(roomOf(room.roomKey)).emit("call:reaction", { roomKey: room.roomKey, socketId: socket.id, key: actor.key, name: peer.name, emoji, at: new Date() });
};

const gateEntry = (room, socket, actor, person) => {
  if (room.kind !== "meeting") return null;
  if (rooms.isModerator(room, actor.key)) return null;
  if (room.peers.has(socket.id)) return null;
  if (room.blockedKeys.has(actor.key)) throw withCode("The host removed you from this meeting.", "REMOVED_BY_HOST", 403);
  const alreadyPresent = rooms.distinctPeople(room).has(actor.key);
  if (alreadyPresent || room.admittedKeys.has(actor.key)) return null;
  if (room.locked) throw withCode("This meeting is locked by the host.", "ROOM_LOCKED", 403);
  // Outsiders (invited by email + PIN) ALWAYS wait for the host to admit them,
  // even when the meeting's lobby setting is off.
  const isGuest = actor.model === "Guest";
  if (!room.settings.lobby && !isGuest) return null;

  const existing = [...room.lobby.values()].find((w) => w.key === actor.key && w.socketId === socket.id);
  if (!existing) {
    room.lobby.set(socket.id, {
      socketId: socket.id,
      key: actor.key,
      id: person.id,
      model: person.model,
      name: person.name,
      photo: person.photo || "",
      isGuest,
      email: isGuest ? person.email || "" : undefined,
      requestedAt: new Date(),
    });
    socket.data.lobbyRooms = socket.data.lobbyRooms || new Set();
    socket.data.lobbyRooms.add(room.roomKey);
    emitLobby(room);
  }
  return {
    waiting: true,
    roomKey: room.roomKey,
    kind: room.kind,
    title: room.title,
    meetingId: room.meetingId,
    media: room.media,
    position: [...room.lobby.keys()].indexOf(socket.id) + 1,
  };
};

const leaveLobby = (room, socket) => {
  if (!room || !room.lobby.delete(socket.id)) return false;
  if (socket.data.lobbyRooms) socket.data.lobbyRooms.delete(room.roomKey);
  emitLobby(room);
  return true;
};

const leaveAllLobbies = (socket) => {
  for (const roomKey of [...(socket.data.lobbyRooms || [])]) leaveLobby(rooms.get(roomKey), socket);
  if (socket.data.lobbyRooms) socket.data.lobbyRooms.clear();
};

const admitEntries = (room, entries) => {
  const io = getIO();
  for (const w of entries) {
    room.lobby.delete(w.socketId);
    room.admittedKeys.add(w.key);
    const s = io.sockets.sockets.get(w.socketId);
    if (s && s.data.lobbyRooms) s.data.lobbyRooms.delete(room.roomKey);
    io.to(w.socketId).emit("meeting:admitted", { roomKey: room.roomKey, meetingId: room.meetingId });
  }
  emitLobby(room);
};

const admit = (room, socket, actor, { socketId = null, all = false } = {}) => {
  requireModerator(room, socket, actor);
  const waiting = rooms.lobbyList(room);
  const entries = all ? waiting : waiting.filter((w) => w.socketId === socketId || (socketId && w.key === room.lobby.get(socketId)?.key));
  if (!all && !entries.length) throw httpError("That person is no longer waiting.", 404);
  admitEntries(room, entries);
  return { admitted: entries.length };
};

const deny = (room, socket, actor, { socketId = null, all = false, block = false } = {}) => {
  requireModerator(room, socket, actor);
  const io = getIO();
  const waiting = rooms.lobbyList(room);
  const entries = all ? waiting : waiting.filter((w) => w.socketId === socketId);
  if (!all && !entries.length) throw httpError("That person is no longer waiting.", 404);
  for (const w of entries) {
    room.lobby.delete(w.socketId);
    if (block) room.blockedKeys.add(w.key);
    const s = io.sockets.sockets.get(w.socketId);
    if (s && s.data.lobbyRooms) s.data.lobbyRooms.delete(room.roomKey);
    io.to(w.socketId).emit("meeting:denied", { roomKey: room.roomKey, meetingId: room.meetingId, by: actor.key });
  }
  emitLobby(room);
  return { denied: entries.length };
};

const setLocked = (room, socket, actor, locked) => {
  requireModerator(room, socket, actor);
  room.locked = !!locked;
  getIO().to(roomOf(room.roomKey)).emit("meeting:locked", { roomKey: room.roomKey, locked: room.locked, by: actor.key });
  return { locked: room.locked };
};

const muteAll = (room, socket, actor) => {
  requireModerator(room, socket, actor);
  const io = getIO();
  let count = 0;
  for (const [sid, p] of room.peers) {
    if (rooms.isModerator(room, p.key)) continue;
    io.to(sid).emit("call:mute-request", { roomKey: room.roomKey, by: actor.key, all: true, allowUnmute: room.settings.allowUnmute });
    count += 1;
  }
  return { requested: count };
};

const stopShareByHost = (room, socket, actor) => {
  requireModerator(room, socket, actor);
  const sid = room.presenterSocketId;
  if (!sid) return { stopped: false };
  const presenter = room.peers.get(sid);
  room.presenterSocketId = null;
  if (presenter) presenter.screen = false;
  const io = getIO();
  io.to(sid).emit("call:screen-share-stopped", { roomKey: room.roomKey, by: actor.key });
  io.to(roomOf(room.roomKey)).emit("call:screen-share", { roomKey: room.roomKey, socketId: sid, key: presenter ? presenter.key : null, name: presenter ? presenter.name : "", sharing: false });
  return { stopped: true };
};

const setCoHost = async (room, socket, actor, targetKey, cohost) => {
  requireInRoom(room, socket);
  if (room.ownerKey !== actor.key) throw httpError("Only the meeting host can change co-hosts.", 403);
  const key = String(targetKey || "");
  if (!key || key === room.ownerKey) throw httpError("The host's role cannot be changed.", 400);
  if (!room.invitedKeys.has(key) && !rooms.distinctPeople(room).has(key)) throw httpError("That person is not part of this meeting.", 404);
  if (cohost) room.hostKeys.add(key);
  else room.hostKeys.delete(key);
  if (room.meetingId) {
    await Meeting.updateOne({ _id: room.meetingId }, cohost ? { $addToSet: { coHostKeys: key } } : { $pull: { coHostKeys: key } });
  }
  getIO().to(roomOf(room.roomKey)).emit("meeting:roles", { roomKey: room.roomKey, hostKeys: [...room.hostKeys], changed: key, cohost: !!cohost, by: actor.key });
  emitLobby(room);
  return { hostKeys: [...room.hostKeys] };
};

const applySettings = async (room, actorKey, patch) => {
  const next = normalizeSettings(patch, room.settings);
  const lobbyTurnedOff = room.settings.lobby && !next.lobby;
  room.settings = next;
  if (room.meetingId) await Meeting.updateOne({ _id: room.meetingId }, { $set: { settings: next } });
  if (lobbyTurnedOff) admitEntries(room, rooms.lobbyList(room));
  getIO().to(roomOf(room.roomKey)).emit("meeting:settings", { roomKey: room.roomKey, settings: room.settings, by: actorKey });
  return room.settings;
};

const updateSettingsFromSocket = async (room, socket, actor, patch) => {
  requireModerator(room, socket, actor);
  return applySettings(room, actor.key, patch);
};

const onPersonGone = (room, key) => {
  if (room.hands.delete(key)) {
    getIO().to(roomOf(room.roomKey)).emit("call:hand", { roomKey: room.roomKey, key, raised: false, by: key });
  }
};

const onKicked = (room, key) => {
  room.blockedKeys.add(key);
  room.admittedKeys.delete(key);
  onPersonGone(room, key);
};

const dismissLobby = (room, reason = "meeting_ended") => {
  const io = getIO();
  if (!io) return;
  for (const w of rooms.lobbyList(room)) {
    const s = io.sockets.sockets.get(w.socketId);
    if (s && s.data.lobbyRooms) s.data.lobbyRooms.delete(room.roomKey);
    io.to(w.socketId).emit("meeting:denied", { roomKey: room.roomKey, meetingId: room.meetingId, reason });
  }
  room.lobby.clear();
};

const assertChatAllowed = (conversationId, actorKey) => {
  const room = rooms.byConversation(conversationId);
  if (!room || room.kind !== "meeting") return;
  if (room.settings.chatEnabled === false && !rooms.isModerator(room, actorKey)) {
    throw withCode("Chat is turned off by the host.", "CHAT_DISABLED", 403);
  }
};

const assertCanShare = (room, actorKey) => {
  if (room.settings.screenShare === "host" && !rooms.isModerator(room, actorKey)) {
    throw withCode("Only the host can share their screen in this meeting.", "SHARE_HOST_ONLY", 403);
  }
};

const liveState = (room, { forModerator = false } = {}) => ({
  running: true,
  roomKey: room.roomKey,
  status: room.status,
  locked: room.locked,
  settings: room.settings,
  hostKeys: [...room.hostKeys],
  ownerKey: room.ownerKey,
  presenterSocketId: room.presenterSocketId,
  peers: rooms.peerList(room),
  hands: rooms.handQueue(room),
  waiting: forModerator ? rooms.lobbyList(room) : undefined,
  startedAt: room.answeredAt ? new Date(room.answeredAt) : null,
});

module.exports = {
  REACTIONS,
  emitLobby,
  normalizeSettings,
  plainSettings,
  requireRoom,
  requireMeetingRoom,
  raiseHand,
  lowerHand,
  lowerAllHands,
  sendReaction,
  gateEntry,
  leaveLobby,
  leaveAllLobbies,
  admit,
  deny,
  setLocked,
  muteAll,
  stopShareByHost,
  setCoHost,
  applySettings,
  updateSettingsFromSocket,
  onPersonGone,
  onKicked,
  dismissLobby,
  assertChatAllowed,
  assertCanShare,
  liveState,
};
