const path = require("path");
const mongoose = require("mongoose");
const Conversation = require("../Models/conversation.model");
const ChatMessage = require("../Models/chatmessage.model");
const ChatStar = require("../Models/chatstar.model");
const CallSession = require("../Models/callsession.model");
const imagekit = require("../utils/imagekit.utils");
const chat = require("../utils/chat/chat.service");
const rooms = require("../utils/chat/callRooms");
const presence = require("../utils/chat/presence");
const { getIceServers, hasTurn } = require("../utils/chat/ice.utils");
const { httpError, escapeRegex, searchDirectory, resolvePeople, parseKey } = require("../utils/chat/people.utils");

const extras = require("../utils/chat/chatExtras.service");

// multipart forms send lists as a JSON string or repeated fields; JSON bodies send a real array
const asList = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string" || !v.trim()) return [];
  try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch { return v.split(",").map((x) => x.trim()).filter(Boolean); }
};

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });

// ---------- directory ----------

// GET /chat/directory?q=ravi&limit=20&department=Engineering
const searchPeople = async (req, res) => {
  const actor = actorOf(req);
  const people = await searchDirectory(actor.organisation_id, {
    q: req.query.q,
    excludeKey: actor.key,
    limit: parseInt(req.query.limit, 10) || 20,
    department: req.query.department || "",
  });
  await presence.hydrate(people.map((p) => p.key));
  ok(res, { people: people.map((p) => ({ ...p, ...presence.publicState(p.key, actor.key) })) });
};

// ---------- conversations ----------

// GET /chat/conversations?limit=50&before=<ISO date of lastMessageAt>
//     &filter=all|unread|groups|direct|favourites|mentions     (the chips above the chat list)
//     &archived=true                                            (only archived chats)
const listConversations = async (req, res) => {
  const actor = actorOf(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const q = {
    organisation_id: actor.organisation_id,
    participantKeys: actor.key,
    // empty 1:1 / meeting chats stay hidden until someone says something
    $or: [{ type: "group" }, { "lastMessage.at": { $exists: true } }],
  };
  const mine = (cond) => ({ participants: { $elemMatch: { key: actor.key, ...cond } } });
  // ?archived=true -> only my archived chats; otherwise archived chats stay out of the main list
  const and = [req.query.archived === "true" ? mine({ archived: true }) : { participants: { $not: { $elemMatch: { key: actor.key, archived: true } } } }];
  const filter = String(req.query.filter || "all");
  if (filter === "unread") and.push(mine({ unread: { $gt: 0 } }));
  else if (filter === "favourites") and.push(mine({ favourite: true }));
  else if (filter === "mentions") and.push(mine({ mentionUnread: { $gt: 0 } }));
  else if (filter === "groups") q.type = "group";
  else if (filter === "direct") q.type = "direct";
  else if (filter !== "all") throw httpError("filter must be all, unread, groups, direct, favourites or mentions.");
  q.$and = and;
  if (req.query.type && ["direct", "group", "meeting"].includes(req.query.type)) q.type = req.query.type;
  if (req.query.before) {
    const d = new Date(req.query.before);
    if (!isNaN(d)) q.lastMessageAt = { $lt: d };
  }

  const convs = await Conversation.find(q).sort({ lastMessageAt: -1 }).limit(limit + 1);
  const hasMore = convs.length > limit;
  const page = convs.slice(0, limit);
  const people = await chat.loadPeopleForConversations(actor.organisation_id, page);
  ok(res, {
    conversations: page.map((c) => chat.serializeConversation(c, actor, people)),
    hasMore,
    nextBefore: hasMore ? page[page.length - 1].lastMessageAt : null,
  });
};

const getConversation = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.loadConversation(actor, req.params.id);
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor), pinned: await extras.getPinned(actor, conv) });
};

// POST /chat/conversations/direct  { participant: { model, id } }
const openDirect = async (req, res) => {
  const actor = actorOf(req);
  const p = req.body?.participant;
  if (!p) throw httpError("participant is required.");
  const conv = await chat.getOrCreateDirect(actor, p);
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor) });
};

// POST /chat/conversations/group  { name, description?, members: [{model,id}] }
const createGroup = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.createGroup(actor, req.body || {});
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor) }, 201);
};

const updateGroup = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.updateGroup(actor, req.params.id, req.body || {});
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor) });
};

const addMembers = async (req, res) => {
  const actor = actorOf(req);
  if (!Array.isArray(req.body?.members) || !req.body.members.length) throw httpError("members must be a non-empty array.");
  const conv = await chat.addMembers(actor, req.params.id, req.body.members);
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor) });
};

const removeMember = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.removeMember(actor, req.params.id, decodeURIComponent(req.params.key));
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor) });
};

