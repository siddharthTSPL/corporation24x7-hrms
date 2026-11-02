// Chat "Settings" page + privacy + extras: settings, status presets, report user,
// starred messages, archived chats, storage usage, chat export, clear all chats, help/about.
const mongoose = require("mongoose");
const Conversation = require("../Models/conversation.model");
const ChatMessage = require("../Models/chatmessage.model");
const ChatStar = require("../Models/chatstar.model");
const ChatReport = require("../Models/chatreport.model");
const chat = require("../utils/chat/chat.service");
const settings = require("../utils/chat/settings.service");
const { httpError, resolvePeople, escapeRegex } = require("../utils/chat/people.utils");
const { emitToOrganisation } = require("../config/socket");
const pkg = require("../package.json");

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });
const emitters = { emitToKeys: chat.emitToKeys, emitToOrganisation };
const isStaff = (actor) => actor.model === "Admin" || actor.model === "SuperAdmin";
const oid = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(`${label} not found.`, 404);
  return id;
};

// ---------- settings ----------

// GET /chat/settings
const getSettings = async (req, res) => ok(res, { settings: await settings.getSettings(actorOf(req)) });

// PATCH /chat/settings   body: any subset of { privacy, profile, appearance, notifications, storage }
const updateSettings = async (req, res) => ok(res, { settings: await settings.updateSettings(actorOf(req), req.body, emitters) });

// PUT /chat/settings/status   body: { preset: available|busy|in_meeting|on_leave|custom|"" , text?, duration: 1h|today|7d|never }
const setStatus = async (req, res) => ok(res, { status: await settings.setStatus(actorOf(req), req.body || {}, emitters) });

// ---------- help & about ----------

const SHORTCUTS = [
  { keys: "Ctrl/Cmd + K", action: "Search chats and messages" },
  { keys: "Ctrl/Cmd + F", action: "Search inside this chat" },
  { keys: "Enter", action: "Send message" },
  { keys: "Shift + Enter", action: "New line" },
  { keys: "Esc", action: "Close panel / cancel reply or edit" },
  { keys: "Arrow Up", action: "Edit your last message" },
  { keys: "Ctrl/Cmd + Shift + M", action: "Mute or unmute this chat" },
  { keys: "Ctrl/Cmd + Shift + A", action: "Archive this chat" },
];

// GET /chat/about
const about = async (req, res) => ok(res, { app: "HRMS Chat", version: pkg.version, shortcuts: SHORTCUTS });

// ---------- report user ----------

// POST /chat/report   body: { targetKey, reason, details?, conversationId?, messageId? }
const reportUser = async (req, res) => {
  const actor = actorOf(req);
  const { targetKey, reason, details = "", conversationId, messageId } = req.body || {};
  if (!targetKey || typeof targetKey !== "string") throw httpError("Choose who you are reporting.");
  if (targetKey === actor.key) throw httpError("You cannot report yourself.");
  if (!ChatReport.REASONS.includes(reason)) throw httpError(`Reason must be one of: ${ChatReport.REASONS.join(", ")}.`);
  const text = String(details).replace(/\u0000/g, "").trim();
  if (text.length > 500) throw httpError("Details can be at most 500 characters.");

  const [model, id] = [targetKey.split(":")[0], targetKey.split(":").slice(1).join(":")];
  const found = await resolvePeople(actor.organisation_id, [{ model, id }]);
  if (!found.has(targetKey)) throw httpError("That person was not found.", 404);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if ((await ChatReport.countDocuments({ reporterKey: actor.key, createdAt: { $gte: since } })) >= 10) {
    throw httpError("You have sent too many reports today. Please try again tomorrow.", 429);
  }

  const doc = { organisation_id: actor.organisation_id, reporterKey: actor.key, targetKey, reason, details: text };
  if (conversationId) {
    await chat.loadConversation(actor, oid(conversationId, "Conversation")); // I must be in it
    doc.conversation = conversationId;
  }
  if (messageId) {
    const msg = await ChatMessage.findOne({ _id: oid(messageId, "Message"), organisation_id: actor.organisation_id }).lean();
    if (!msg || msg.senderKey !== targetKey) throw httpError("Message not found.", 404);
    await chat.loadConversation(actor, String(msg.conversation));
    doc.message = msg._id;
    doc.conversation = msg.conversation;
    doc.messageSnapshot = String(msg.text || "").slice(0, 1000);
  }
  const report = await ChatReport.create(doc);
  ok(res, { reportId: String(report._id) }, 201);
};

