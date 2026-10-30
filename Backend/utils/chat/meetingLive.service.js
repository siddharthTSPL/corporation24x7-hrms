// "Live extras" for scheduled meetings - the things people love in Zoom / Meet / Teams / Slido,
// plus a few HR-flavoured extras of our own:
//
//   breakout rooms · shared whiteboard · live captions + transcript · live Q&A (upvotes)
//   spotlight · shared countdown timer · agenda tracker (timeboxing) · mood pulse (anonymous)
//   spin-the-wheel picker · kudos / shout-outs · decision log · recording notice
//   talk-time stats · celebration effects (confetti etc.)
//
// State lives on the in-memory call room (room.live, created lazily - callRooms.js is untouched) and is
// written to MongoDB in small buffered batches (every ~10 s and when the room closes), so a busy
// meeting never does one DB write per stroke / caption.
//
// Every public function takes (roomKey, socket, actor, payload) and returns the data for the ack.
const crypto = require("crypto");
const mongoose = require("mongoose");
const Meeting = require("../../Models/meeting.model");
const MeetingLive = require("../../Models/meetinglive.model");
const MeetingBoard = require("../../Models/meetingboard.model");
const MeetingQuestion = require("../../Models/meetingquestion.model");
const MeetingKudos = require("../../Models/meetingkudos.model");
const { getIO } = require("../../config/socket");
const rooms = require("./callRooms");
const controls = require("./meetingControls.service");
const { httpError, resolvePeople, parseKey } = require("./people.utils");

const MAX_STROKES = 1500;
const MAX_POINTS = 240; // numbers per stroke (= 120 x/y pairs)
const MAX_TRANSCRIPT = 4000;
const MAX_OPEN_QUESTIONS = 300;
const BOARD_TOOLS = ["pen", "highlighter", "line", "rect", "ellipse", "arrow", "text"];
const BURSTS = ["confetti", "fireworks", "balloons", "clap", "hearts", "party"];
const FLUSH_EVERY_MS = 10000;

const withCode = (message, code, statusCode = 400) => Object.assign(httpError(message, statusCode), { code });
const roomOf = (roomKey) => `call:${roomKey}`;
const newId = () => crypto.randomBytes(6).toString("hex");
const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};
const logErr = (what) => (err) => console.error(`[meetingLive] ${what} failed:`, err && err.message ? err.message : err);
const safeKey = (k) => typeof k === "string" && k.length > 0 && k.length < 120 && !/[.$]/.test(k);

const emitRoom = (room, event, payload = {}) => {
  const io = getIO();
  if (io) io.to(roomOf(room.roomKey)).emit(event, { roomKey: room.roomKey, ...payload });
};
const emitSocket = (socketId, event, payload = {}) => {
  const io = getIO();
  if (io) io.to(socketId).emit(event, payload);
};
const emitMods = (room, event, payload = {}) => {
  const io = getIO();
  if (!io) return;
  for (const sid of rooms.moderatorSocketIds(room)) io.to(sid).emit(event, { roomKey: room.roomKey, ...payload });
};

const inRoom = (room, socket) => {
  const peer = room.peers.get(socket.id);
  if (!peer) throw httpError("You are not in this call.", 403);
  return peer;
};
const modOnly = (room, socket, actor) => {
  const peer = inRoom(room, socket);
  if (!rooms.isModerator(room, actor.key)) throw httpError("Only the host or a co-host can do this.", 403);
  return peer;
};
const notGuest = (actor) => {
  if (actor.model === "Guest") throw withCode("This is not available for guests.", "GUEST_FORBIDDEN", 403);
};

const distinctPeers = (room) => {
  const m = new Map();
  for (const p of room.peers.values()) if (!m.has(p.key)) m.set(p.key, p);
  return [...m.values()];
};
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------------------------------------------------------------- live state
const tracked = new Map(); // roomKey -> room
let sweeper = null;

const newLive = () => ({
  ready: null,
  flags: { captions: true, qa: true, boardOpen: false, boardAnyone: true },
  spotlight: null,
  timer: null,
  timerHandle: null,
  agenda: { items: [], currentId: null },
  pulse: null,
  pulseHandle: null,
  wheel: { history: [], last: null },
  breakout: { active: false, groups: [], startedAt: null, endsAt: null, closesAt: null, allowSelf: false, byKey: "", handle: null, warnHandle: null, closeHandle: null },
  recording: { on: false, at: null, byKey: "", byName: "" },
  decisions: [],
  board: { strokes: [], dirty: false },
  transcriptBuf: [],
  talkTotal: new Map(),
  talkPending: new Map(),
  speakingSince: new Map(),
  names: new Map(),
  dirtyNames: new Set(),
  kudosLog: new Map(),
  lastBurstAt: 0,
});

const hydrate = async (room) => {
  const [board, live] = await Promise.all([
    MeetingBoard.findOne({ meeting: room.meetingId }).lean(),
    MeetingLive.findOne({ meeting: room.meetingId }).select("decisions").lean(),
  ]);
  if (board && Array.isArray(board.strokes)) room.live.board.strokes = board.strokes.slice(-MAX_STROKES);
  if (live && Array.isArray(live.decisions)) {
    room.live.decisions = live.decisions.map((d) => ({ id: d.id, text: d.text, byKey: d.byKey, byName: d.byName, at: d.at }));
  }
};

const ensure = async (room) => {
  if (!room.live) {
    room.live = newLive();
    tracked.set(room.roomKey, room);
    startSweeper();
    room.live.ready = room.meetingId ? hydrate(room).catch(logErr("hydrate")) : Promise.resolve();
  }
  if (room.live.ready) await room.live.ready;
  return room.live;
};

// Runs a handler against the live meeting room of `roomKey` (meetings only, not 1:1 calls).
const wrap = (fn) => async (roomKey, socket, actor, payload) => {
  const room = controls.requireMeetingRoom(roomKey);
  await ensure(room);
  return fn(room, socket, actor, payload && typeof payload === "object" ? payload : {});
};

