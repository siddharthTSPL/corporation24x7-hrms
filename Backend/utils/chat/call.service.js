const Conversation = require("../../Models/conversation.model");
const CallSession = require("../../Models/callsession.model");
const Meeting = require("../../Models/meeting.model");
const { createBulkNotifications } = require("../Notification.utils");
const { getIO } = require("../../config/socket");
const chat = require("./chat.service");
const rooms = require("./callRooms");
const { getIceServers } = require("./ice.utils");
const { httpError, parseKey } = require("./people.utils");

const RING_SECONDS = 45;
const MEETING_EARLY_JOIN_MIN = 10; // attendees can enter this long before start
const MEETING_HOST_EARLY_MIN = 30; // host / co-hosts can open the room this early
const MEETING_LATE_GRACE_MIN = 180; // meetings may overrun; hard stop this long after end time

const withCode = (message, code, statusCode = 409, extra = {}) => Object.assign(httpError(message, statusCode), { code, ...extra });

const roomOf = (roomKey) => `call:${roomKey}`;
const fmtDuration = (sec) => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const actorFromKey = (key) => {
  const { model, id } = parseKey(key);
  return { id, model, key };
};

// ---------- meeting access ----------

// Throws a coded error the client can act on (WAITING_FOR_HOST, TOO_EARLY, ...).
const authorizeMeeting = async (actor, meetingId, { roomRunning }) => {
  if (!require("mongoose").isValidObjectId(meetingId)) throw httpError("Meeting not found.", 404);
  const meeting = await Meeting.findOne({ _id: meetingId, organisation_id: actor.organisation_id, attendeeKeys: actor.key });
  if (!meeting) throw httpError("Meeting not found.", 404);
  if (meeting.status === "cancelled") throw withCode("This meeting was cancelled.", "MEETING_CANCELLED", 410);
  if (meeting.status === "ended") throw withCode("This meeting has ended.", "MEETING_ENDED", 410);

  const now = Date.now();
  const moderator = meeting.hostKey === actor.key || meeting.coHostKeys.includes(actor.key);
  const opensAt = meeting.startTime.getTime() - (moderator ? MEETING_HOST_EARLY_MIN : MEETING_EARLY_JOIN_MIN) * 60000;
  const closesAt = meeting.endTime.getTime() + MEETING_LATE_GRACE_MIN * 60000;
  if (now > closesAt) throw withCode("This meeting is over.", "MEETING_ENDED", 410);
  if (now < opensAt && !roomRunning) throw withCode("This meeting hasn't opened yet.", "TOO_EARLY", 425, { startsAt: meeting.startTime });
  if (!roomRunning && !moderator && !meeting.allowJoinBeforeHost) {
    throw withCode("Waiting for the host to start the meeting.", "WAITING_FOR_HOST", 409, { startsAt: meeting.startTime });
  }
  return { meeting, moderator };
};

// ---------- start / join ----------

const startConversationCall = async (actor, person, { conversationId, media }) => {
  const conv = await chat.loadConversation(actor, conversationId);
  if (conv.type === "meeting") throw httpError("Join meeting calls from the meeting itself.");
  const roomKey = rooms.conversationRoomKey(conv._id);
  const existing = rooms.get(roomKey);
  if (existing) return { room: existing, existing: true };

  const m = media === "audio" ? "audio" : "video";
  const invited = conv.participantKeys.filter((k) => k !== actor.key);
  const admins = conv.participants.filter((p) => p.role === "admin").map((p) => p.key);
  const hostKeys = conv.type === "direct" ? conv.participantKeys : [...new Set([actor.key, ...admins])];

  const session = await CallSession.create({
    organisation_id: actor.organisation_id,
    roomKey,
    kind: conv.type,
    media: m,
    conversation: conv._id,
    initiator: actor.id,
    initiatorModel: actor.model,
    initiatorKey: actor.key,
    invitedKeys: invited,
    status: "ringing",
  });

  // two people pressed "call" at once: keep the first room, discard ours
  const raced = rooms.get(roomKey);
  if (raced) {
    await CallSession.deleteOne({ _id: session._id });
    return { room: raced, existing: true };
  }

  const room = rooms.create({
    roomKey, callId: session._id, kind: conv.type, media: m, organisation_id: actor.organisation_id,
    conversationId: conv._id, initiatorKey: actor.key, hostKeys, invitedKeys: invited,
    title: conv.type === "group" ? conv.name : "",
  });
  room.initiatorName = person.name;

  chat.emitToKeys(invited, "call:incoming", {
    callId: room.callId,
    roomKey,
    kind: conv.type,
    media: m,
    conversationId: String(conv._id),
    conversationName: conv.type === "group" ? conv.name : person.name,
    from: { key: person.key, id: person.id, model: person.model, name: person.name, photo: person.photo || "" },
    ringSeconds: RING_SECONDS,
    startedAt: new Date(room.createdAt),
  });
  room.ringTimer = setTimeout(() => {
    const r = rooms.get(roomKey);
    if (r && r.status === "ringing") finalizeRoom(r, "timeout").catch((e) => console.error("[call] timeout finalize failed:", e.message));
  }, RING_SECONDS * 1000);

  return { room, existing: false };
};