// GET /chat/reports?status=open   (Admin / Super Admin only)
const listReports = async (req, res) => {
  const actor = actorOf(req);
  if (!isStaff(actor)) throw httpError("Only admins can view reports.", 403);
  const q = { organisation_id: actor.organisation_id };
  if (["open", "reviewed", "dismissed"].includes(req.query.status)) q.status = req.query.status;
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const rows = await ChatReport.find(q).sort({ createdAt: -1 }).limit(limit).lean();
  const refs = [];
  for (const r of rows) for (const k of [r.reporterKey, r.targetKey]) refs.push({ model: k.split(":")[0], id: k.split(":").slice(1).join(":") });
  const people = await resolvePeople(actor.organisation_id, refs);
  const brief = (k) => ({ key: k, name: people.get(k)?.name || "Unknown", photo: people.get(k)?.photo || "" });
  ok(res, { reports: rows.map((r) => ({ id: String(r._id), reporter: brief(r.reporterKey), target: brief(r.targetKey), reason: r.reason, details: r.details, messageSnapshot: r.messageSnapshot, conversationId: r.conversation ? String(r.conversation) : null, status: r.status, createdAt: r.createdAt })) });
};

// PATCH /chat/reports/:id   body: { status: reviewed|dismissed }
const reviewReport = async (req, res) => {
  const actor = actorOf(req);
  if (!isStaff(actor)) throw httpError("Only admins can review reports.", 403);
  const status = req.body?.status;
  if (!["reviewed", "dismissed"].includes(status)) throw httpError("Status must be reviewed or dismissed.");
  const r = await ChatReport.findOneAndUpdate(
    { _id: oid(req.params.id, "Report"), organisation_id: actor.organisation_id },
    { $set: { status, reviewedByKey: actor.key, reviewedAt: new Date() } }, { new: true }
  );
  if (!r) throw httpError("Report not found.", 404);
  ok(res, { status: r.status });
};

// ---------- starred messages ----------

const loadAccessibleMessage = async (actor, messageId) => {
  const msg = await ChatMessage.findOne({ _id: oid(messageId, "Message"), organisation_id: actor.organisation_id, deletedAt: null, deletedFor: { $ne: actor.key }, ...chat.notExpired() }).lean();
  if (!msg || !chat.COUNTED_TYPES.includes(msg.type)) throw httpError("Message not found.", 404);
  await chat.loadConversation(actor, String(msg.conversation)); // 404s if I'm not in that chat
  return msg;
};

// POST /messages/:messageId/star   body: { starred: true|false }
const starMessage = async (req, res) => {
  const actor = actorOf(req);
  const msg = await loadAccessibleMessage(actor, req.params.messageId);
  const starred = req.body?.starred !== false;
  if (starred) {
    await ChatStar.updateOne(
      { key: actor.key, message: msg._id },
      { $setOnInsert: { organisation_id: actor.organisation_id, key: actor.key, message: msg._id, conversation: msg.conversation } },
      { upsert: true }
    );
  } else {
    await ChatStar.deleteOne({ key: actor.key, message: msg._id });
  }
  chat.emitToKeys([actor.key], "chat:message:starred", { messageId: String(msg._id), starred });
  ok(res, { starred });
};

