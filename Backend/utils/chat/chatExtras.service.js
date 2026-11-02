// Chat extras: favourites + list counts, drafts, disappearing messages, pinned messages,
// polls, Media/Docs/Links tabs and @mentions.
// (Basic sending, receipts, group membership live in chat.service.js.)
const mongoose = require("mongoose");
const Conversation = require("../../Models/conversation.model");
const ChatMessage = require("../../Models/chatmessage.model");
const chat = require("./chat.service");
const { httpError, resolvePeople } = require("./people.utils");

const emitToKeys = chat.emitToKeys;
const nameOf = async (actor) => {
  const people = await resolvePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }]);
  return people.get(actor.key)?.name || "Someone";
};
const clampLimit = (v, def, max) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);

// Loads a message I am allowed to see, plus its conversation. Same 404 for every "no".
const loadMessage = async (actor, messageId, types = chat.COUNTED_TYPES) => {
  chat.assertObjectId(messageId, "message id");
  const msg = await ChatMessage.findOne({
    _id: messageId,
    organisation_id: actor.organisation_id,
    deletedAt: null,
    deletedFor: { $ne: actor.key },
    ...chat.notExpired(),
  });
  if (!msg || !types.includes(msg.type)) throw httpError("Message not found.", 404);
  const conv = await chat.loadConversation(actor, msg.conversation);
  return { msg, conv };
};

// What I am allowed to see in a chat (hidden: cleared history, deleted-for-me, deleted, expired).
const visibleQuery = (conv, actor) => {
  const me = conv.participants.find((p) => p.key === actor.key);
  const q = { conversation: conv._id, deletedAt: null, deletedFor: { $ne: actor.key }, ...chat.notExpired() };
  if (me && me.clearedAt) q.createdAt = { $gt: me.clearedAt };
  return q;
};

// ---------- chat list: favourites + the numbers on the filter chips ----------

const setFavourite = async (actor, conversationId, favourite) => {
  const conv = await chat.loadConversation(actor, conversationId);
  await Conversation.updateOne({ _id: conv._id, "participants.key": actor.key }, { $set: { "participants.$.favourite": !!favourite } });
  emitToKeys([actor.key], "chat:conversation:updated", { conversationId: String(conv._id), favourite: !!favourite });
  return !!favourite;
};

// All / Unread / Groups / Direct / Favourites (+ Archived, and chats with an unread @mention)
const listCounts = async (actor) => {
  const [r] = await Conversation.aggregate([
    {
      $match: {
        organisation_id: new mongoose.Types.ObjectId(actor.organisation_id),
        participantKeys: actor.key,
        $or: [{ type: "group" }, { "lastMessage.at": { $exists: true } }],
      },
    },
    { $unwind: "$participants" },
    { $match: { "participants.key": actor.key } },
    {
      $addFields: {
        live: { $ne: ["$participants.archived", true] },
        hasUnread: { $gt: [{ $ifNull: ["$participants.unread", 0] }, 0] },
      },
    },
    {
      $group: {
        _id: null,
        all: { $sum: { $cond: ["$live", 1, 0] } },
        unread: { $sum: { $cond: [{ $and: ["$live", "$hasUnread"] }, 1, 0] } },
        groups: { $sum: { $cond: [{ $and: ["$live", { $eq: ["$type", "group"] }] }, 1, 0] } },
        direct: { $sum: { $cond: [{ $and: ["$live", { $eq: ["$type", "direct"] }] }, 1, 0] } },
        favourites: { $sum: { $cond: [{ $and: ["$live", { $eq: ["$participants.favourite", true] }] }, 1, 0] } },
        mentions: { $sum: { $cond: [{ $and: ["$live", { $gt: [{ $ifNull: ["$participants.mentionUnread", 0] }, 0] }] }, 1, 0] } },
        archived: { $sum: { $cond: ["$live", 0, 1] } },
      },
    },
  ]);
  return { all: 0, unread: 0, groups: 0, direct: 0, favourites: 0, mentions: 0, archived: 0, ...(r || {}), _id: undefined };
};