// ---------------------------------------------------------------- persistence
const upsertLive = async (room, update) => {
  const opts = { upsert: true, setDefaultsOnInsert: false };
  const withOrg = { ...update, $setOnInsert: { organisation_id: room.organisation_id } };
  try {
    await MeetingLive.updateOne({ meeting: room.meetingId }, withOrg, opts);
    return true;
  } catch (err) {
    if (err && err.code === 11000) {
      // two upserts raced to create the document - the second one just updates it
      try {
        await MeetingLive.updateOne({ meeting: room.meetingId }, update, { setDefaultsOnInsert: false });
        return true;
      } catch (e2) {
        logErr("save (retry)")(e2);
        return false;
      }
    }
    logErr("save")(err);
    return false;
  }
};

const persistPush = (room, field, doc) => {
  if (!room.meetingId) return;
  upsertLive(room, { $push: { [field]: doc } });
};

const addTalk = (L, key, ms) => {
  if (!(ms > 0)) return;
  L.talkTotal.set(key, (L.talkTotal.get(key) || 0) + ms);
  L.talkPending.set(key, (L.talkPending.get(key) || 0) + ms);
};

const flush = async (room) => {
  const L = room.live;
  if (!L || !room.meetingId) return;
  const now = Date.now();
  for (const [sid, since] of [...L.speakingSince]) {
    const peer = room.peers.get(sid);
    if (!peer) {
      L.speakingSince.delete(sid);
      continue;
    }
    addTalk(L, peer.key, Math.min(now - since, 600000));
    L.speakingSince.set(sid, now);
  }

  const update = {};
  const lines = L.transcriptBuf.splice(0);
  if (lines.length) update.$push = { transcript: { $each: lines, $slice: -MAX_TRANSCRIPT } };
  const talk = [...L.talkPending];
  L.talkPending.clear();
  const inc = {};
  for (const [k, ms] of talk) if (safeKey(k) && ms >= 1) inc[`talkMs.${k}`] = Math.round(ms);
  if (Object.keys(inc).length) update.$inc = inc;
  const nameKeys = [...L.dirtyNames];
  L.dirtyNames.clear();
  const set = {};
  for (const k of nameKeys) if (safeKey(k)) set[`names.${k}`] = L.names.get(k) || "";
  if (Object.keys(set).length) update.$set = set;

  if (Object.keys(update).length) {
    const ok = await upsertLive(room, update);
    if (!ok) {
      // keep the data for the next attempt
      L.transcriptBuf.unshift(...lines);
      for (const [k, ms] of talk) L.talkPending.set(k, (L.talkPending.get(k) || 0) + ms);
      for (const k of nameKeys) L.dirtyNames.add(k);
      if (L.transcriptBuf.length > MAX_TRANSCRIPT) L.transcriptBuf.splice(0, L.transcriptBuf.length - MAX_TRANSCRIPT);
    }
  }
  if (L.board.dirty) {
    L.board.dirty = false;
    try {
      await MeetingBoard.updateOne(
        { meeting: room.meetingId },
        { $set: { strokes: L.board.strokes.slice(-MAX_STROKES) }, $setOnInsert: { organisation_id: room.organisation_id } },
        { upsert: true, setDefaultsOnInsert: false }
      );
    } catch (err) {
      L.board.dirty = true;
      logErr("save whiteboard")(err);
    }
  }
};

const flushNow = async (room) => {
  if (room && room.live) await flush(room);
};

const clearHandles = (L) => {
  for (const h of ["timerHandle", "pulseHandle"]) {
    if (L[h]) clearTimeout(L[h]);
    L[h] = null;
  }
  const b = L.breakout;
  for (const h of ["handle", "warnHandle", "closeHandle"]) {
    if (b[h]) clearTimeout(b[h]);
    b[h] = null;
  }
};

// The room is gone (meeting ended / everyone left): close open items, save the rest, forget it.
const teardown = async (room) => {
  const L = room.live;
  if (!L) return;
  try {
    finishCurrentAgenda(room, "done");
    if (L.pulse && L.pulse.open) closePulse(room);
    if (L.breakout.active) finalizeBreakout(room, "closed", { silent: true });
    clearHandles(L);
    await flush(room);
  } catch (err) {
    logErr("teardown")(err);
  }
};

const sweep = async () => {
  for (const [roomKey, room] of [...tracked]) {
    const gone = rooms.get(roomKey) !== room || room.ending;
    if (gone) {
      await teardown(room);
      tracked.delete(roomKey);
    } else {
      await flush(room).catch(logErr("flush"));
    }
  }
  if (!tracked.size && sweeper) {
    clearInterval(sweeper);
    sweeper = null;
  }
};

const startSweeper = () => {
  if (sweeper) return;
  sweeper = setInterval(() => sweep().catch(logErr("sweep")), FLUSH_EVERY_MS);
  if (sweeper.unref) sweeper.unref();
};

// ---------------------------------------------------------------- flags / spotlight / recording / burst
const setFlags = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  for (const k of ["captions", "qa", "boardOpen", "boardAnyone"]) if (typeof p[k] === "boolean") L.flags[k] = p[k];
  emitRoom(room, "meeting:flags", { flags: L.flags, by: actor.key });
  return { flags: L.flags };
});

const spotlight = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  if (!p.socketId) {
    L.spotlight = null;
  } else {
    const target = room.peers.get(String(p.socketId));
    if (!target) throw httpError("That participant is not in the call.", 404);
    L.spotlight = { socketId: String(p.socketId), key: target.key, name: target.name, by: actor.key, at: Date.now() };
  }
  emitRoom(room, "meeting:spotlight", { spotlight: L.spotlight });
  return { spotlight: L.spotlight };
});

const setRecording = wrap(async (room, socket, actor, p) => {
  const peer = modOnly(room, socket, actor);
  const L = room.live;
  const on = p.on !== false;
  if (L.recording.on === on) return { recording: L.recording };
  L.recording = { on, at: Date.now(), byKey: actor.key, byName: peer.name };
  emitRoom(room, "meeting:recording", { recording: L.recording });
  persistPush(room, "recordingLog", { on, at: new Date(), byKey: actor.key, byName: peer.name });
  return { recording: L.recording };
});