const openMeetingRoom = async (actor, meetingId) => {
  const { meeting } = await authorizeMeeting(actor, meetingId, { roomRunning: false });
  const roomKey = rooms.meetingRoomKey(meeting._id);

  const raced = rooms.get(roomKey);
  if (raced) return raced;

  const session = await CallSession.create({
    organisation_id: actor.organisation_id,
    roomKey,
    kind: "meeting",
    media: meeting.media,
    conversation: meeting.conversation,
    meeting: meeting._id,
    initiator: actor.id,
    initiatorModel: actor.model,
    initiatorKey: actor.key,
    invitedKeys: meeting.attendeeKeys.filter((k) => k !== actor.key),
    status: "active",
    answeredAt: new Date(),
  });
  const room = rooms.get(roomKey) || rooms.create({
    roomKey, callId: session._id, kind: "meeting", media: meeting.media, organisation_id: actor.organisation_id,
    conversationId: meeting.conversation, meetingId: meeting._id, initiatorKey: actor.key,
    hostKeys: [meeting.hostKey, ...meeting.coHostKeys], invitedKeys: meeting.attendeeKeys, title: meeting.title,
  });
  room.status = "active";
  room.answeredAt = Date.now();

  if (meeting.status !== "live") {
    meeting.status = "live";
    meeting.startedAt = meeting.startedAt || new Date();
    await meeting.save();
  }
  // tell attendees (live) and ping them (bell) that the room is open
  const others = meeting.attendeeKeys.filter((k) => k !== actor.key);
  chat.emitToKeys(others, "meeting:started", { meetingId: String(meeting._id), roomKey, title: meeting.title, media: meeting.media, startedBy: actor.key });
  createBulkNotifications({
    recipients: others.map((k) => { const p = parseKey(k); return { recipientModel: p.model, recipientId: p.id }; }),
    organisation_id: actor.organisation_id,
    type: "meeting",
    title: "Meeting started",
    message: `"${meeting.title}" has started. Tap to join.`,
    link: `/meetings/${meeting._id}`,
    priority: "high",
    createdBy: actor.id,
    createdByModel: actor.model,
    meta: { meetingId: String(meeting._id), roomKey },
  }).catch(() => {});
  return room;
};

const assertCanJoinExisting = async (room, actor) => {
  if (room.kind === "meeting") {
    await authorizeMeeting(actor, room.meetingId, { roomRunning: true });
  } else {
    await chat.loadConversation(actor, room.conversationId);
  }
};

// Core "enter the call" for a socket. `socket` is the live socket.io socket.
const joinRoom = async (socket, actor, person, roomKey, { audio = true, video } = {}) => {
  const io = getIO();
  let room = rooms.get(roomKey);
  if (!room) {
    if (!String(roomKey).startsWith("meeting:")) throw withCode("This call has ended.", "CALL_ENDED", 404);
    room = await openMeetingRoom(actor, roomKey.slice("meeting:".length));
  } else {
    await assertCanJoinExisting(room, actor);
  }
  if (room.ending) throw withCode("This call has ended.", "CALL_ENDED", 410);

  const wantVideo = video === undefined ? room.media === "video" : !!video;
  const alreadyIn = room.peers.has(socket.id);
  const { peer, firstForPerson, distinctCount } = alreadyIn
    ? { peer: room.peers.get(socket.id), firstForPerson: false, distinctCount: rooms.distinctPeople(room).size }
    : rooms.addPeer(room, socket.id, person, { audio, video: wantVideo });

  socket.join(roomOf(roomKey));
  socket.data.callRooms = socket.data.callRooms || new Set();
  socket.data.callRooms.add(roomKey);

  if (!alreadyIn) {
    // a second person picked up => the call is live
    if (room.status === "ringing" && distinctCount >= 2) {
      room.status = "active";
      room.answeredAt = Date.now();
      if (room.ringTimer) { clearTimeout(room.ringTimer); room.ringTimer = null; }
      CallSession.updateOne({ _id: room.callId }, { $set: { status: "active", answeredAt: new Date(room.answeredAt) } }).catch(() => {});
      chat.emitToKeys([...room.invitedKeys], "call:answered", { roomKey, callId: room.callId, by: actor.key });
    }
    if (firstForPerson) {
      const updated = await CallSession.updateOne(
        { _id: room.callId, "participants.key": actor.key },
        { $set: { "participants.$.leftAt": null } }
      );
      if (!updated.matchedCount) {
        await CallSession.updateOne(
          { _id: room.callId },
          { $push: { participants: { key: actor.key, person: actor.id, personModel: actor.model, joinedAt: new Date() } } }
        );
      }
      // this person's other tabs/devices stop ringing
      chat.emitToKeys([actor.key], "call:dismissed", { roomKey, callId: room.callId, reason: "answered_elsewhere", bySocketId: socket.id });
    }
    socket.to(roomOf(roomKey)).emit("call:peer-joined", { roomKey, peer: rooms.publicPeer(socket.id, peer) });
  }

  return {
    callId: room.callId,
    roomKey,
    kind: room.kind,
    media: room.media,
    status: room.status,
    title: room.title,
    conversationId: room.conversationId,
    meetingId: room.meetingId,
    you: { socketId: socket.id, key: actor.key },
    hostKeys: [...room.hostKeys],
    peers: rooms.peerList(room, socket.id), // the newcomer sends an offer to each of these
    presenterSocketId: room.presenterSocketId,
    iceServers: getIceServers(actor.key),
  };
};