// GET /chat/starred?limit=30&before=<cursor>&conversationId=<only this chat>&q=<search text>
const listStarred = async (req, res) => {
  const actor = actorOf(req);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const q = { key: actor.key };
  if (req.query.conversationId) q.conversation = oid(req.query.conversationId, "Conversation");
  const term = String(req.query.q || "").trim();
  if (term) {
    // search inside my starred messages: find matching messages first, then keep only those stars
    const mineStars = (await ChatStar.find({ key: actor.key }).select("message").limit(2000).lean()).map((x) => x.message);
    const hit = await ChatMessage.find({ _id: { $in: mineStars }, text: new RegExp(escapeRegex(term), "i") }).select("_id").limit(500).lean();
    q.message = { $in: hit.map((h) => h._id) };
  }
  if (req.query.before) q._id = { $lt: oid(req.query.before, "Cursor") };
  const stars = await ChatStar.find(q).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = stars.length > limit;
  const page = stars.slice(0, limit);

  const convs = await Conversation.find({ _id: { $in: page.map((s) => s.conversation) }, participantKeys: actor.key });
  const people = await chat.loadPeopleForConversations(actor.organisation_id, convs);
  const convInfo = new Map(convs.map((c) => {
    const s = chat.serializeConversation(c, actor, people);
    return [String(c._id), { id: s.id, type: s.type, name: s.name, photo: s.photo }];
  }));
  const rows = await ChatMessage.find({ _id: { $in: page.map((s) => s.message) }, deletedAt: null, deletedFor: { $ne: actor.key }, ...chat.notExpired() }).lean();
  const hydrated = new Map((await chat.hydrateMessages(actor.organisation_id, rows, actor.key)).map((m) => [String(m.id || m._id), m]));

  const starred = page
    .filter((s) => convInfo.has(String(s.conversation)) && hydrated.has(String(s.message)))
    .map((s) => ({ starredAt: s.createdAt, conversation: convInfo.get(String(s.conversation)), message: hydrated.get(String(s.message)) }));
  ok(res, { starred, hasMore, nextCursor: hasMore ? String(page[page.length - 1]._id) : null });
};

// ---------- archived chats ----------

// PATCH /conversations/:id/archive   body: { archived: true|false }
const setArchived = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.loadConversation(actor, req.params.id);
  const archived = !!req.body?.archived;
  await Conversation.updateOne({ _id: conv._id, "participants.key": actor.key }, { $set: { "participants.$.archived": archived } });
  chat.emitToKeys([actor.key], "chat:conversation:updated", { conversationId: String(conv._id), archived });
  ok(res, { archived });
};

// ---------- storage & data ----------

// GET /chat/storage  -> how much media I have, by type and by chat
const storage = async (req, res) => {
  const actor = actorOf(req);
  const convIds = (await Conversation.find({ organisation_id: actor.organisation_id, participantKeys: actor.key }).select("_id").lean()).map((c) => c._id);
  const base = { conversation: { $in: convIds }, deletedAt: null, deletedFor: { $ne: actor.key } };
  const [agg, totalMessages] = await Promise.all([
    ChatMessage.aggregate([
      { $match: { ...base, "attachments.0": { $exists: true } } },
      { $unwind: "$attachments" },
      { $addFields: { cat: { $switch: { branches: [
        { case: { $regexMatch: { input: { $ifNull: ["$attachments.mime", ""] }, regex: "^image/" } }, then: "photos" },
        { case: { $regexMatch: { input: { $ifNull: ["$attachments.mime", ""] }, regex: "^video/" } }, then: "video" },
        { case: { $regexMatch: { input: { $ifNull: ["$attachments.mime", ""] }, regex: "^audio/" } }, then: "audio" },
      ], default: "documents" } } } },
      { $facet: {
        byType: [{ $group: { _id: "$cat", count: { $sum: 1 }, bytes: { $sum: "$attachments.size" } } }],
        byChat: [{ $group: { _id: "$conversation", count: { $sum: 1 }, bytes: { $sum: "$attachments.size" } } }, { $sort: { bytes: -1 } }, { $limit: 10 }],
      } },
    ]),
    ChatMessage.countDocuments(base),
  ]);
  const facets = agg[0] || { byType: [], byChat: [] };
  const byType = { photos: { count: 0, bytes: 0 }, video: { count: 0, bytes: 0 }, audio: { count: 0, bytes: 0 }, documents: { count: 0, bytes: 0 } };
  for (const r of facets.byType) byType[r._id] = { count: r.count, bytes: r.bytes };

  const topConvs = await Conversation.find({ _id: { $in: facets.byChat.map((r) => r._id) } });
  const people = await chat.loadPeopleForConversations(actor.organisation_id, topConvs);
  const names = new Map(topConvs.map((c) => [String(c._id), chat.serializeConversation(c, actor, people).name]));
  ok(res, {
    totalMessages,
    totalMedia: Object.values(byType).reduce((n, t) => n + t.count, 0),
    totalBytes: Object.values(byType).reduce((n, t) => n + t.bytes, 0),
    byType,
    biggestChats: facets.byChat.map((r) => ({ conversationId: String(r._id), name: names.get(String(r._id)) || "Chat", count: r.count, bytes: r.bytes })),
  });
};