const burst = wrap(async (room, socket, actor, p) => {
  const peer = inRoom(room, socket);
  const L = room.live;
  if (!room.settings.reactionsEnabled && !rooms.isModerator(room, actor.key)) throw withCode("Reactions are turned off in this meeting.", "REACTIONS_DISABLED", 403);
  const kind = BURSTS.includes(p.kind) ? p.kind : "confetti";
  const now = Date.now();
  if (now - L.lastBurstAt < 8000) throw withCode("Wait a few seconds before the next celebration.", "BURST_COOLDOWN", 429);
  L.lastBurstAt = now;
  emitRoom(room, "meeting:burst", { kind, by: { key: actor.key, name: peer.name }, at: now });
  return { kind };
});

// ---------------------------------------------------------------- shared timer
const timerSnapshot = (t) =>
  t
    ? {
        id: t.id,
        label: t.label,
        durationMs: t.durationMs,
        running: t.running,
        done: !!t.done,
        endsAt: t.running ? t.endsAt : null,
        remainingMs: t.running ? Math.max(0, t.endsAt - Date.now()) : t.remainingMs,
        by: t.by,
        serverNow: Date.now(),
      }
    : null;

const armTimer = (room) => {
  const L = room.live;
  if (L.timerHandle) clearTimeout(L.timerHandle);
  L.timerHandle = null;
  const t = L.timer;
  if (!t || !t.running) return;
  L.timerHandle = setTimeout(() => {
    if (!L.timer || L.timer.id !== t.id || !t.running) return;
    t.running = false;
    t.remainingMs = 0;
    t.done = true;
    emitRoom(room, "meeting:timer:done", { timer: timerSnapshot(t) });
  }, Math.max(0, t.endsAt - Date.now()) + 50);
  if (L.timerHandle.unref) L.timerHandle.unref();
};

const startTimer = (room, actorKey, { seconds, label }) => {
  const L = room.live;
  const ms = clampInt(seconds, 5, 28800, 300) * 1000;
  L.timer = { id: newId(), label: String(label || "").trim().slice(0, 80), durationMs: ms, running: true, done: false, endsAt: Date.now() + ms, remainingMs: ms, by: actorKey };
  armTimer(room);
  emitRoom(room, "meeting:timer", { timer: timerSnapshot(L.timer) });
  return L.timer;
};

const timerStart = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  return { timer: timerSnapshot(startTimer(room, actor.key, p)) };
});

const timerControl = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  const t = L.timer;
  const action = String(p.action || "");
  if (action === "stop") {
    if (L.timerHandle) clearTimeout(L.timerHandle);
    L.timerHandle = null;
    L.timer = null;
    emitRoom(room, "meeting:timer", { timer: null });
    return { timer: null };
  }
  if (!t) throw httpError("There is no timer running.", 404);
  if (action === "pause" && t.running) {
    t.remainingMs = Math.max(0, t.endsAt - Date.now());
    t.running = false;
    if (L.timerHandle) clearTimeout(L.timerHandle);
    L.timerHandle = null;
  } else if (action === "resume" && !t.running && !t.done && t.remainingMs > 0) {
    t.running = true;
    t.endsAt = Date.now() + t.remainingMs;
    armTimer(room);
  } else if (action === "add") {
    const extra = clampInt(p.seconds, 5, 3600, 60) * 1000;
    t.durationMs += extra;
    if (t.running) t.endsAt += extra;
    else {
      t.remainingMs += extra;
      if (t.done) {
        t.done = false;
        t.running = true;
        t.endsAt = Date.now() + t.remainingMs;
      }
    }
    armTimer(room);
  } else if (!["pause", "resume", "add"].includes(action)) {
    throw httpError("action must be pause, resume, add or stop.", 400);
  }
  emitRoom(room, "meeting:timer", { timer: timerSnapshot(t) });
  return { timer: timerSnapshot(t) };
});

// ---------------------------------------------------------------- agenda tracker
const parseAgendaText = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*\u2022\u2013]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => {
      let minutes = 0;
      let title = line;
      const m = line.match(/[\s(\[-]*(\d{1,3})\s*(?:m|min|mins|minutes)\.?\s*[)\]]?\s*$/i);
      if (m) {
        minutes = Math.min(240, parseInt(m[1], 10));
        title = line.slice(0, m.index).replace(/[\s\-\u2013:(\[]+$/, "").trim() || line;
      }
      return { title: title.slice(0, 120), minutes };
    });

const agendaView = (a) => ({
  currentId: a.currentId,
  items: a.items.map((i) => ({ id: i.id, title: i.title, minutes: i.minutes, status: i.status, startedAt: i.startedAt, spentSec: i.spentSec })),
});

const emitAgenda = (room) => emitRoom(room, "meeting:agenda", { agenda: agendaView(room.live.agenda) });

const finishCurrentAgenda = (room, status = "done") => {
  const L = room.live;
  const a = L.agenda;
  const cur = a.items.find((i) => i.id === a.currentId);
  if (!cur) return null;
  const spent = cur.startedAt ? Math.max(0, Math.round((Date.now() - cur.startedAt) / 1000)) : 0;
  cur.spentSec = (cur.spentSec || 0) + spent;
  cur.status = status;
  const startedAt = cur.startedAt ? new Date(cur.startedAt) : null;
  cur.startedAt = null;
  a.currentId = null;
  persistPush(room, "agendaLog", { title: cur.title, plannedMin: cur.minutes, spentSec: cur.spentSec, status, startedAt, endedAt: new Date() });
  return cur;
};

const agendaSet = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  let source = Array.isArray(p.items) ? p.items : null;
  if (!source && p.fromMeeting) {
    const m = await Meeting.findById(room.meetingId).select("agenda").lean();
    source = parseAgendaText(m && m.agenda);
  }
  if (!source) throw httpError("Send items: [{ title, minutes }] or fromMeeting: true.", 400);
  const items = source
    .slice(0, 30)
    .map((i) => ({ title: String((i && i.title) || "").trim().slice(0, 120), minutes: clampInt(i && i.minutes, 0, 240, 0) }))
    .filter((i) => i.title)
    .map((i) => ({ id: newId(), title: i.title, minutes: i.minutes, status: "pending", startedAt: null, spentSec: 0 }));
  finishCurrentAgenda(room, "done");
  L.agenda = { items, currentId: null };
  emitAgenda(room);
  return { agenda: agendaView(L.agenda) };
});