// ---------- leave / decline / end / kick ----------

const detachSocket = (socketId, roomKey) => {
  const s = getIO()?.sockets.sockets.get(socketId);
  if (!s) return;
  s.leave(roomOf(roomKey));
  if (s.data.callRooms) s.data.callRooms.delete(roomKey);
};

const leaveRoom = async (socket, roomKey, reason = "hangup") => {
  const io = getIO();
  const room = rooms.get(roomKey);
  if (!room) return;
  const r = rooms.removePeer(room, socket.id);
  if (!r) return;
  socket.leave(roomOf(roomKey));
  if (socket.data.callRooms) socket.data.callRooms.delete(roomKey);

  io.to(roomOf(roomKey)).emit("call:peer-left", { roomKey, socketId: socket.id, key: r.peer.key, reason });
  if (r.wasPresenter) io.to(roomOf(roomKey)).emit("call:screen-share", { roomKey, socketId: socket.id, key: r.peer.key, sharing: false });
  if (r.personGone) {
    CallSession.updateOne({ _id: room.callId, "participants.key": r.peer.key }, { $set: { "participants.$.leftAt": new Date() } }).catch(() => {});
  }

  if (r.empty) return finalizeRoom(room, room.status === "ringing" ? "cancelled" : "all_left");
  // a 1:1 call is over as soon as either side hangs up
  if (room.kind === "direct" && r.personGone && room.status === "active") return finalizeRoom(room, "hangup");
};

const declineCall = async (actor, roomKey, reason = "declined") => {
  const io = getIO();
  const room = rooms.get(roomKey);
  if (!room) return; // already over - nothing to decline
  if (!room.invitedKeys.has(actor.key)) throw httpError("You were not invited to this call.", 403);
  room.declinedKeys.add(actor.key);
  CallSession.updateOne({ _id: room.callId }, { $addToSet: { declinedKeys: actor.key } }).catch(() => {});

  chat.emitToKeys([actor.key], "call:dismissed", { roomKey, callId: room.callId, reason: "declined" });
  io.to(roomOf(roomKey)).emit("call:declined", { roomKey, key: actor.key, reason });

  if (room.status === "ringing") {
    const everyoneDeclined = [...room.invitedKeys].every((k) => room.declinedKeys.has(k));
    if (room.kind === "direct" || everyoneDeclined) await finalizeRoom(room, "declined");
  }
};

const assertModerator = (room, socket, actor) => {
  if (!room.peers.has(socket.id)) throw httpError("You are not in this call.", 403);
  if (!rooms.isModerator(room, actor.key)) throw httpError("Only the host can do this.", 403);
};

const endForAll = async (socket, actor, roomKey) => {
  const room = rooms.get(roomKey);
  if (!room) return;
  assertModerator(room, socket, actor);
  await finalizeRoom(room, "host_ended");
};

const kickPeer = async (socket, actor, roomKey, targetSocketId) => {
  const io = getIO();
  const room = rooms.get(roomKey);
  if (!room) throw httpError("This call has ended.", 404);
  assertModerator(room, socket, actor);
  const target = room.peers.get(targetSocketId);
  if (!target) throw httpError("That participant is not in the call.", 404);
  if (rooms.isModerator(room, target.key) && room.initiatorKey === target.key) throw httpError("You cannot remove the host.", 403);

  io.to(targetSocketId).emit("call:kicked", { roomKey, by: actor.key });
  const r = rooms.removePeer(room, targetSocketId);
  detachSocket(targetSocketId, roomKey);
  io.to(roomOf(roomKey)).emit("call:peer-left", { roomKey, socketId: targetSocketId, key: target.key, reason: "removed" });
  if (r && r.wasPresenter) io.to(roomOf(roomKey)).emit("call:screen-share", { roomKey, socketId: targetSocketId, key: target.key, sharing: false });
  if (r && r.empty) await finalizeRoom(room, "all_left");
};