// ---------- drafts ----------

const setDraft = async (actor, conversationId, { text, replyTo } = {}) => {
  const conv = await chat.loadConversation(actor, conversationId);
  const body = String(text == null ? "" : text).replace(/\u0000/g, "");
  if (body.length > chat.MAX_TEXT) throw httpError(`Draft is too long (max ${chat.MAX_TEXT} characters).`);

  if (!body.trim()) {
    await Conversation.updateOne({ _id: conv._id, "participants.key": actor.key }, { $unset: { "participants.$.draft": "" } });
    emitToKeys([actor.key], "chat:draft", { conversationId: String(conv._id), draft: null });
    return null;
  }
  const draft = { text: body, updatedAt: new Date() };
  if (replyTo && mongoose.isValidObjectId(replyTo) && (await ChatMessage.exists({ _id: replyTo, conversation: conv._id }))) draft.replyTo = replyTo;
  await Conversation.updateOne({ _id: conv._id, "participants.key": actor.key }, { $set: { "participants.$.draft": draft } });
  const out = { text: draft.text, replyTo: draft.replyTo ? String(draft.replyTo) : null, updatedAt: draft.updatedAt };
  emitToKeys([actor.key], "chat:draft", { conversationId: String(conv._id), draft: out }); // my other devices pick it up too
  return out;
};

const getDraft = async (actor, conversationId) => {
  const conv = await chat.loadConversation(actor, conversationId);
  const d = conv.participants.find((p) => p.key === actor.key)?.draft;
  return d && d.text ? { text: d.text, replyTo: d.replyTo ? String(d.replyTo) : null, updatedAt: d.updatedAt } : null;
};

// ---------- disappearing messages ----------

const DISAPPEAR_LABEL = { 86400: "24 hours", 604800: "7 days", 7776000: "90 days" };

const setDisappearing = async (actor, conversationId, seconds) => {
  const secs = Number(seconds);
  if (!Conversation.DISAPPEARING_OPTIONS.includes(secs)) throw httpError("Choose Off, 24 hours, 7 days or 90 days.");
  const conv = await chat.loadConversation(actor, conversationId);
  if (conv.type === "meeting") throw httpError("Disappearing messages are not available in meeting chats.");
  if (conv.type === "group" && !chat.isAdminOf(conv, actor) && !(conv.settings && conv.settings.onlyAdminsCanEditInfo === false)) {
    throw httpError("Only group admins can change disappearing messages.", 403);
  }
  if (secs === (conv.disappearingSeconds || 0)) return secs;

  await Conversation.updateOne({ _id: conv._id }, { $set: { disappearingSeconds: secs } });
  const who = await nameOf(actor);
  await chat.postSystemMessage(
    conv,
    actor,
    { event: "disappearing", seconds: secs },
    secs ? `${who} turned on disappearing messages. New messages will disappear after ${DISAPPEAR_LABEL[secs]}.` : `${who} turned off disappearing messages.`
  );
  emitToKeys(conv.participantKeys, "chat:conversation:updated", { conversationId: String(conv._id), disappearingSeconds: secs });
  return secs;
};

// ---------- pinned messages (top of the chat) ----------

const PIN_DURATIONS = { "24h": 86400, "7d": 604800, "30d": 2592000 };

const getPinned = async (actor, conversationId) => {
  const conv = typeof conversationId === "object" && conversationId.participants ? conversationId : await chat.loadConversation(actor, conversationId);
  const now = Date.now();
  const live = (conv.pinnedMessages || []).filter((p) => !p.expiresAt || new Date(p.expiresAt).getTime() > now);
  if (!live.length) return [];
  const rows = await ChatMessage.find({
    _id: { $in: live.map((p) => p.message) },
    conversation: conv._id,
    deletedAt: null,
    deletedFor: { $ne: actor.key },
    ...chat.notExpired(),
  }).lean();
  const hydrated = new Map((await chat.hydrateMessages(actor.organisation_id, rows, actor.key)).map((m) => [m.id, m]));
  return live
    .filter((p) => hydrated.has(String(p.message)))
    .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt)) // newest pin first (that's the one shown in the bar)
    .map((p) => ({ message: hydrated.get(String(p.message)), pinnedByKey: p.pinnedByKey, pinnedAt: p.pinnedAt, expiresAt: p.expiresAt || null }));
};