const agendaAdvance = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  const a = L.agenda;
  if (!a.items.length) throw httpError("Set an agenda first.", 409);
  const curIndex = a.items.findIndex((i) => i.id === a.currentId);
  let target = null;
  if (p.to && p.to !== "next") {
    target = a.items.find((i) => i.id === String(p.to));
    if (!target) throw httpError("That agenda item does not exist.", 404);
    if (target.id === a.currentId) return { agenda: agendaView(a) };
  } else {
    target = a.items.slice(curIndex + 1).find((i) => i.status === "pending") || (curIndex < 0 ? a.items.find((i) => i.status === "pending") : null);
  }
  finishCurrentAgenda(room, p.skip ? "skipped" : "done");
  if (target) {
    target.status = "active";
    target.startedAt = Date.now();
    a.currentId = target.id;
    if (p.autoTimer && target.minutes > 0) startTimer(room, actor.key, { seconds: target.minutes * 60, label: target.title });
  }
  emitAgenda(room);
  return { agenda: agendaView(a) };
});

// ---------------------------------------------------------------- mood pulse (anonymous)
const pulseStats = (p) => {
  const dist = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const s of p.votes.values()) {
    dist[s - 1] += 1;
    sum += s;
  }
  const count = p.votes.size;
  return { count, avg: count ? Math.round((sum / count) * 100) / 100 : 0, dist };
};

const pulseView = (p, key) =>
  p ? { id: p.id, prompt: p.prompt, open: p.open, startedAt: p.startedAt, endsAt: p.endsAt, ...pulseStats(p), myScore: key ? p.votes.get(key) || null : null } : null;

const closePulse = (room) => {
  const L = room.live;
  const p = L.pulse;
  if (!p || !p.open) return null;
  p.open = false;
  if (L.pulseHandle) clearTimeout(L.pulseHandle);
  L.pulseHandle = null;
  const stats = pulseStats(p);
  persistPush(room, "pulseRounds", { prompt: p.prompt, at: new Date(p.startedAt), count: stats.count, avg: stats.avg, dist: stats.dist });
  emitRoom(room, "meeting:pulse:result", { pulse: pulseView(p, null) });
  return p;
};

const pulseStart = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  if (L.pulse && L.pulse.open) throw withCode("A pulse is already open.", "PULSE_OPEN", 409);
  const seconds = clampInt(p.seconds, 10, 600, 60);
  const now = Date.now();
  L.pulse = { id: newId(), prompt: String(p.prompt || "How's the energy in the room?").trim().slice(0, 120) || "How's the energy in the room?", open: true, startedAt: now, endsAt: now + seconds * 1000, votes: new Map() };
  L.pulseHandle = setTimeout(() => closePulse(room), seconds * 1000 + 50);
  if (L.pulseHandle.unref) L.pulseHandle.unref();
  emitRoom(room, "meeting:pulse", { pulse: pulseView(L.pulse, null) });
  return { pulse: pulseView(L.pulse, actor.key) };
});

const pulseSend = wrap(async (room, socket, actor, p) => {
  inRoom(room, socket);
  const L = room.live;
  if (!L.pulse || !L.pulse.open) throw withCode("There is no open pulse.", "PULSE_CLOSED", 409);
  const score = parseInt(p.score, 10);
  if (!(score >= 1 && score <= 5)) throw httpError("score must be a number from 1 to 5.", 400);
  L.pulse.votes.set(actor.key, score);
  emitRoom(room, "meeting:pulse:update", { id: L.pulse.id, ...pulseStats(L.pulse) });
  return { myScore: score };
});

const pulseStop = wrap(async (room, socket, actor) => {
  modOnly(room, socket, actor);
  const p = closePulse(room);
  return { pulse: pulseView(p || room.live.pulse, actor.key) };
});

// ---------------------------------------------------------------- spin the wheel
const wheelSpin = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  let pool = distinctPeers(room);
  if (!p.includeGuests) pool = pool.filter((x) => x.model !== "Guest");
  if (p.pool === "hands") pool = pool.filter((x) => room.hands.has(x.key));
  if (p.includeHosts === false) pool = pool.filter((x) => !rooms.isModerator(room, x.key));
  let cycleReset = false;
  if (p.excludePrevious !== false) {
    const won = new Set(L.wheel.history.map((h) => h.winnerKey));
    const fresh = pool.filter((x) => !won.has(x.key));
    if (!fresh.length && pool.length) {
      L.wheel.history = [];
      cycleReset = true;
    } else pool = fresh;
  }
  if (!pool.length) throw withCode(p.pool === "hands" ? "Nobody has a raised hand." : "There is nobody to pick from.", "WHEEL_EMPTY", 409);
  const winner = pool[crypto.randomInt(pool.length)];
  const spin = {
    id: newId(),
    at: Date.now(),
    pool: p.pool === "hands" ? "hands" : "present",
    durationMs: 4500,
    candidates: pool.map((x) => ({ key: x.key, name: x.name, photo: x.photo || "" })),
    winner: { key: winner.key, name: winner.name, photo: winner.photo || "" },
    by: actor.key,
    cycleReset,
  };
  L.wheel.history.push({ winnerKey: winner.key, winnerName: winner.name, at: spin.at });
  if (L.wheel.history.length > 200) L.wheel.history.shift();
  L.wheel.last = spin;
  persistPush(room, "wheelHistory", { at: new Date(spin.at), pool: spin.pool, winnerKey: winner.key, winnerName: winner.name, byKey: actor.key });
  emitRoom(room, "meeting:wheel:result", { spin });
  return { spin };
});

