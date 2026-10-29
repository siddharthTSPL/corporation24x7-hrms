// Live call state, in memory. One "room" per active call / live meeting.
// A room's peers are SOCKETS (not people): one person with two tabs open is two
// peers, which is exactly what WebRTC needs (one RTCPeerConnection per socket).
//
// Durable history is in Models/callsession.model.js. If you scale to several
// Node processes, move this to Redis (and use the socket.io Redis adapter).
const rooms = new Map(); // roomKey -> room

const conversationRoomKey = (conversationId) => `conversation:${conversationId}`;
const meetingRoomKey = (meetingId) => `meeting:${meetingId}`;
const socketRoomName = (roomKey) => `call:${roomKey}`;

const get = (roomKey) => rooms.get(roomKey) || null;

const create = ({ roomKey, callId, kind, media, organisation_id, conversationId = null, meetingId = null, initiatorKey, hostKeys = [], invitedKeys = [], title = "" }) => {
  const room = {
    roomKey,
    callId: String(callId),
    kind,
    media,
    organisation_id: String(organisation_id),
    conversationId: conversationId ? String(conversationId) : null,
    directConversationConverted: false,
    meetingId: meetingId ? String(meetingId) : null,
    title,
    initiatorKey,
    hostKeys: new Set(hostKeys),
    invitedKeys: new Set(invitedKeys),
    declinedKeys: new Set(),
    peers: new Map(), // socketId -> peer
    everJoined: new Map(), // key -> { joinedAt, leftAt }
    presenterSocketId: null,
    status: "ringing",
    createdAt: Date.now(),
    answeredAt: null,
    ringTimer: null,
    ending: false,
  };
  rooms.set(roomKey, room);
  return room;
};

const remove = (roomKey) => {
  const room = rooms.get(roomKey);
  if (room && room.ringTimer) clearTimeout(room.ringTimer);
  rooms.delete(roomKey);
};

const publicPeer = (socketId, p) => ({
  socketId,
  key: p.key,
  id: p.id,
  model: p.model,
  name: p.name,
  photo: p.photo,
  audio: p.audio,
  video: p.video,
  screen: p.screen,
  joinedAt: p.joinedAt,
});

const peerList = (room, exceptSocketId = null) =>
  [...room.peers.entries()].filter(([sid]) => sid !== exceptSocketId).map(([sid, p]) => publicPeer(sid, p));

const distinctPeople = (room) => new Set([...room.peers.values()].map((p) => p.key));

// Adds (or refreshes) a peer. Returns { peer, firstForPerson, distinctCount }.
const addPeer = (room, socketId, person, { audio = true, video = false } = {}) => {
  const firstForPerson = !distinctPeople(room).has(person.key);
  const peer = {
    key: person.key,
    id: person.id,
    model: person.model,
    name: person.name,
    photo: person.photo || "",
    audio: !!audio,
    video: !!video,
    screen: false,
    joinedAt: new Date(),
  };
  room.peers.set(socketId, peer);
  const prev = room.everJoined.get(person.key);
  room.everJoined.set(person.key, { joinedAt: prev ? prev.joinedAt : new Date(), leftAt: null });
  return { peer, firstForPerson, distinctCount: distinctPeople(room).size };
};

// Removes a peer. Returns { peer, wasPresenter, personGone, empty }.
const removePeer = (room, socketId) => {
  const peer = room.peers.get(socketId);
  if (!peer) return null;
  room.peers.delete(socketId);
  const wasPresenter = room.presenterSocketId === socketId;
  if (wasPresenter) room.presenterSocketId = null;
  const personGone = !distinctPeople(room).has(peer.key);
  if (personGone) {
    const e = room.everJoined.get(peer.key);
    if (e) e.leftAt = new Date();
  }
  return { peer, wasPresenter, personGone, empty: room.peers.size === 0 };
};

const isModerator = (room, key) => room.hostKeys.has(key);

// Rooms this person is connected to right now (any of their tabs/devices counts).
const roomsWithPerson = (key) => {
  const out = [];
  for (const room of rooms.values()) {
    if (room.ending) continue;
    for (const p of room.peers.values()) {
      if (p.key === key) { out.push(room); break; }
    }
  }
  return out;
};

// "Busy on a call" - true while the person is inside any call / meeting.
const isInCall = (key) => roomsWithPerson(key).length > 0;

// Calls someone could still pick up right now (for people who connect late).
const ringingFor = (key) => {
  const out = [];
  for (const room of rooms.values()) {
    if (room.status === "ringing" && room.invitedKeys.has(key) && !room.declinedKeys.has(key) && room.initiatorKey !== key) out.push(room);
  }
  return out;
};

// Live rooms a person is allowed to see/join (powers "join call" banners).
const activeFor = (key) => {
  const out = [];
  for (const room of rooms.values()) {
    if (room.invitedKeys.has(key) || room.initiatorKey === key || room.hostKeys.has(key)) out.push(room);
  }
  return out;
};

const summary = (room) => ({
  callId: room.callId,
  roomKey: room.roomKey,
  kind: room.kind,
  media: room.media,
  conversationId: room.conversationId,
  meetingId: room.meetingId,
  title: room.title,
  status: room.status,
  initiatorKey: room.initiatorKey,
  startedAt: new Date(room.createdAt),
  participants: [...distinctPeople(room)],
  presenterSocketId: room.presenterSocketId,
});

module.exports = {
  conversationRoomKey,
  meetingRoomKey,
  socketRoomName,
  get,
  create,
  remove,
  addPeer,
  removePeer,
  peerList,
  publicPeer,
  distinctPeople,
  isModerator,
  roomsWithPerson,
  isInCall,
  ringingFor,
  activeFor,
  summary,
  _rooms: rooms, // exposed for tests
};