// Tears the whole room down, writes history, posts the summary line in the chat.
const finalizeRoom = async (room, reason) => {
  if (room.ending) return;
  room.ending = true;
  const io = getIO();
  if (room.ringTimer) { clearTimeout(room.ringTimer); room.ringTimer = null; }

  const endedAt = new Date();
  const answered = !!room.answeredAt;
  const status = answered ? "ended" : reason === "declined" ? "declined" : "missed";
  const durationSec = answered ? Math.max(0, Math.round((endedAt.getTime() - room.answeredAt) / 1000)) : 0;
  const participantKeys = [...room.everJoined.keys()];

  const payload = { roomKey: room.roomKey, callId: room.callId, reason, status, durationSec };
  io.to(roomOf(room.roomKey)).emit("call:ended", payload);
  // anyone still being rung (or with the incoming screen open) stops ringing
  chat.emitToKeys([...room.invitedKeys], "call:dismissed", { roomKey: room.roomKey, callId: room.callId, reason });
  for (const sid of room.peers.keys()) detachSocket(sid, room.roomKey);
  room.peers.clear();
  rooms.remove(room.roomKey);

  try {
    await CallSession.updateOne(
      { _id: room.callId },
      { $set: { status, endedAt, durationSec, endReason: reason, "participants.$[o].leftAt": endedAt } },
      { arrayFilters: [{ "o.leftAt": null }] }
    );

    if (room.kind === "meeting" && reason === "host_ended") {
      await Meeting.updateOne({ _id: room.meetingId }, { $set: { status: "ended", endedAt } });
      chat.emitToKeys([...room.invitedKeys, room.initiatorKey], "meeting:ended", { meetingId: room.meetingId, roomKey: room.roomKey });
    }

    if (room.conversationId) {
      const conv = await Conversation.findById(room.conversationId);
      if (conv) {
        const label = room.media === "audio" ? "Voice" : "Video";
        let text;
        if (room.kind === "meeting") text = answered ? `Meeting ended · ${fmtDuration(durationSec)} · ${participantKeys.length} joined` : "";
        else if (answered) text = `${label} call · ${fmtDuration(durationSec)}`;
        else text = status === "declined" ? `${label} call declined` : `Missed ${label.toLowerCase()} call`;
        if (text) {
          await chat.postSystemMessage(
            conv,
            actorFromKey(room.initiatorKey),
            { event: "call", callId: room.callId, media: room.media, status, durationSec, participants: participantKeys, kind: room.kind },
            text,
            { type: "call" }
          );
        }
      }
    }

    // missed 1:1 / group call => bell notification for people who never picked up
    if (!answered && room.kind !== "meeting") {
      const missed = [...room.invitedKeys].filter((k) => !room.everJoined.has(k));
      await createBulkNotifications({
        recipients: missed.map((k) => { const p = parseKey(k); return { recipientModel: p.model, recipientId: p.id }; }),
        organisation_id: room.organisation_id,
        type: "chat",
        title: "Missed call",
        message: `${room.initiatorName || "Someone"} tried to call you.`,
        link: `/chat?conversation=${room.conversationId}`,
        priority: "medium",
        meta: { conversationId: room.conversationId, callId: room.callId },
      });
    }
  } catch (err) {
    console.error("[call] finalize bookkeeping failed:", err.message);
  }
};

// Used by the meeting controller when a meeting is cancelled while people are in it.
const forceEndMeetingRoom = async (meetingId, reason = "host_ended") => {
  const room = rooms.get(rooms.meetingRoomKey(meetingId));
  if (room) await finalizeRoom(room, reason);
};

// Server restart / crash recovery: calls that were live in memory are gone.
const closeStaleSessions = async () => {
  const res = await CallSession.updateMany(
    { status: { $in: ["ringing", "active"] } },
    { $set: { status: "ended", endedAt: new Date(), endReason: "server_restart" } }
  );
  return res.modifiedCount || 0;
};

module.exports = {
  RING_SECONDS,
  authorizeMeeting,
  startConversationCall,
  joinRoom,
  leaveRoom,
  declineCall,
  endForAll,
  kickPeer,
  finalizeRoom,
  forceEndMeetingRoom,
  closeStaleSessions,
  assertModerator,
};