// pinned=true pins (replacing the oldest when 3 are already pinned), pinned=false unpins.
const pinMessage = async (actor, messageId, { pinned = true, duration = "7d" } = {}) => {
  const { msg, conv } = await loadMessage(actor, messageId);
  if (conv.type === "group" && conv.settings && conv.settings.onlyAdminsCanPin && !chat.isAdminOf(conv, actor)) {
    throw httpError("Only group admins can pin messages.", 403);
  }
  const room = { conversationId: String(conv._id), messageId: String(msg._id) };

  if (!pinned) {
    await Conversation.updateOne({ _id: conv._id }, { $pull: { pinnedMessages: { message: msg._id } } });
    emitToKeys(conv.participantKeys, "chat:pinned:updated", { ...room, pinned: false });
    return { ...room, pinned: false };
  }

  const seconds = PIN_DURATIONS[duration];
  if (!seconds) throw httpError("Pin duration must be 24h, 7d or 30d.");
  const now = new Date();
  await Conversation.updateOne({ _id: conv._id }, { $pull: { pinnedMessages: { message: msg._id } } }); // re-pinning just renews it
  await Conversation.updateOne({ _id: conv._id }, { $pull: { pinnedMessages: { expiresAt: { $lte: now } } } }); // forget expired pins
  await Conversation.updateOne(
    { _id: conv._id },
    {
      $push: {
        pinnedMessages: {
          $each: [{ message: msg._id, pinnedByKey: actor.key, pinnedAt: now, expiresAt: new Date(now.getTime() + seconds * 1000) }],
          $slice: -Conversation.MAX_PINNED_MESSAGES,
        },
      },
    }
  );
  await chat.postSystemMessage(conv, actor, { event: "message_pinned", messageId: String(msg._id) }, `${await nameOf(actor)} pinned a message`);
  emitToKeys(conv.participantKeys, "chat:pinned:updated", { ...room, pinned: true });
  return { ...room, pinned: true };
};

// ---------- polls ----------

// Polls change often, so every person gets their own copy (their own ticks / "you voted" state).
const emitPollUpdate = async (conv, fresh, organisation_id) => {
  const raw = typeof fresh.toObject === "function" ? fresh.toObject() : fresh;
  const [hydrated] = await chat.hydrateMessages(organisation_id, [raw]);
  for (const key of conv.participantKeys) {
    emitToKeys([key], "chat:message:updated", {
      conversationId: String(conv._id),
      message: { ...hydrated, poll: chat.shapePoll(raw, key) },
    });
  }
  return raw;
};

const createPoll = async (actor, conversationId, { question, options, multiple = false, anonymous = false } = {}) => {
  const { message } = await chat.sendMessage(actor, conversationId, { poll: { question, options, multiple, anonymous } });
  return message;
};