// ---------------------------------------------------------------- breakout rooms
const groupOfKey = (b, key) => b.groups.find((g) => g.keys.includes(key)) || null;

const breakoutViewFor = (room, key, moderator) => {
  const b = room.live.breakout;
  if (!b.active) return { active: false };
  const mine = groupOfKey(b, key);
  return {
    active: true,
    startedAt: b.startedAt,
    endsAt: b.endsAt,
    closesAt: b.closesAt,
    allowSelf: b.allowSelf,
    myGroupId: mine ? mine.id : null,
    groups: b.groups.map((g) => ({ id: g.id, name: g.name, size: g.keys.length, ...(moderator || (mine && mine.id === g.id) ? { keys: [...g.keys] } : {}) })),
  };
};

// Everyone gets their own view (who is in MY room), moderators see every room.
const emitBreakout = (room, event) => {
  const io = getIO();
  if (!io) return;
  for (const [sid, peer] of room.peers) {
    io.to(sid).emit("meeting:breakout:state", { roomKey: room.roomKey, event, serverNow: Date.now(), ...breakoutViewFor(room, peer.key, rooms.isModerator(room, peer.key)) });
  }
};

const finalizeBreakout = (room, event = "closed", { silent = false } = {}) => {
  const b = room.live.breakout;
  if (!b.active) return;
  const people = b.groups.reduce((n, g) => n + g.keys.length, 0);
  persistPush(room, "breakoutLog", { startedAt: new Date(b.startedAt), endedAt: new Date(), rooms: b.groups.length, people, byKey: b.byKey });
  for (const h of ["handle", "warnHandle", "closeHandle"]) {
    if (b[h]) clearTimeout(b[h]);
    b[h] = null;
  }
  b.active = false;
  b.groups = [];
  b.endsAt = null;
  b.closesAt = null;
  if (!silent) emitBreakout(room, event);
};

const beginClosing = (room, graceSec) => {
  const b = room.live.breakout;
  if (!b.active) return;
  if (b.closeHandle) clearTimeout(b.closeHandle);
  if (graceSec <= 0) return finalizeBreakout(room, "closed");
  b.closesAt = Date.now() + graceSec * 1000;
  emitBreakout(room, "closing");
  b.closeHandle = setTimeout(() => finalizeBreakout(room, "closed"), graceSec * 1000);
  if (b.closeHandle.unref) b.closeHandle.unref();
};

const breakoutCreate = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  const b = L.breakout;
  if (b.active) throw withCode("Breakout rooms are already open. Close them first.", "BREAKOUT_ACTIVE", 409);
  const people = distinctPeers(room).filter((x) => !rooms.isModerator(room, x.key));
  const present = new Set(people.map((x) => x.key));
  const mode = ["auto", "manual", "self"].includes(p.mode) ? p.mode : "auto";
  let groups;

  if (mode === "manual") {
    const given = Array.isArray(p.groups) ? p.groups.slice(0, 30) : [];
    if (!given.length) throw httpError("Send groups: [{ name, keys: [] }] for manual mode.", 400);
    const used = new Set();
    groups = given.map((g, i) => {
      const keys = [];
      for (const k of Array.isArray(g && g.keys) ? g.keys : []) {
        const key = String(k);
        if (!present.has(key) || used.has(key)) continue;
        used.add(key);
        keys.push(key);
      }
      return { id: `b${i + 1}`, name: String((g && g.name) || `Room ${i + 1}`).trim().slice(0, 40) || `Room ${i + 1}`, keys };
    });
  } else {
    if (!people.length && mode === "auto") throw httpError("Nobody to split yet. Wait for people to join.", 409);
    const count = clampInt(p.count, 2, 20, 2);
    const n = mode === "auto" ? Math.min(count, Math.max(people.length, 1)) : count;
    groups = Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, name: `Room ${i + 1}`, keys: [] }));
    if (mode === "auto") shuffle(people).forEach((x, i) => groups[i % n].keys.push(x.key));
  }

  const minutes = clampInt(p.minutes, 0, 180, 0);
  b.active = true;
  b.groups = groups;
  b.startedAt = Date.now();
  b.endsAt = minutes ? b.startedAt + minutes * 60000 : null;
  b.closesAt = null;
  b.allowSelf = mode === "self" || p.allowSelf === true;
  b.byKey = actor.key;
  if (b.endsAt) {
    const warnIn = Math.max(0, b.endsAt - Date.now() - 30000);
    b.warnHandle = setTimeout(() => emitRoom(room, "meeting:breakout:warning", { secondsLeft: 30 }), warnIn);
    b.handle = setTimeout(() => beginClosing(room, 0), b.endsAt - Date.now());
    if (b.warnHandle.unref) b.warnHandle.unref();
    if (b.handle.unref) b.handle.unref();
  }
  emitBreakout(room, "started");
  return { breakout: breakoutViewFor(room, actor.key, true) };
});

const removeFromGroups = (b, key) => {
  for (const g of b.groups) g.keys = g.keys.filter((k) => k !== key);
};

const breakoutJoin = wrap(async (room, socket, actor, p) => {
  inRoom(room, socket);
  const b = room.live.breakout;
  if (!b.active) throw withCode("Breakout rooms are not open.", "BREAKOUT_CLOSED", 409);
  if (rooms.isModerator(room, actor.key)) {
    // hosts roam: nothing to assign, the client just tells everyone which room it is visiting
    const g = b.groups.find((x) => x.id === String(p.groupId));
    emitMods(room, "meeting:breakout:visit", { key: actor.key, groupId: g ? g.id : null });
    return { visiting: g ? g.id : null };
  }
  if (!b.allowSelf) throw withCode("The host assigns breakout rooms in this meeting.", "BREAKOUT_ASSIGNED", 403);
  const g = b.groups.find((x) => x.id === String(p.groupId));
  if (!g) throw httpError("That breakout room does not exist.", 404);
  removeFromGroups(b, actor.key);
  g.keys.push(actor.key);
  emitBreakout(room, "updated");
  return { breakout: breakoutViewFor(room, actor.key, false) };
});

