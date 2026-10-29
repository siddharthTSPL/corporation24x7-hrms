// Chat, presence and call-signalling events, attached to every authenticated
// socket by config/socket.js. Authentication already happened there
// (socket.data = { recipientModel, id, organisation_id }).
//
// Every client->server event takes an optional ack callback and answers
//   { ok: true, ...data }   or   { ok: false, error, code? }
// so the frontend can await results instead of guessing.
const chat = require("../utils/chat/chat.service");
const calls = require("../utils/chat/call.service");
const rooms = require("../utils/chat/callRooms");
const controls = require("../utils/chat/meetingControls.service");
const presence = require("../utils/chat/presence");
const { resolvePeople, personKey } = require("../utils/chat/people.utils");
const { emitToOrganisation } = require("./socket");

const MAX_SIGNAL_BYTES = 64 * 1024; // an SDP offer is ~5-10 KB; 64 KB is generous

// tiny per-socket rate limiter: allow(socket, "send", 20, 10_000) => 20 per 10 s
const allow = (socket, bucket, max, windowMs) => {
  const now = Date.now();
  const b = (socket.data.buckets = socket.data.buckets || {});
  const rec = b[bucket] && now - b[bucket].start < windowMs ? b[bucket] : (b[bucket] = { start: now, n: 0 });
  rec.n += 1;
  return rec.n <= max;
};

// Outsiders (meeting guests) only get the in-meeting subset: no chat, no org presence,
// no inviting, no host controls. Everything else is refused before the handler runs.
const GUEST_EVENTS = new Set([
  "chat:whoami", "call:join", "call:leave", "call:signal", "call:media-state",
  "call:screen-share:start", "call:screen-share:stop",
  "call:hand:raise", "call:hand:lower", "call:reaction",
  "meeting:state", "meeting:lobby-leave",
]);