// optionIds: [] withdraws my vote. Single-choice polls take exactly one option.
const votePoll = async (actor, messageId, optionIds) => {
  const { msg, conv } = await loadMessage(actor, messageId, ["poll"]);
  if (!msg.poll || msg.poll.closedAt) throw httpError("This poll is closed.");
  const ids = [...new Set((Array.isArray(optionIds) ? optionIds : optionIds ? [optionIds] : []).map(String))];
  const valid = new Set(msg.poll.options.map((o) => o.id));
  if (ids.some((id) => !valid.has(id))) throw httpError("That option does not exist.");
  if (!msg.poll.multiple && ids.length > 1) throw httpError("Choose only one option.");

  const open = { _id: msg._id, "poll.closedAt": null };
  await ChatMessage.updateOne(open, { $pull: { "poll.options.$[].votes": actor.key } }); // clear my previous choice(s)
  if (ids.length) {
    const r = await ChatMessage.updateOne(open, { $addToSet: { "poll.options.$[o].votes": actor.key } }, { arrayFilters: [{ "o.id": { $in: ids } }] });
    if (!r.matchedCount) throw httpError("This poll is closed.");
  }
  const fresh = await ChatMessage.findById(msg._id);
  const raw = await emitPollUpdate(conv, fresh, actor.organisation_id);
  return chat.shapePoll(raw, actor.key);
};

const closePoll = async (actor, messageId) => {
  const { msg, conv } = await loadMessage(actor, messageId, ["poll"]);
  if (msg.senderKey !== actor.key && !chat.isAdminOf(conv, actor)) throw httpError("Only the person who created the poll or a group admin can close it.", 403);
  if (msg.poll.closedAt) return chat.shapePoll(msg.toObject(), actor.key);
  await ChatMessage.updateOne({ _id: msg._id, "poll.closedAt": null }, { $set: { "poll.closedAt": new Date(), "poll.closedByKey": actor.key } });
  const fresh = await ChatMessage.findById(msg._id);
  const raw = await emitPollUpdate(conv, fresh, actor.organisation_id);
  return chat.shapePoll(raw, actor.key);
};

// "Who voted for what" with names (not for anonymous polls).
const pollDetails = async (actor, messageId) => {
  const { msg } = await loadMessage(actor, messageId, ["poll"]);
  const poll = chat.shapePoll(msg.toObject(), actor.key);
  if (poll.anonymous) return { ...poll, options: poll.options.map((o) => ({ ...o, voters: undefined })) };
  const keys = new Set();
  for (const o of poll.options) for (const k of o.voters || []) keys.add(k);
  const people = await resolvePeople(actor.organisation_id, [...keys].map((k) => ({ model: k.split(":")[0], id: k.split(":").slice(1).join(":") })));
  const mini = (k) => ({ key: k, name: people.get(k)?.name || "Former member", photo: people.get(k)?.photo || "" });
  return { ...poll, options: poll.options.map((o) => ({ ...o, voters: (o.voters || []).map(mini) })) };
};

// ---------- Media / Docs / Links tabs (chat info) ----------