const breakoutLeave = wrap(async (room, socket, actor) => {
  inRoom(room, socket);
  const b = room.live.breakout;
  if (!b.active) return { breakout: { active: false } };
  if (!b.allowSelf && !rooms.isModerator(room, actor.key)) throw withCode("The host assigns breakout rooms in this meeting.", "BREAKOUT_ASSIGNED", 403);
  removeFromGroups(b, actor.key);
  emitBreakout(room, "updated");
  return { breakout: breakoutViewFor(room, actor.key, false) };
});

const breakoutMove = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const b = room.live.breakout;
  if (!b.active) throw withCode("Breakout rooms are not open.", "BREAKOUT_CLOSED", 409);
  const key = String(p.key || "");
  if (!distinctPeers(room).some((x) => x.key === key)) throw httpError("That person is not in the meeting.", 404);
  let target = null;
  if (p.groupId) {
    target = b.groups.find((x) => x.id === String(p.groupId));
    if (!target) throw httpError("That breakout room does not exist.", 404);
  }
  removeFromGroups(b, key);
  if (target) target.keys.push(key);
  emitBreakout(room, "updated");
  return {};
});

const breakoutBroadcast = wrap(async (room, socket, actor, p) => {
  const peer = modOnly(room, socket, actor);
  const text = String(p.text || "").trim().slice(0, 300);
  if (!text) throw httpError("Write a message first.", 400);
  emitRoom(room, "meeting:breakout:message", { text, by: { key: actor.key, name: peer.name }, at: Date.now() });
  return {};
});

const breakoutHelp = wrap(async (room, socket, actor, p) => {
  const peer = inRoom(room, socket);
  const b = room.live.breakout;
  if (!b.active) throw withCode("Breakout rooms are not open.", "BREAKOUT_CLOSED", 409);
  const g = groupOfKey(b, actor.key);
  if (!g) throw httpError("You are not in a breakout room.", 409);
  emitMods(room, "meeting:breakout:help", { groupId: g.id, groupName: g.name, from: { key: actor.key, name: peer.name }, text: String(p.text || "").trim().slice(0, 200), at: Date.now() });
  return {};
});

const breakoutClose = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  if (!room.live.breakout.active) return {};
  beginClosing(room, clampInt(p.graceSec, 0, 300, 30));
  return {};
});

// Used by the call:signal relay: while breakout rooms are open, people only connect inside their own room.
const canSignal = (room, fromSocketId, toSocketId) => {
  const L = room.live;
  if (!L || !L.breakout.active) return true;
  const a = room.peers.get(fromSocketId);
  const b = room.peers.get(toSocketId);
  if (!a || !b) return true;
  if (rooms.isModerator(room, a.key) || rooms.isModerator(room, b.key)) return true;
  const ga = groupOfKey(L.breakout, a.key);
  const gb = groupOfKey(L.breakout, b.key);
  return (ga ? ga.id : null) === (gb ? gb.id : null);
};

// ---------------------------------------------------------------- whiteboard
const sanitizeStroke = (raw, key) => {
  if (!raw || typeof raw !== "object") throw httpError("Invalid stroke.", 400);
  const tool = BOARD_TOOLS.includes(raw.tool) ? raw.tool : "pen";
  const pts = [];
  const src = Array.isArray(raw.points) ? raw.points.slice(0, MAX_POINTS) : [];
  for (const n of src) {
    const v = Number(n);
    if (!Number.isFinite(v)) throw httpError("Invalid stroke points.", 400);
    pts.push(Math.round(Math.min(Math.max(v, -0.5), 1.5) * 10000) / 10000);
  }
  if (pts.length % 2) pts.pop();
  if (pts.length < 2) throw httpError("A stroke needs at least one point.", 400);
  const id = typeof raw.id === "string" && /^[A-Za-z0-9_-]{4,40}$/.test(raw.id) ? raw.id : newId();
  return {
    id,
    k: key,
    tool,
    color: typeof raw.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(raw.color) ? raw.color : "#000000",
    width: clampInt(raw.width, 1, 40, 3),
    points: pts,
    text: tool === "text" ? String(raw.text || "").slice(0, 200) : "",
  };
};

const boardState = wrap(async (room, socket) => {
  inRoom(room, socket);
  const L = room.live;
  return { open: L.flags.boardOpen, anyone: L.flags.boardAnyone, strokes: L.board.strokes };
});

const boardStroke = wrap(async (room, socket, actor, p) => {
  inRoom(room, socket);
  const L = room.live;
  if (!L.flags.boardOpen) throw withCode("The whiteboard is closed.", "BOARD_CLOSED", 409);
  if (!L.flags.boardAnyone && !rooms.isModerator(room, actor.key)) throw withCode("Only the host can draw right now.", "BOARD_HOST_ONLY", 403);
  const stroke = sanitizeStroke(p.stroke, actor.key);
  L.board.strokes.push(stroke);
  if (L.board.strokes.length > MAX_STROKES) L.board.strokes.splice(0, L.board.strokes.length - MAX_STROKES);
  L.board.dirty = true;
  socket.to(roomOf(room.roomKey)).emit("meeting:board:stroke", { roomKey: room.roomKey, stroke });
  return { id: stroke.id };
});

const boardUndo = wrap(async (room, socket, actor) => {
  inRoom(room, socket);
  const L = room.live;
  for (let i = L.board.strokes.length - 1; i >= 0; i -= 1) {
    if (L.board.strokes[i].k === actor.key) {
      const [gone] = L.board.strokes.splice(i, 1);
      L.board.dirty = true;
      emitRoom(room, "meeting:board:remove", { id: gone.id, by: actor.key });
      return { removed: gone.id };
    }
  }
  return { removed: null };
});

const boardClear = wrap(async (room, socket, actor) => {
  modOnly(room, socket, actor);
  const L = room.live;
  L.board.strokes = [];
  L.board.dirty = true;
  emitRoom(room, "meeting:board:clear", { by: actor.key });
  return {};
});

// ---------------------------------------------------------------- captions / transcript / talk time
const rememberName = (L, key, name) => {
  if (!key || !name || L.names.get(key) === name) return;
  L.names.set(key, name);
  L.dirtyNames.add(key);
};