const setMemberRole = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.setMemberRole(actor, req.params.id, decodeURIComponent(req.params.key), req.body?.role);
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor) });
};

const leaveGroup = async (req, res) => {
  await chat.leaveGroup(actorOf(req), req.params.id);
  ok(res, { message: "You left the group." });
};

const setMuted = async (req, res) => {
  await chat.setMuted(actorOf(req), req.params.id, !!req.body?.muted);
  ok(res, { muted: !!req.body?.muted });
};

const markRead = async (req, res) => {
  const at = await chat.markRead(actorOf(req), req.params.id);
  ok(res, { readAt: at });
};

// ---------- messages ----------

// GET /chat/conversations/:id/messages?before=<messageId>&limit=40
const getMessages = async (req, res) => {
  const actor = actorOf(req);
  const { messages, hasMore, nextCursor } = await chat.getMessages(actor, req.params.id, {
    before: req.query.before || null,
    limit: req.query.limit,
  });
  // mark the messages I have starred (star icon in the bubble)
  const stars = await ChatStar.find({ key: actor.key, message: { $in: messages.map((m) => m.id) } }).select("message").lean();
  const starred = new Set(stars.map((s) => String(s.message)));
  for (const m of messages) m.starred = starred.has(m.id);
  ok(res, { messages, hasMore, nextCursor });
};

const safeFileName = (name) => path.basename(String(name || "file")).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";

const uploadAttachments = async (files, actor, conversationId) =>
  Promise.all(
    files.map(async (f) => {
      const up = await imagekit.upload({
        file: f.buffer.toString("base64"),
        fileName: safeFileName(f.originalname),
        folder: `/chat/${actor.organisation_id}/${conversationId}`,
        useUniqueFileName: true,
        tags: [String(actor.organisation_id)],
      });
      return { url: up.url, fileId: up.fileId, name: safeFileName(f.originalname), mime: f.mimetype, size: f.size };
    })
  );

// POST /chat/conversations/:id/messages   (JSON, or multipart with "attachments")
const sendMessage = async (req, res) => {
  const actor = actorOf(req);
  // authorise BEFORE spending an upload
  await chat.loadConversation(actor, req.params.id);
  const files = req.files || [];
  const attachments = files.length ? await uploadAttachments(files, actor, req.params.id) : [];
  const { message, duplicate } = await chat.sendMessage(actor, req.params.id, {
    text: req.body?.text,
    replyTo: req.body?.replyTo || null,
    clientId: req.body?.clientId || null,
    sticker: req.body?.sticker || null,
    mentions: asList(req.body?.mentions),
    attachments,
  });
  ok(res, { message, duplicate }, duplicate ? 200 : 201);
};

const editMessage = async (req, res) => {
  ok(res, { message: await chat.editMessage(actorOf(req), req.params.messageId, req.body?.text, req.body?.mentions === undefined ? undefined : asList(req.body.mentions)) });
};

// DELETE /chat/messages/:id            -> delete for everyone
// DELETE /chat/messages/:id?scope=me   -> delete only for me
const deleteMessage = async (req, res) => {
  const scope = req.query.scope === "me" ? "me" : "everyone";
  ok(res, await chat.deleteMessage(actorOf(req), req.params.messageId, scope));
};

// POST /chat/messages/:id/react  { emoji }
const reactToMessage = async (req, res) => {
  ok(res, { message: await chat.toggleReaction(actorOf(req), req.params.messageId, req.body?.emoji) });
};

// POST /chat/messages/:id/forward  { conversationIds: [] }
const forwardMessage = async (req, res) => {
  ok(res, { messages: await chat.forwardMessage(actorOf(req), req.params.messageId, req.body?.conversationIds) });
};

// ---------- per-person chat settings ----------

// PATCH /chat/conversations/:id/wallpaper  { wallpaper }   ("" = default)
const setWallpaper = async (req, res) => {
  ok(res, { wallpaper: await chat.setWallpaper(actorOf(req), req.params.id, req.body?.wallpaper) });
};

// POST /chat/conversations/:id/wallpaper/upload   (multipart, field "image")
const uploadWallpaper = async (req, res) => {
  const actor = actorOf(req);
  await chat.loadConversation(actor, req.params.id);
  const file = req.file;
  if (!file || !String(file.mimetype).startsWith("image/")) throw httpError("Please choose an image.");
  const [att] = await uploadAttachments([file], actor, `${req.params.id}/wallpaper`);
  ok(res, { wallpaper: await chat.setWallpaper(actor, req.params.id, att.url) });
};

const setPinned = async (req, res) => {
  await chat.setPinnedChat(actorOf(req), req.params.id, !!req.body?.pinned);
  ok(res, { pinned: !!req.body?.pinned });
};