const TABS = {
  media: { re: /^(image|video)\//, mongo: { $elemMatch: { mime: /^(image|video)\// } } },
  audio: { re: /^audio\//, mongo: { $elemMatch: { mime: /^audio\// } } },
  docs: { re: /^(?!(image|video|audio)\/)/, mongo: { $elemMatch: { mime: { $not: /^(image|video|audio)\// } } } },
};

const mediaSummary = async (actor, conversationId) => {
  const conv = await chat.loadConversation(actor, conversationId);
  const base = visibleQuery(conv, actor);
  const kind = (re) => ({ $regexMatch: { input: { $ifNull: ["$attachments.mime", ""] }, regex: re } });
  const [r] = await ChatMessage.aggregate([
    { $match: { ...base, $or: [{ "attachments.0": { $exists: true } }, { "links.0": { $exists: true } }] } },
    {
      $facet: {
        files: [
          { $unwind: "$attachments" },
          { $group: { _id: { $cond: [kind("^(image|video)/"), "media", { $cond: [kind("^audio/"), "audio", "docs"] }] }, count: { $sum: 1 } } },
        ],
        links: [{ $group: { _id: null, count: { $sum: { $size: { $ifNull: ["$links", []] } } } } }],
      },
    },
  ]);
  const out = { media: 0, docs: 0, audio: 0, links: r && r.links[0] ? r.links[0].count : 0 };
  for (const f of (r && r.files) || []) out[f._id] = f.count;
  return out;
};

// tab: media | docs | audio | links.  Paged by message: pass back `nextCursor` as `before`.
const listMedia = async (actor, conversationId, { tab = "media", before = null, limit = 30 } = {}) => {
  const conv = await chat.loadConversation(actor, conversationId);
  const lim = clampLimit(limit, 30, 50);
  const q = visibleQuery(conv, actor);
  if (before) { chat.assertObjectId(before, "cursor"); q._id = { $lt: before }; }

  if (tab === "links") q["links.0"] = { $exists: true };
  else if (TABS[tab]) q.attachments = TABS[tab].mongo;
  else throw httpError("tab must be media, docs, audio or links.");

  const rows = await ChatMessage.find(q).sort({ _id: -1 }).limit(lim + 1).lean();
  const hasMore = rows.length > lim;
  const page = rows.slice(0, lim);
  const hydrated = await chat.hydrateMessages(actor.organisation_id, page, actor.key);

  const items = [];
  hydrated.forEach((m, i) => {
    const raw = page[i];
    const base = { messageId: m.id, createdAt: m.createdAt, sender: m.sender, caption: m.text, expiresAt: m.expiresAt };
    if (tab === "links") {
      for (const url of raw.links || []) items.push({ ...base, url, preview: m.linkPreviews.find((p) => p.url === url) || null });
    } else {
      for (const a of raw.attachments || []) if (TABS[tab].re.test(a.mime || "")) items.push({ ...base, attachment: { url: a.url, name: a.name, mime: a.mime, size: a.size } });
    }
  });
  return { items, hasMore, nextCursor: hasMore ? String(page[page.length - 1]._id) : null };
};

// ---------- @mentions ----------

// Members to suggest while typing "@ra" (groups & meeting chats). "all" notifies everyone.
const mentionable = async (actor, conversationId, q = "") => {
  const conv = await chat.loadConversation(actor, conversationId);
  if (conv.type === "direct") return [];
  const term = String(q || "").trim().toLowerCase();
  const people = await resolvePeople(actor.organisation_id, conv.participants.map((p) => ({ model: p.memberModel, id: p.member })));
  const list = [...people.values()]
    .filter((p) => p.key !== actor.key && (!term || p.name.toLowerCase().includes(term) || (p.uid || "").toLowerCase().includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20)
    .map((p) => ({ key: p.key, name: p.name, photo: p.photo, designation: p.designation, role: p.role }));
  if (conv.participantKeys.length > 2 && (!term || "all".startsWith(term) || "everyone".startsWith(term))) {
    list.unshift({ key: "all", name: "all", special: true, label: "Notify everyone in this chat" });
  }
  return list;
};

// Messages in this chat that tagged me (the "@" button jumps through them).
const listMyMentions = async (actor, conversationId, { before = null, limit = 20 } = {}) => {
  const conv = await chat.loadConversation(actor, conversationId);
  const lim = clampLimit(limit, 20, 50);
  const q = { ...visibleQuery(conv, actor), senderKey: { $ne: actor.key }, $or: [{ "mentions.key": actor.key }, { mentionsAll: true }] };
  if (before) { chat.assertObjectId(before, "cursor"); q._id = { $lt: before }; }
  const rows = await ChatMessage.find(q).sort({ _id: -1 }).limit(lim + 1).lean();
  const hasMore = rows.length > lim;
  const page = rows.slice(0, lim);
  return { messages: await chat.hydrateMessages(actor.organisation_id, page, actor.key), hasMore, nextCursor: hasMore ? String(page[page.length - 1]._id) : null };
};

module.exports = {
  loadMessage,
  visibleQuery,
  setFavourite,
  listCounts,
  setDraft,
  getDraft,
  setDisappearing,
  getPinned,
  pinMessage,
  createPoll,
  votePoll,
  closePoll,
  pollDetails,
  mediaSummary,
  listMedia,
  mentionable,
  listMyMentions,
};