const registerChatSocket = (io, socket) => {
  const isGuest = !!socket.data.isGuest;
  const actor = chat.toActor({ id: socket.data.id, recipientModel: socket.data.recipientModel, organisation_id: socket.data.organisation_id });
  socket.data.callRooms = new Set();

  // Lazily resolved once per socket (name/photo shown to other people in calls).
  let personPromise = null;
  const getPerson = () => {
    if (isGuest) {
      return Promise.resolve({
        key: actor.key, id: actor.id, model: "Guest", name: socket.data.guestName || "Guest",
        photo: "", role: "Guest", email: socket.data.guestEmail || "", isGuest: true,
      });
    }
    if (!personPromise) {
      personPromise = resolvePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }]).then(
        (m) => m.get(actor.key) || { key: actor.key, id: actor.id, model: actor.model, name: "Unknown", photo: "" }
      );
    }
    return personPromise;
  };

  // Wraps a handler: swallow + report errors through the ack, never crash the process.
  const on = (event, handler) => {
    socket.on(event, async (payload, ack) => {
      if (typeof payload === "function") { ack = payload; payload = {}; }
      const reply = typeof ack === "function" ? ack : () => {};
      if (isGuest && !GUEST_EVENTS.has(event)) return reply({ ok: false, error: "Not available for guests.", code: "GUEST_FORBIDDEN" });
      try {
        const data = await handler(payload || {});
        reply({ ok: true, ...(data || {}) });
      } catch (err) {
        if (!err.statusCode) console.error(`[socket] ${event} failed:`, err);
        reply({ ok: false, error: err.statusCode ? err.message : "Something went wrong.", code: err.code });
      }
    });
  };

  // ----- presence -----
  if (!isGuest && presence.add(actor.key, socket.id)) {
    emitToOrganisation(actor.organisation_id, "presence:update", { key: actor.key, online: true, inCall: presence.isInCall(actor.key) });
  }
  // everything people sent me while I was away is now "delivered" (grey double tick for them)
  if (!isGuest) chat.markDeliveredForActor(actor).catch((err) => console.error("[socket] mark delivered failed:", err.message));
  // calls that started while this person was offline / reconnecting
  for (const room of isGuest ? [] : rooms.ringingFor(actor.key)) {
    socket.emit("call:incoming", {
      callId: room.callId, roomKey: room.roomKey, kind: room.kind, media: room.media, to: actor.key,
      conversationId: room.conversationId, conversationName: room.title || room.initiatorName || "",
      from: { key: room.initiatorKey, name: room.initiatorName || "", photo: room.initiatorPhoto || "" }, ringSeconds: calls.RING_SECONDS,
      startedAt: new Date(room.createdAt),
    });
  }

  // Who am I? (lets the client rebuild its identity even if it missed "socket:ready")
  on("chat:whoami", async () => ({ key: actor.key, model: actor.model, id: actor.id }));

  on("presence:query", async ({ keys }) => {
    const list = Array.isArray(keys) ? keys.filter((k) => typeof k === "string").slice(0, 200) : [];
    return { presence: presence.snapshot(list) };
  });

  // ----- chat -----
  on("chat:send", async ({ conversationId, text, replyTo, clientId, sticker }) => {
    if (!allow(socket, "send", 20, 10000)) throw Object.assign(new Error("You're sending messages too fast."), { statusCode: 429 });
    const { message } = await chat.sendMessage(actor, conversationId, { text, replyTo, clientId, sticker });
    return { message };
  });

  on("chat:read", async ({ conversationId }) => {
    await chat.markRead(actor, conversationId);
  });

  // Typing indicator. Membership is cached 60 s so a keystroke doesn't hit the DB.
  const memberCache = (socket.data.memberCache = new Map());
  const memberKeysOf = async (conversationId) => {
    const hit = memberCache.get(String(conversationId));
    if (hit && Date.now() - hit.at < 60000) return hit.keys;
    const conv = await chat.loadConversation(actor, conversationId);
    memberCache.set(String(conversationId), { keys: conv.participantKeys, at: Date.now() });
    if (memberCache.size > 200) memberCache.delete(memberCache.keys().next().value);
    return conv.participantKeys;
  };
  on("chat:typing", async ({ conversationId, isTyping }) => {
    if (!allow(socket, "typing", 30, 10000)) return;
    const keys = await memberKeysOf(conversationId);
    const person = await getPerson();
    chat.emitToKeys(keys.filter((k) => k !== actor.key), "chat:typing", {
      conversationId: String(conversationId), key: actor.key, name: person.name, isTyping: !!isTyping,
    });
  });

  // ----- calls: lifecycle -----
  on("call:start", async ({ conversationId, media }) => {
    const person = await getPerson();
    const { room, existing } = await calls.startConversationCall(actor, person, { conversationId, media });
    const joined = await calls.joinRoom(socket, actor, person, room.roomKey, { audio: true, video: room.media === "video" });
    return { ...joined, alreadyActive: existing };
  });

  on("call:join", async ({ roomKey, audio, video }) => {
    if (!roomKey) throw Object.assign(new Error("roomKey is required."), { statusCode: 400 });
    // a guest token is good for exactly one meeting
    if (isGuest && String(roomKey) !== `meeting:${socket.data.guestMeetingId}`) throw Object.assign(new Error("This invitation is for a different meeting."), { statusCode: 403, code: "GUEST_WRONG_MEETING" });
    return calls.joinRoom(socket, actor, await getPerson(), String(roomKey), { audio: audio !== false, video });
  });

  on("call:invite", async ({ roomKey, keys }) => {
    if (!allow(socket, "callInvite", 10, 10000)) throw Object.assign(new Error("You're inviting people too quickly."), { statusCode: 429 });
    return calls.inviteToGroupCall(socket, actor, await getPerson(), String(roomKey || ""), keys);
  });

  on("call:decline", async ({ roomKey, reason }) => {
    await calls.declineCall(actor, String(roomKey), reason === "busy" ? "busy" : "declined");
  });

  on("call:leave", async ({ roomKey }) => {
    await calls.leaveRoom(socket, String(roomKey), "hangup");
  });

  on("call:end", async ({ roomKey }) => {
    await calls.endForAll(socket, actor, String(roomKey));
  });

  // Is there a live call in this conversation? (powers the "Join call" banner)
  on("call:active", async ({ conversationId }) => {
    await chat.loadConversation(actor, conversationId);
    const room = rooms.get(rooms.conversationRoomKey(conversationId));
    return { call: room ? rooms.summary(room) : null };
  });

  // ----- calls: WebRTC signalling (server only relays; media goes peer-to-peer) -----
  on("call:signal", async ({ roomKey, to, data }) => {
    if (!allow(socket, "signal", 400, 10000)) throw Object.assign(new Error("Too many signalling messages."), { statusCode: 429 });
    const room = rooms.get(String(roomKey));
    if (!room || !room.peers.has(socket.id)) throw Object.assign(new Error("You are not in this call."), { statusCode: 403 });
    if (!room.peers.has(to)) throw Object.assign(new Error("That participant is no longer in the call."), { statusCode: 404 });
    if (!data || typeof data !== "object" || JSON.stringify(data).length > MAX_SIGNAL_BYTES) {
      throw Object.assign(new Error("Invalid signal."), { statusCode: 400 });
    }
    io.to(to).emit("call:signal", { roomKey: room.roomKey, from: socket.id, key: actor.key, data });
  });

  on("call:media-state", async ({ roomKey, audio, video, screen }) => {
    const room = rooms.get(String(roomKey));
    const peer = room && room.peers.get(socket.id);
    if (!peer) throw Object.assign(new Error("You are not in this call."), { statusCode: 403 });
    if (typeof audio === "boolean") peer.audio = audio;
    if (typeof video === "boolean") peer.video = video;
    if (typeof screen === "boolean") peer.screen = screen;
    socket.to(`call:${room.roomKey}`).emit("call:media-state", { roomKey: room.roomKey, socketId: socket.id, key: actor.key, audio: peer.audio, video: peer.video, screen: peer.screen });
  });

  // One presenter at a time. The share itself is just another video track the
  // client adds to its peer connections; the server only arbitrates who may.
  on("call:screen-share:start", async ({ roomKey }) => {
    const room = rooms.get(String(roomKey));
    const peer = room && room.peers.get(socket.id);
    if (!peer) throw Object.assign(new Error("You are not in this call."), { statusCode: 403 });
    controls.assertCanShare(room, actor.key);
    if (room.presenterSocketId && room.presenterSocketId !== socket.id) {
      const cur = room.peers.get(room.presenterSocketId);
      throw Object.assign(new Error(`${cur ? cur.name : "Someone"} is already sharing their screen.`), { statusCode: 409, code: "SHARE_IN_USE" });
    }
    room.presenterSocketId = socket.id;
    peer.screen = true;
    io.to(`call:${room.roomKey}`).emit("call:screen-share", { roomKey: room.roomKey, socketId: socket.id, key: actor.key, name: peer.name, sharing: true });
  });

  on("call:screen-share:stop", async ({ roomKey }) => {
    const room = rooms.get(String(roomKey));
    const peer = room && room.peers.get(socket.id);
    if (!peer) return;
    peer.screen = false;
    if (room.presenterSocketId === socket.id) {
      room.presenterSocketId = null;
      io.to(`call:${room.roomKey}`).emit("call:screen-share", { roomKey: room.roomKey, socketId: socket.id, key: actor.key, name: peer.name, sharing: false });
    }
  });

  // ----- calls: host controls -----
  on("call:kick", async ({ roomKey, socketId }) => {
    await calls.kickPeer(socket, actor, String(roomKey), String(socketId));
  });

  on("call:mute-request", async ({ roomKey, socketId }) => {
    const room = rooms.get(String(roomKey));
    if (!room) throw Object.assign(new Error("This call has ended."), { statusCode: 404 });
    calls.assertModerator(room, socket, actor);
    if (!room.peers.has(socketId)) throw Object.assign(new Error("That participant is not in the call."), { statusCode: 404 });
    io.to(socketId).emit("call:mute-request", { roomKey: room.roomKey, by: actor.key });
  });

  // ----- meeting: hands, reactions, lobby, host controls -----
  const meetingRoom = (roomKey) => controls.requireMeetingRoom(roomKey);
  const anyRoom = (roomKey) => controls.requireRoom(roomKey);

  on("call:hand:raise", async ({ roomKey }) => controls.raiseHand(anyRoom(roomKey), socket, actor));

  on("call:hand:lower", async ({ roomKey, key }) => controls.lowerHand(anyRoom(roomKey), socket, actor, key));

  on("call:hand:lower-all", async ({ roomKey }) => controls.lowerAllHands(anyRoom(roomKey), socket, actor));

  on("call:reaction", async ({ roomKey, emoji }) => {
    if (!allow(socket, "reaction", 12, 10000)) throw Object.assign(new Error("You're reacting too fast."), { statusCode: 429 });
    controls.sendReaction(anyRoom(roomKey), socket, actor, String(emoji || ""));
  });

  on("meeting:state", async ({ roomKey }) => {
    const room = meetingRoom(roomKey);
    if (!room.peers.has(socket.id)) throw Object.assign(new Error("You are not in this call."), { statusCode: 403 });
    return { state: controls.liveState(room, { forModerator: rooms.isModerator(room, actor.key) }) };
  });

  on("meeting:lobby-leave", async ({ roomKey }) => {
    controls.leaveLobby(rooms.get(String(roomKey)), socket);
  });

  on("meeting:lobby-admit", async ({ roomKey, socketId, all }) => controls.admit(meetingRoom(roomKey), socket, actor, { socketId: socketId ? String(socketId) : null, all: !!all }));

  on("meeting:lobby-deny", async ({ roomKey, socketId, all, block }) => controls.deny(meetingRoom(roomKey), socket, actor, { socketId: socketId ? String(socketId) : null, all: !!all, block: !!block }));

  on("meeting:lock", async ({ roomKey, locked }) => controls.setLocked(meetingRoom(roomKey), socket, actor, locked !== false));

  on("meeting:settings", async ({ roomKey, settings }) => {
    const next = await controls.updateSettingsFromSocket(meetingRoom(roomKey), socket, actor, settings);
    return { settings: next };
  });

  on("meeting:set-cohost", async ({ roomKey, key, cohost }) => controls.setCoHost(meetingRoom(roomKey), socket, actor, key, cohost !== false));

  on("call:mute-all", async ({ roomKey }) => controls.muteAll(anyRoom(roomKey), socket, actor));

  on("call:screen-share:force-stop", async ({ roomKey }) => controls.stopShareByHost(anyRoom(roomKey), socket, actor));

  // ----- disconnect: leave every call, flip presence -----
  socket.on("disconnect", async () => {
    controls.leaveAllLobbies(socket);
    for (const roomKey of [...(socket.data.callRooms || [])]) {
      try {
        await calls.leaveRoom(socket, roomKey, "disconnected");
      } catch (err) {
        console.error("[socket] leave-on-disconnect failed:", err.message);
      }
    }
    if (!isGuest && presence.remove(actor.key, socket.id)) {
      emitToOrganisation(actor.organisation_id, "presence:update", { key: actor.key, online: false, inCall: false, lastSeenAt: presence.lastSeenAt(actor.key) });
    }
  });
};

module.exports = { registerChatSocket };
