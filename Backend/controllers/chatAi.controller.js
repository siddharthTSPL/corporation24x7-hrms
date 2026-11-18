// HTTP layer for Spark's AI helpers. Logic + prompts: utils/chat/ai.service.js
const ai = require("../utils/chat/ai.service");
const chat = require("../utils/chat/chat.service");
const ChatMessage = require("../Models/chatmessage.model");
const CallTranscript = require("../Models/calltranscript.model");
const MeetingLive = require("../Models/meetinglive.model");
const u = require("../utils/chat/meetingSpace.utils");
const { httpError } = require("../utils/chat/people.utils");

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });
const guard = (actor) => ai.rateLimit(actor.key);

// POST /chat/ai/translate { text, target?: "en", allowPublic? }
const translate = async (req, res) => {
  const actor = actorOf(req);
  guard(actor);
  const r = await ai.translate(req.body?.text, req.body?.target || "en", { allowPublic: req.body?.allowPublic === true });
  ok(res, r);
};

// GET /chat/ai/status -> what the server can do (so the UI can hide buttons that cannot work)
const status = async (_req, res) => ok(res, { ai: ai.hasKey(), languages: ai.LANGS, rewriteModes: Object.keys(ai.REWRITE) });

// POST /chat/ai/rewrite { text, mode }
const rewrite = async (req, res) => {
  const actor = actorOf(req);
  guard(actor);
  ok(res, await ai.rewrite(req.body?.text, req.body?.mode || "fix"));
};

// my view of the last N text messages of a chat (only what I am allowed to see)
const recentLines = async (actor, conversationId, { limit = 80, unreadOnly = false } = {}) => {
  const { conv, messages } = await chat.getMessages(actor, conversationId, { limit });
  const me = conv.participants.find((p) => p.key === actor.key);
  const since = unreadOnly && me && me.unread > 0 ? messages.slice(-me.unread) : messages;
  const lines = since
    .filter((m) => m.type === "text" && m.text && !m.deleted && !m.deletedAt)
    .map((m) => ({ id: m.id, name: m.sender?.name || "Someone", text: String(m.text).slice(0, 600) }));
  return { conv, lines };
};

// POST /chat/conversations/:id/ai/catchup { limit?, unreadOnly? }
const catchup = async (req, res) => {
  const actor = actorOf(req);
  guard(actor);
  const { conv, lines } = await recentLines(actor, req.params.id, { limit: Math.min(parseInt(req.body?.limit, 10) || 80, 100), unreadOnly: req.body?.unreadOnly === true });
  const notes = await ai.digest(lines, { kind: "chat", title: conv.type === "direct" ? "" : conv.name });
  ok(res, { notes, basedOn: lines.length });
};

// POST /chat/conversations/:id/ai/replies
const replies = async (req, res) => {
  const actor = actorOf(req);
  guard(actor);
  const { lines } = await recentLines(actor, req.params.id, { limit: 12 });
  const last = lines[lines.length - 1];
  if (!last) return ok(res, { replies: [] });
  ok(res, await ai.smartReplies(lines));
};

// ---------------------------------------------------------------- call notes
// POST /chat/calls/:callId/transcript { conversationId, lines: [{ t, at }] }  (each browser uploads its OWN speech)
const uploadCallLines = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.loadConversation(actor, req.body?.conversationId);
  const me = await require("../utils/chat/people.utils").resolvePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }]);
  const name = me.get(actor.key)?.name || "Someone";
  const lines = (Array.isArray(req.body?.lines) ? req.body.lines : []).slice(0, 100).map((l) => ({ k: actor.key, n: name, t: String(l?.t || "").slice(0, 600).trim(), at: l?.at ? new Date(l.at) : new Date() })).filter((l) => l.t);
  if (!lines.length) return ok(res, { saved: 0 });
  const callId = String(req.params.callId).slice(0, 80);
  await CallTranscript.updateOne(
    { callId, organisation_id: actor.organisation_id },
    { $push: { lines: { $each: lines, $slice: -3000 } }, $setOnInsert: { conversation: conv._id } },
    { upsert: true }
  );
  ok(res, { saved: lines.length });
};

// POST /chat/calls/:callId/notes { conversationId, title? } -> writes the notes into the chat for everyone (once per call)
const callNotes = async (req, res) => {
  const actor = actorOf(req);
  guard(actor);
  const conv = await chat.loadConversation(actor, req.body?.conversationId);
  const callId = String(req.params.callId).slice(0, 80);
  const doc = await CallTranscript.findOne({ callId, organisation_id: actor.organisation_id, conversation: conv._id });
  if (!doc || doc.lines.length < 2) throw httpError("No spoken words were captured for this call. Turn on \"Live notes\" during a call (Chrome or Edge) to get notes.", 404);
  if (doc.notesMessage) {
    const msg = await ChatMessage.findById(doc.notesMessage).select("meta").lean();
    return ok(res, { notes: msg?.meta?.notes || null, already: true });
  }
  const lines = [...doc.lines].sort((a, b) => new Date(a.at) - new Date(b.at)).map((l) => ({ name: l.n, text: l.t }));
  const notes = await ai.digest(lines, { kind: "call" });
  const title = String(req.body?.title || "Call notes").slice(0, 80);
  const posted = await chat.postSystemMessage(conv, actor, { event: "call_notes", callId, notes, title }, ai.notesToText(notes, title));
  await CallTranscript.updateOne({ _id: doc._id, notesMessage: { $exists: false } }, { $set: { notesMessage: posted.id } });
  ok(res, { notes, messageId: posted.id }, 201);
};

// ---------------------------------------------------------------- meeting notes
// POST /meetings/:id/ai-notes  -> AI notes from the saved transcript (host, or anyone once the host shared it)
const meetingNotes = async (req, res) => {
  const actor = u.actorOf(req);
  guard(actor);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const moderator = u.isModerator(m, actor.key);
  const doc = await MeetingLive.findOne({ meeting: m._id, organisation_id: actor.organisation_id }).select("transcript transcriptShared").lean();
  if (!moderator && !(doc && doc.transcriptShared)) throw httpError("The host has not shared the transcript.", 403);
  const lines = ((doc && doc.transcript) || []).map((l) => ({ name: l.n, text: l.t }));
  if (lines.length < 2) throw httpError("There is no transcript for this meeting yet. Turn on captions in the meeting to record one.", 404);
  ok(res, { notes: await ai.digest(lines, { kind: "meeting", title: m.title }), basedOn: lines.length });
};

module.exports = { translate, status, rewrite, catchup, replies, uploadCallLines, callNotes, meetingNotes };