const caption = wrap(async (room, socket, actor, p) => {
  const peer = inRoom(room, socket);
  const L = room.live;
  if (!L.flags.captions) throw withCode("Captions are turned off.", "CAPTIONS_OFF", 403);
  const text = String(p.text || "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!text) return {};
  const lang = String(p.lang || "").slice(0, 12);
  const final = p.final === true;
  const now = Date.now();
  emitRoom(room, "meeting:caption", { key: actor.key, name: peer.name, text, final, lang, at: now });
  rememberName(L, actor.key, peer.name);
  if (final && room.meetingId) {
    L.transcriptBuf.push({ k: actor.key, n: peer.name, t: text, at: new Date(now), lang });
    if (L.transcriptBuf.length > MAX_TRANSCRIPT) L.transcriptBuf.shift();
  }
  return {};
});

const speaking = wrap(async (room, socket, actor, p) => {
  const peer = inRoom(room, socket);
  const L = room.live;
  const now = Date.now();
  rememberName(L, actor.key, peer.name);
  if (p.speaking === true) {
    if (!L.speakingSince.has(socket.id)) L.speakingSince.set(socket.id, now);
  } else {
    const since = L.speakingSince.get(socket.id);
    if (since) {
      addTalk(L, actor.key, Math.min(now - since, 600000));
      L.speakingSince.delete(socket.id);
    }
  }
  return {};
});

const talkView = (room) => {
  const L = room.live;
  const total = [...L.talkTotal.values()].reduce((a, b) => a + b, 0);
  return [...L.talkTotal]
    .map(([key, ms]) => ({ key, name: L.names.get(key) || key, ms: Math.round(ms), pct: total ? Math.round((ms / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.ms - a.ms);
};

// ---------------------------------------------------------------- decisions
const decisionAdd = wrap(async (room, socket, actor, p) => {
  const peer = modOnly(room, socket, actor);
  const text = String(p.text || "").trim().slice(0, 300);
  if (!text) throw httpError("Write the decision first.", 400);
  const L = room.live;
  if (L.decisions.length >= 50) throw httpError("You can log up to 50 decisions per meeting.", 409);
  const d = { id: newId(), text, byKey: actor.key, byName: peer.name, at: new Date() };
  L.decisions.push(d);
  persistPush(room, "decisions", d);
  emitRoom(room, "meeting:decision", { decision: d });
  return { decision: d };
});

const decisionRemove = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const L = room.live;
  const id = String(p.id || "");
  const before = L.decisions.length;
  L.decisions = L.decisions.filter((d) => d.id !== id);
  if (L.decisions.length === before) throw httpError("Decision not found.", 404);
  if (room.meetingId) upsertLive(room, { $pull: { decisions: { id } } });
  emitRoom(room, "meeting:decision:removed", { id });
  return {};
});

// ---------------------------------------------------------------- kudos
const kudosView = (k) => ({
  id: String(k._id),
  from: { key: k.fromKey, name: k.fromName },
  to: { key: k.toKey, name: k.toName },
  badge: k.badge,
  message: k.message,
  at: k.createdAt,
});

const kudosGive = wrap(async (room, socket, actor, p) => {
  notGuest(actor);
  const peer = inRoom(room, socket);
  const L = room.live;
  const toKey = String(p.toKey || "");
  if (!toKey) throw httpError("Choose who gets the kudos.", 400);
  if (toKey === actor.key) throw httpError("You can't give kudos to yourself.", 400);
  if (toKey.startsWith("Guest:")) throw httpError("Kudos are for people inside your organisation.", 400);
  const present = distinctPeers(room).find((x) => x.key === toKey);
  if (!present && !room.invitedKeys.has(toKey) && toKey !== room.ownerKey) throw httpError("That person is not part of this meeting.", 404);

  const now = Date.now();
  const recent = (L.kudosLog.get(actor.key) || []).filter((t) => now - t < 60000);
  if (recent.length >= 5) throw withCode("Easy there - 5 kudos a minute is the limit.", "KUDOS_RATE", 429);
  recent.push(now);
  L.kudosLog.set(actor.key, recent);

  let toName = present ? present.name : "";
  if (!toName) {
    const found = await resolvePeople(room.organisation_id, [parseKey(toKey)]);
    toName = (found.get(toKey) || {}).name || "";
    if (!toName) throw httpError("That person is not part of this organisation.", 404);
  }
  const badge = MeetingKudos.BADGES.includes(p.badge) ? p.badge : "star";
  const doc = await MeetingKudos.create({
    organisation_id: room.organisation_id,
    meeting: room.meetingId,
    fromKey: actor.key,
    fromName: peer.name,
    toKey,
    toName,
    badge,
    message: String(p.message || "").trim().slice(0, 140),
  });
  const view = kudosView(doc);
  emitRoom(room, "meeting:kudos", { kudos: view });
  try {
    const u = require("./meetingSpace.utils");
    u.notifyKeys(actor, [toKey], { _id: room.meetingId }, {
      title: "You got kudos! \uD83C\uDF89",
      message: `${peer.name} gave you kudos in "${room.title}"${view.message ? `: ${view.message}` : "."}`,
      event: "meeting:kudos-received",
      payload: { kudosId: view.id, badge },
    });
  } catch (err) {
    logErr("kudos notify")(err);
  }
  return { kudos: view };
});

// ---------------------------------------------------------------- live Q&A
const qPublic = (q) => ({
  id: String(q._id),
  text: q.text,
  upvotes: (q.upvoterKeys || []).length,
  anonymous: !!q.anonymous,
  asker: q.anonymous ? null : { key: q.askerKey, name: q.askerName },
  status: q.status,
  pinned: !!q.pinned,
  answerText: q.answerText || "",
  answeredBy: q.answeredByName || null,
  answeredAt: q.answeredAt || null,
  createdAt: q.createdAt,
});
const qFor = (q, key) => ({ ...qPublic(q), iUpvoted: (q.upvoterKeys || []).includes(key), mine: q.askerKey === key });

const sortQuestions = (list) =>
  [...list].sort((a, b) => {
    const rank = (q) => (q.status === "open" ? 0 : q.status === "answered" ? 1 : 2);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    const ua = (a.upvoterKeys || []).length;
    const ub = (b.upvoterKeys || []).length;
    if (ua !== ub) return ub - ua;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

const loadQuestion = async (room, id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError("Question not found.", 404);
  const q = await MeetingQuestion.findOne({ _id: id, meeting: room.meetingId });
  if (!q) throw httpError("Question not found.", 404);
  return q;
};

const qaList = wrap(async (room, socket, actor) => {
  inRoom(room, socket);
  const moderator = rooms.isModerator(room, actor.key);
  const docs = await MeetingQuestion.find({ meeting: room.meetingId }).sort({ createdAt: 1 }).limit(500);
  const visible = docs.filter((q) => moderator || q.status !== "dismissed");
  return { enabled: room.live.flags.qa, questions: sortQuestions(visible).map((q) => qFor(q, actor.key)) };
});

const qaAsk = wrap(async (room, socket, actor, p) => {
  const peer = inRoom(room, socket);
  if (!room.live.flags.qa) throw withCode("Q&A is turned off.", "QA_OFF", 403);
  const text = String(p.text || "").trim().slice(0, 300);
  if (text.length < 3) throw httpError("Write your question first.", 400);
  const open = await MeetingQuestion.countDocuments({ meeting: room.meetingId, status: "open" });
  if (open >= MAX_OPEN_QUESTIONS) throw httpError("The question list is full. Ask the host to clear some.", 409);
  const q = await MeetingQuestion.create({
    organisation_id: room.organisation_id,
    meeting: room.meetingId,
    askerKey: actor.key,
    askerName: peer.name,
    anonymous: p.anonymous === true,
    text,
  });
  emitRoom(room, "meeting:qa:new", { question: qPublic(q) });
  return { question: qFor(q, actor.key) };
});

const qaUpvote = wrap(async (room, socket, actor, p) => {
  inRoom(room, socket);
  const q = await loadQuestion(room, p.id);
  if (q.status === "dismissed") throw httpError("Question not found.", 404);
  const has = q.upvoterKeys.includes(actor.key);
  if (has) q.upvoterKeys = q.upvoterKeys.filter((k) => k !== actor.key);
  else q.upvoterKeys.push(actor.key);
  await q.save();
  emitRoom(room, "meeting:qa:update", { question: qPublic(q) });
  return { question: qFor(q, actor.key) };
});

const qaAnswer = wrap(async (room, socket, actor, p) => {
  const peer = modOnly(room, socket, actor);
  const q = await loadQuestion(room, p.id);
  const status = ["answered", "open", "dismissed"].includes(p.status) ? p.status : "answered";
  q.status = status;
  if (status === "answered") {
    q.answerText = String(p.answerText || "").trim().slice(0, 500);
    q.answeredByKey = actor.key;
    q.answeredByName = peer.name;
    q.answeredAt = new Date();
  } else if (status === "open") {
    q.answeredAt = null;
  }
  await q.save();
  emitRoom(room, "meeting:qa:update", { question: qPublic(q) });
  return { question: qFor(q, actor.key) };
});

const qaPin = wrap(async (room, socket, actor, p) => {
  modOnly(room, socket, actor);
  const q = await loadQuestion(room, p.id);
  q.pinned = p.pinned !== false;
  await q.save();
  emitRoom(room, "meeting:qa:update", { question: qPublic(q) });
  return { question: qFor(q, actor.key) };
});

const qaDelete = wrap(async (room, socket, actor, p) => {
  inRoom(room, socket);
  const q = await loadQuestion(room, p.id);
  if (q.askerKey !== actor.key && !rooms.isModerator(room, actor.key)) throw httpError("You can only remove your own question.", 403);
  await q.deleteOne();
  emitRoom(room, "meeting:qa:removed", { id: String(q._id) });
  return {};
});

// ---------------------------------------------------------------- full snapshot (for late joiners / reconnects)
const liveState = wrap(async (room, socket, actor) => {
  inRoom(room, socket);
  const L = room.live;
  const mod = rooms.isModerator(room, actor.key);
  if (L.spotlight && !room.peers.has(L.spotlight.socketId)) L.spotlight = null;
  return {
    state: {
      serverNow: Date.now(),
      flags: L.flags,
      spotlight: L.spotlight,
      timer: timerSnapshot(L.timer),
      agenda: agendaView(L.agenda),
      pulse: pulseView(L.pulse, actor.key),
      lastWheel: L.wheel.last,
      breakout: breakoutViewFor(room, actor.key, mod),
      recording: L.recording,
      decisions: L.decisions,
      board: { open: L.flags.boardOpen, anyone: L.flags.boardAnyone, strokeCount: L.board.strokes.length },
      talk: mod ? talkView(room) : undefined,
    },
  };
});

const talkTime = wrap(async (room, socket, actor) => {
  modOnly(room, socket, actor);
  return { talk: talkView(room) };
});

module.exports = {
  BURSTS,
  BOARD_TOOLS,
  ensure,
  flushNow,
  canSignal,
  parseAgendaText,
  qPublic,
  qFor,
  sortQuestions,
  kudosView,
  // socket-facing API
  liveState,
  setFlags,
  spotlight,
  setRecording,
  burst,
  timerStart,
  timerControl,
  agendaSet,
  agendaAdvance,
  pulseStart,
  pulseSend,
  pulseStop,
  wheelSpin,
  breakoutCreate,
  breakoutJoin,
  breakoutLeave,
  breakoutMove,
  breakoutBroadcast,
  breakoutHelp,
  breakoutClose,
  boardState,
  boardStroke,
  boardUndo,
  boardClear,
  caption,
  speaking,
  talkTime,
  decisionAdd,
  decisionRemove,
  kudosGive,
  qaList,
  qaAsk,
  qaUpvote,
  qaAnswer,
  qaPin,
  qaDelete,
  _tracked: tracked, // exposed for tests
  _sweep: sweep,
};