// GET /conversations/:id/export?format=txt|json   -> file download (only what I can see)
const exportChat = async (req, res) => {
  const actor = actorOf(req);
  const conv = await chat.loadConversation(actor, req.params.id);
  const me = conv.participants.find((p) => p.key === actor.key);
  const q = { conversation: conv._id, deletedAt: null, deletedFor: { $ne: actor.key }, ...chat.notExpired() };
  if (me?.clearedAt) q.createdAt = { $gt: me.clearedAt };
  const rows = await ChatMessage.find(q).sort({ _id: 1 }).limit(20000).lean();
  const people = await chat.loadPeopleForConversations(actor.organisation_id, [conv]);
  const title = chat.serializeConversation(conv, actor, people).name || "chat";
  const safe = title.replace(/[^\w\-]+/g, "_").slice(0, 40) || "chat";
  const stamp = (d) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const nameOf = (k) => people.get(k)?.name || "Someone";

  if (req.query.format === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safe}.json"`);
    return res.send(JSON.stringify({ chat: title, exportedAt: new Date(), messages: rows.map((m) => ({
      at: m.createdAt, from: m.senderKey ? nameOf(m.senderKey) : "System", type: m.type, text: m.text,
      attachments: (m.attachments || []).map((a) => ({ name: a.name, url: a.url, mime: a.mime, size: a.size })),
    })) }, null, 2));
  }
  const lines = rows.map((m) => {
    const who = m.type === "system" || m.type === "call" ? "" : `${nameOf(m.senderKey)}: `;
    const files = (m.attachments || []).map((a) => `[file: ${a.name || "attachment"} ${a.url}]`).join(" ");
    const body = m.type === "sticker" ? "[sticker]" : [m.text, files].filter(Boolean).join(" ");
    return `[${stamp(m.createdAt)}] ${who}${body}`;
  });
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${safe}.txt"`);
  res.send(`Chat with ${title}\nExported ${stamp(new Date())}\n\n${lines.join("\n")}\n`);
};

// POST /chat/clear-all   body: { confirm: true }   -> clears every chat for me only
const clearAll = async (req, res) => {
  const actor = actorOf(req);
  if (req.body?.confirm !== true) throw httpError("Please confirm to clear all chats.");
  const r = await Conversation.updateMany(
    { organisation_id: actor.organisation_id, participantKeys: actor.key },
    { $set: { "participants.$[p].clearedAt": new Date(), "participants.$[p].unread": 0 } },
    { arrayFilters: [{ "p.key": actor.key }] }
  );
  chat.emitToKeys([actor.key], "chat:conversation:updated", { clearedAll: true });
  ok(res, { cleared: r.modifiedCount || 0 });
};

module.exports = {
  getSettings, updateSettings, setStatus, about,
  reportUser, listReports, reviewReport,
  starMessage, listStarred, setArchived,
  storage, exportChat, clearAll,
};