const clearChat = async (req, res) => {
  await chat.clearChat(actorOf(req), req.params.id);
  ok(res, { message: "Chat cleared." });
};

const whoAmI = async (req, res) => {
  const actor = actorOf(req);
  ok(res, { key: actor.key, model: actor.model, id: actor.id });
};

// GET /chat/search?q=invoice&conversationId=<optional>
const searchMessages = async (req, res) => {
  const actor = actorOf(req);
  const term = String(req.query.q || "").trim();
  if (term.length < 2) throw httpError("Type at least 2 characters to search.");

  let convIds;
  if (req.query.conversationId) {
    const c = await chat.loadConversation(actor, req.query.conversationId);
    convIds = [c._id];
  } else {
    const mine = await Conversation.find({ organisation_id: actor.organisation_id, participantKeys: actor.key }).select("_id name type").limit(500).lean();
    convIds = mine.map((c) => c._id);
  }

  const rows = await ChatMessage.find({
    conversation: { $in: convIds },
    type: { $in: ["text", "file", "poll"] },
    deletedAt: null,
    deletedFor: { $ne: actor.key },
    ...chat.notExpired(),
    text: new RegExp(escapeRegex(term), "i"),
  })
    .sort({ _id: -1 })
    .limit(30)
    .maxTimeMS(4000)
    .lean();

  ok(res, { results: await chat.hydrateMessages(actor.organisation_id, rows, actor.key) });
};

const unreadCount = async (req, res) => {
  ok(res, await chat.totalUnread(actorOf(req)));
};

// GET /chat/presence?keys=User:abc,Manager:def
const getPresence = async (req, res) => {
  const keys = String(req.query.keys || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
  await presence.hydrate(keys);
  ok(res, { presence: presence.snapshot(keys, actorOf(req).key) });
};

// ---------- calls ----------

const iceServers = async (req, res) => {
  const actor = actorOf(req);
  ok(res, { iceServers: getIceServers(actor.key), turnConfigured: hasTurn() });
};

// GET /chat/calls/active  -> calls/meetings in progress that I may join
const activeCalls = async (req, res) => {
  const actor = actorOf(req);
  ok(res, { calls: rooms.activeFor(actor.key).filter((r) => r.organisation_id === actor.organisation_id).map(rooms.summary) });
};

// GET /chat/calls/history?limit=30&before=<ISO date>
const callHistory = async (req, res) => {
  const actor = actorOf(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const q = {
    organisation_id: actor.organisation_id,
    $or: [{ invitedKeys: actor.key }, { initiatorKey: actor.key }],
    status: { $in: ["ended", "missed", "declined"] },
  };
  if (req.query.before) {
    const d = new Date(req.query.before);
    if (!isNaN(d)) q.startedAt = { $lt: d };
  }
  const rows = await CallSession.find(q).sort({ startedAt: -1 }).limit(limit + 1).lean();
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);

  const refs = new Map();
  for (const r of page) for (const k of [r.initiatorKey, ...r.invitedKeys.slice(0, 5)]) if (k) refs.set(k, parseKey(k));
  const people = await resolvePeople(actor.organisation_id, [...refs.values()]);
  const mini = (k) => (people.has(k) ? { key: k, name: people.get(k).name, photo: people.get(k).photo } : { key: k, name: "Former member", photo: "" });

  ok(res, {
    calls: page.map((r) => {
      const outgoing = r.initiatorKey === actor.key;
      const joined = (r.participants || []).some((p) => p.key === actor.key);
      return {
        id: String(r._id),
        kind: r.kind,
        media: r.media,
        direction: outgoing ? "outgoing" : "incoming",
        // from MY point of view: an incoming call I never joined is "missed" even if others answered
        outcome: r.status === "ended" && !outgoing && !joined ? "missed" : r.status,
        durationSec: r.durationSec,
        conversationId: r.conversation ? String(r.conversation) : null,
        meetingId: r.meeting ? String(r.meeting) : null,
        initiator: mini(r.initiatorKey),
        with: (outgoing ? r.invitedKeys : [r.initiatorKey, ...r.invitedKeys.filter((k) => k !== actor.key)]).slice(0, 5).map(mini),
        participantCount: (r.participants || []).length,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
      };
    }),
    hasMore,
    nextBefore: hasMore ? page[page.length - 1].startedAt : null,
  });
};

module.exports = {
  searchPeople,
  listConversations,
  getConversation,
  openDirect,
  createGroup,
  updateGroup,
  addMembers,
  removeMember,
  setMemberRole,
  leaveGroup,
  setMuted,
  markRead,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  forwardMessage,
  setWallpaper,
  uploadWallpaper,
  setPinned,
  clearChat,
  whoAmI,
  searchMessages,
  unreadCount,
  getPresence,
  iceServers,
  activeCalls,
  callHistory,
};
