const mongoose = require("mongoose");
const Conversation = require("../../Models/conversation.model");
const ChatMessage = require("../../Models/chatmessage.model");
const imagekit = require("../imagekit.utils");
const { emitToRecipient } = require("../../config/socket");
const presence = require("./presence");
const { httpError, personKey, parseKey, resolvePeople, requirePeople } = require("./people.utils");

const MAX_TEXT = 5000;

// ---------- actor + emit helpers ----------

// Accepts req.actor ({id, recipientModel, organisation_id}) or socket.data
// ({id, recipientModel, organisation_id}) and returns one shape.
const toActor = (a) => ({
  id: String(a.id),
  model: a.recipientModel,
  key: personKey(a.recipientModel, a.id),
  organisation_id: String(a.organisation_id),
});

const emitToKeys = (keys, event, payload) => {
  for (const key of new Set(keys)) {
    const { model, id } = parseKey(key);
    emitToRecipient(model, id, event, payload);
  }
};

const fallbackPerson = (key) => {
  const { model, id } = parseKey(key);
  return { key, id, model, name: "Former member", uid: "", designation: "", department: "", email: "", photo: "", role: "" };
};

// ---------- loading + authorisation ----------

const assertObjectId = (id, label = "id") => {
  if (!mongoose.isValidObjectId(id)) throw httpError(`Invalid ${label}.`, 400);
};

// Loads a conversation the actor belongs to. Same 404 for "doesn't exist",
// "other organisation" and "you're not in it", so ids can't be probed.
const loadConversation = async (actor, conversationId) => {
  assertObjectId(conversationId, "conversation id");
  const conv = await Conversation.findOne({
    _id: conversationId,
    organisation_id: actor.organisation_id,
    participantKeys: actor.key,
  });
  if (!conv) throw httpError("Conversation not found.", 404);
  return conv;
};

const requireGroupAdmin = (conv, actor) => {
  if (conv.type !== "group") throw httpError("Only group chats can be managed.", 400);
  const me = conv.participants.find((p) => p.key === actor.key);
  if (!me || me.role !== "admin") throw httpError("Only group admins can do this.", 403);
};

// ---------- serialisation ----------

const serializeConversation = (conv, actor, people) => {
  const o = typeof conv.toObject === "function" ? conv.toObject() : conv;
  const parts = o.participants.map((p) => ({
    ...(people.get(p.key) || fallbackPerson(p.key)),
    role: p.role,
    joinedAt: p.joinedAt,
    lastReadAt: p.lastReadAt,
    online: presence.isOnline(p.key),
  }));
  const me = o.participants.find((p) => p.key === actor.key);

  let name = o.name;
  let photo = o.photo;
  let otherPerson = null;
  if (o.type === "direct") {
    otherPerson = parts.find((p) => p.key !== actor.key) || parts[0];
    name = otherPerson.name;
    photo = otherPerson.photo;
  }

  return {
    id: String(o._id),
    type: o.type,
    name,
    description: o.description || "",
    photo: photo || "",
    meetingId: o.meeting ? String(o.meeting) : null,
    participants: parts,
    otherPerson,
    myRole: me ? me.role : null,
    unread: me ? me.unread : 0,
    muted: me ? !!me.muted : false,
    lastMessage: o.lastMessage && o.lastMessage.at
      ? {
          id: o.lastMessage.message ? String(o.lastMessage.message) : null,
          text: o.lastMessage.text,
          type: o.lastMessage.type,
          senderKey: o.lastMessage.senderKey,
          senderName: o.lastMessage.senderName,
          at: o.lastMessage.at,
        }
      : null,
    lastMessageAt: o.lastMessageAt,
    createdAt: o.createdAt,
  };
};

const loadPeopleForConversations = async (organisation_id, convs) => {
  const refs = [];
  for (const c of convs) for (const p of c.participants) refs.push({ model: p.memberModel, id: p.member });
  return resolvePeople(organisation_id, refs);
};

const serializeOneConversation = async (conv, actor) => {
  const people = await loadPeopleForConversations(actor.organisation_id, [conv]);
  return serializeConversation(conv, actor, people);
};

const snippet = (m) => {
  if (m.deletedAt) return "";
  if (m.type === "file" && !m.text) return m.attachments?.length > 1 ? `${m.attachments.length} attachments` : m.attachments?.[0]?.name || "Attachment";
  return String(m.text || "").slice(0, 140);
};

// Adds sender info + reply previews to a batch of messages (lean or docs).
const hydrateMessages = async (organisation_id, messages) => {
  const list = messages.map((m) => (typeof m.toObject === "function" ? m.toObject() : m));

  const senderRefs = [];
  for (const m of list) if (m.sender) senderRefs.push({ model: m.senderModel, id: m.sender });
  const replyIds = [...new Set(list.map((m) => m.replyTo && String(m.replyTo)).filter(Boolean))];
  const replied = replyIds.length
    ? await ChatMessage.find({ _id: { $in: replyIds }, organisation_id }).select("sender senderModel senderKey text type attachments deletedAt").lean()
    : [];
  for (const r of replied) if (r.sender) senderRefs.push({ model: r.senderModel, id: r.sender });

  const people = await resolvePeople(organisation_id, senderRefs);
  const repliedById = new Map(replied.map((r) => [String(r._id), r]));
  const mini = (key) => {
    if (!key) return null;
    const p = people.get(key) || fallbackPerson(key);
    return { key: p.key, id: p.id, model: p.model, name: p.name, photo: p.photo };
  };

  return list.map((m) => {
    const r = m.replyTo ? repliedById.get(String(m.replyTo)) : null;
    return {
      id: String(m._id),
      conversationId: String(m.conversation),
      type: m.type,
      sender: m.senderKey ? mini(m.senderKey) : null,
      senderKey: m.senderKey || "",
      text: m.deletedAt ? "" : m.text,
      attachments: m.deletedAt ? [] : m.attachments || [],
      replyTo: m.replyTo
        ? r
          ? { id: String(r._id), senderKey: r.senderKey, senderName: mini(r.senderKey)?.name || "", text: snippet(r), deleted: !!r.deletedAt }
          : { id: String(m.replyTo), senderKey: "", senderName: "", text: "", deleted: true }
        : null,
      meta: m.meta || {},
      clientId: m.clientId || null,
      editedAt: m.editedAt || null,
      deleted: !!m.deletedAt,
      createdAt: m.createdAt,
    };
  });
};

// ---------- conversations ----------

const directKeyOf = (a, b) => [a, b].sort().join("|");

const participantDoc = (person, role = "member") => ({
  key: person.key,
  member: person.id,
  memberModel: person.model,
  role,
});

const getOrCreateDirect = async (actor, otherRef) => {
  const other = [...(await requirePeople(actor.organisation_id, [otherRef])).values()][0];
  if (other.key === actor.key) throw httpError("You cannot start a chat with yourself.");

  const directKey = directKeyOf(actor.key, other.key);
  const me = [...(await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }])).values()][0];

  // upsert + unique index => two people starting a chat at the same moment get the same thread
  const conv = await Conversation.findOneAndUpdate(
    { organisation_id: actor.organisation_id, directKey },
    {
      $setOnInsert: {
        type: "direct",
        participants: [participantDoc(me), participantDoc(other)],
        participantKeys: [me.key, other.key],
        createdBy: actor.id,
        createdByModel: actor.model,
        lastMessageAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return conv;
};

const createGroup = async (actor, { name, description = "", members = [], photo = "" }) => {
  const title = String(name || "").trim();
  if (!title) throw httpError("Group name is required.");
  if (title.length > 80) throw httpError("Group name is too long (max 80 characters).");

  const people = await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }, ...members]);
  if (people.size < 2) throw httpError("Add at least one other person to the group.");
  if (people.size > Conversation.MAX_GROUP_MEMBERS) throw httpError(`A group can have at most ${Conversation.MAX_GROUP_MEMBERS} members.`);

  const participants = [...people.values()].map((p) => participantDoc(p, p.key === actor.key ? "admin" : "member"));
  const conv = await Conversation.create({
    organisation_id: actor.organisation_id,
    type: "group",
    name: title,
    description: String(description || "").trim().slice(0, 300),
    photo: photo || "",
    participants,
    participantKeys: participants.map((p) => p.key),
    createdBy: actor.id,
    createdByModel: actor.model,
  });

  await postSystemMessage(conv, actor, { event: "group_created" }, `${people.get(actor.key).name} created the group "${title}"`);
  return conv;
};

// ---------- messages ----------

const sanitizeText = (text) => String(text == null ? "" : text).replace(/\u0000/g, "").trim();

const sendMessage = async (actor, conversationId, { text, attachments = [], replyTo = null, clientId = null } = {}) => {
  const conv = await loadConversation(actor, conversationId);
  const body = sanitizeText(text);
  if (body.length > MAX_TEXT) throw httpError(`Message is too long (max ${MAX_TEXT} characters).`);
  if (!body && !attachments.length) throw httpError("Message cannot be empty.");

  if (replyTo) {
    assertObjectId(replyTo, "reply id");
    const ok = await ChatMessage.exists({ _id: replyTo, conversation: conv._id });
    if (!ok) throw httpError("The message you are replying to was not found.", 404);
  }

  let msg;
  try {
    msg = await ChatMessage.create({
      organisation_id: actor.organisation_id,
      conversation: conv._id,
      type: attachments.length ? "file" : "text",
      sender: actor.id,
      senderModel: actor.model,
      senderKey: actor.key,
      text: body,
      attachments,
      replyTo: replyTo || undefined,
      clientId: clientId ? String(clientId).slice(0, 64) : undefined,
    });
  } catch (err) {
    // same clientId sent twice (retry after a flaky connection) => hand back the first one
    if (err && err.code === 11000 && clientId) {
      const existing = await ChatMessage.findOne({ conversation: conv._id, clientId: String(clientId).slice(0, 64) });
      if (existing) return { message: (await hydrateMessages(actor.organisation_id, [existing]))[0], conversation: conv, duplicate: true };
    }
    throw err;
  }

  const [hydrated] = await hydrateMessages(actor.organisation_id, [msg]);
  await bumpConversation(conv, msg, hydrated.sender?.name || "", actor.key);
  emitToKeys(conv.participantKeys, "chat:message", { conversationId: String(conv._id), message: hydrated });
  return { message: hydrated, conversation: conv, duplicate: false };
};

// Updates last-message preview + unread counters for everyone except the sender.
const bumpConversation = async (conv, msg, senderName, senderKey) => {
  await Conversation.updateOne(
    { _id: conv._id },
    {
      $set: {
        lastMessage: { message: msg._id, text: snippet(msg), type: msg.type, senderKey, senderName, at: msg.createdAt },
        lastMessageAt: msg.createdAt,
      },
      $inc: { "participants.$[p].unread": 1 },
    },
    { arrayFilters: [{ "p.key": { $ne: senderKey } }] }
  );
};

// System / call-summary lines inside a chat ("Ravi added Priya", "Missed video call").
const postSystemMessage = async (conv, actor, meta, text, { type = "system" } = {}) => {
  const msg = await ChatMessage.create({
    organisation_id: conv.organisation_id,
    conversation: conv._id,
    type,
    sender: actor ? actor.id : undefined,
    senderModel: actor ? actor.model : undefined,
    senderKey: actor ? actor.key : "",
    text,
    meta,
  });
  const [hydrated] = await hydrateMessages(conv.organisation_id, [msg]);
  // system lines don't count as unread
  await Conversation.updateOne(
    { _id: conv._id },
    { $set: { lastMessage: { message: msg._id, text: snippet(msg), type, senderKey: "", senderName: "", at: msg.createdAt }, lastMessageAt: msg.createdAt } }
  );
  const fresh = await Conversation.findById(conv._id).select("participantKeys").lean();
  emitToKeys(fresh ? fresh.participantKeys : conv.participantKeys, "chat:message", { conversationId: String(conv._id), message: hydrated });
  return hydrated;
};

const getMessages = async (actor, conversationId, { before = null, limit = 40 } = {}) => {
  const conv = await loadConversation(actor, conversationId);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);
  const q = { conversation: conv._id };
  if (before) {
    assertObjectId(before, "cursor");
    q._id = { $lt: before };
  }
  const rows = await ChatMessage.find(q).sort({ _id: -1 }).limit(lim + 1).lean();
  const hasMore = rows.length > lim;
  const page = rows.slice(0, lim).reverse(); // oldest -> newest for rendering
  return {
    conv,
    messages: await hydrateMessages(actor.organisation_id, page),
    hasMore,
    nextCursor: hasMore ? String(rows[lim - 1]._id) : null,
  };
};

const markRead = async (actor, conversationId) => {
  const conv = await loadConversation(actor, conversationId);
  const at = new Date();
  await Conversation.updateOne(
    { _id: conv._id, "participants.key": actor.key },
    { $set: { "participants.$.lastReadAt": at, "participants.$.unread": 0 } }
  );
  // other people see "seen" ticks; my own other tabs clear their badge
  emitToKeys(conv.participantKeys, "chat:read", { conversationId: String(conv._id), by: actor.key, at });
  return at;
};

const editMessage = async (actor, messageId, text) => {
  assertObjectId(messageId, "message id");
  const msg = await ChatMessage.findOne({ _id: messageId, organisation_id: actor.organisation_id });
  if (!msg || msg.deletedAt || msg.type === "system" || msg.type === "call") throw httpError("Message not found.", 404);
  if (msg.senderKey !== actor.key) throw httpError("You can only edit your own messages.", 403);
  const body = sanitizeText(text);
  if (!body) throw httpError("Message cannot be empty.");
  if (body.length > MAX_TEXT) throw httpError(`Message is too long (max ${MAX_TEXT} characters).`);

  const conv = await loadConversation(actor, msg.conversation);
  msg.text = body;
  msg.editedAt = new Date();
  await msg.save();

  const [hydrated] = await hydrateMessages(actor.organisation_id, [msg]);
  if (conv.lastMessage?.message && String(conv.lastMessage.message) === String(msg._id)) {
    await Conversation.updateOne({ _id: conv._id }, { $set: { "lastMessage.text": snippet(msg) } });
  }
  emitToKeys(conv.participantKeys, "chat:message:updated", { conversationId: String(conv._id), message: hydrated });
  return hydrated;
};

const deleteMessage = async (actor, messageId) => {
  assertObjectId(messageId, "message id");
  const msg = await ChatMessage.findOne({ _id: messageId, organisation_id: actor.organisation_id });
  if (!msg || msg.deletedAt || msg.type === "system" || msg.type === "call") throw httpError("Message not found.", 404);
  const conv = await loadConversation(actor, msg.conversation);

  const me = conv.participants.find((p) => p.key === actor.key);
  const isGroupAdmin = conv.type === "group" && me && me.role === "admin";
  if (msg.senderKey !== actor.key && !isGroupAdmin) throw httpError("You can only delete your own messages.", 403);

  const files = msg.attachments || [];
  msg.deletedAt = new Date();
  msg.text = "";
  msg.attachments = [];
  await msg.save();

  // best effort - never fail the delete because storage cleanup failed
  for (const f of files) if (f.fileId) imagekit.deleteFile(f.fileId).catch(() => {});

  if (conv.lastMessage?.message && String(conv.lastMessage.message) === String(msg._id)) {
    await Conversation.updateOne({ _id: conv._id }, { $set: { "lastMessage.text": "", "lastMessage.type": "text" } });
  }
  emitToKeys(conv.participantKeys, "chat:message:deleted", { conversationId: String(conv._id), messageId: String(msg._id) });
  return { conversationId: String(conv._id), messageId: String(msg._id) };
};

// ---------- group / membership management ----------

const ensureAnAdmin = (conv) => {
  if (conv.type !== "group" || !conv.participants.length) return;
  if (!conv.participants.some((p) => p.role === "admin")) {
    const oldest = [...conv.participants].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    oldest.role = "admin";
  }
};

const syncKeys = (conv) => {
  conv.participantKeys = conv.participants.map((p) => p.key);
};

const nameOf = (people, key) => people.get(key)?.name || "Someone";

const updateGroup = async (actor, conversationId, { name, description, photo }) => {
  const conv = await loadConversation(actor, conversationId);
  requireGroupAdmin(conv, actor);
  const changes = [];
  if (name !== undefined) {
    const t = String(name).trim();
    if (!t) throw httpError("Group name cannot be empty.");
    if (t.length > 80) throw httpError("Group name is too long (max 80 characters).");
    if (t !== conv.name) { conv.name = t; changes.push("name"); }
  }
  if (description !== undefined) conv.description = String(description).trim().slice(0, 300);
  if (photo !== undefined) conv.photo = String(photo || "");
  await conv.save();
  if (changes.includes("name")) {
    const people = await resolvePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }]);
    await postSystemMessage(conv, actor, { event: "renamed" }, `${nameOf(people, actor.key)} renamed the group to "${conv.name}"`);
  }
  emitToKeys(conv.participantKeys, "chat:conversation:updated", { conversationId: String(conv._id) });
  return conv;
};

const addMembers = async (actor, conversationId, members) => {
  const conv = await loadConversation(actor, conversationId);
  requireGroupAdmin(conv, actor);
  const toAdd = await requirePeople(actor.organisation_id, members);
  const existing = new Set(conv.participantKeys);
  const fresh = [...toAdd.values()].filter((p) => !existing.has(p.key));
  if (!fresh.length) throw httpError("Those people are already in the group.");
  if (conv.participants.length + fresh.length > Conversation.MAX_GROUP_MEMBERS) {
    throw httpError(`A group can have at most ${Conversation.MAX_GROUP_MEMBERS} members.`);
  }

  for (const p of fresh) conv.participants.push(participantDoc(p));
  syncKeys(conv);
  await conv.save();

  const people = await resolvePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }]);
  await postSystemMessage(conv, actor, { event: "members_added", targets: fresh.map((p) => p.key) }, `${nameOf(people, actor.key)} added ${fresh.map((p) => p.name).join(", ")}`);
  // newcomers need the thread to appear in their list; existing members refresh theirs
  emitToKeys(conv.participantKeys, "chat:conversation:updated", { conversationId: String(conv._id) });
  return conv;
};

const removeMember = async (actor, conversationId, targetKey) => {
  const conv = await loadConversation(actor, conversationId);
  requireGroupAdmin(conv, actor);
  if (targetKey === actor.key) throw httpError("Use 'leave group' to remove yourself.");
  const target = conv.participants.find((p) => p.key === targetKey);
  if (!target) throw httpError("That person is not in this group.", 404);

  const people = await resolvePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }, { model: target.memberModel, id: target.member }]);
  conv.participants = conv.participants.filter((p) => p.key !== targetKey);
  ensureAnAdmin(conv);
  const before = [...conv.participantKeys];
  syncKeys(conv);
  await conv.save();

  await postSystemMessage(conv, actor, { event: "member_removed", targets: [targetKey] }, `${nameOf(people, actor.key)} removed ${nameOf(people, targetKey)}`);
  emitToKeys(before, "chat:conversation:updated", { conversationId: String(conv._id), removed: [targetKey] });
  return conv;
};

const leaveGroup = async (actor, conversationId) => {
  const conv = await loadConversation(actor, conversationId);
  if (conv.type !== "group") throw httpError("You can only leave group chats.");
  const before = [...conv.participantKeys];
  const people = await resolvePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }]);

  conv.participants = conv.participants.filter((p) => p.key !== actor.key);
  ensureAnAdmin(conv);
  syncKeys(conv);
  await conv.save();

  if (conv.participants.length) {
    await postSystemMessage(conv, null, { event: "member_left", targets: [actor.key] }, `${nameOf(people, actor.key)} left`);
  }
  emitToKeys(before, "chat:conversation:updated", { conversationId: String(conv._id), removed: [actor.key] });
  return conv;
};

const setMemberRole = async (actor, conversationId, targetKey, role) => {
  if (!["admin", "member"].includes(role)) throw httpError("Role must be 'admin' or 'member'.");
  const conv = await loadConversation(actor, conversationId);
  requireGroupAdmin(conv, actor);
  const target = conv.participants.find((p) => p.key === targetKey);
  if (!target) throw httpError("That person is not in this group.", 404);
  target.role = role;
  ensureAnAdmin(conv);
  await conv.save();
  emitToKeys(conv.participantKeys, "chat:conversation:updated", { conversationId: String(conv._id) });
  return conv;
};

const setMuted = async (actor, conversationId, muted) => {
  const conv = await loadConversation(actor, conversationId);
  await Conversation.updateOne({ _id: conv._id, "participants.key": actor.key }, { $set: { "participants.$.muted": !!muted } });
  emitToKeys([actor.key], "chat:conversation:updated", { conversationId: String(conv._id) });
};

// Keeps a meeting's chat in step with its attendee list.
const syncMeetingConversation = async (conversationId, organisation_id, attendeeRefs, hostKey) => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) return null;
  const want = new Map(attendeeRefs.map((r) => [personKey(r.model, r.id), r]));
  const have = new Set(conv.participantKeys);
  const before = [...conv.participantKeys];

  conv.participants = conv.participants.filter((p) => want.has(p.key));
  for (const [key, r] of want) if (!have.has(key)) conv.participants.push({ key, member: r.id, memberModel: r.model, role: key === hostKey ? "admin" : "member" });
  syncKeys(conv);
  await conv.save();
  emitToKeys([...new Set([...before, ...conv.participantKeys])], "chat:conversation:updated", { conversationId: String(conv._id) });
  return conv;
};

const totalUnread = async (actor) => {
  const rows = await Conversation.aggregate([
    { $match: { organisation_id: new mongoose.Types.ObjectId(actor.organisation_id), participantKeys: actor.key } },
    { $unwind: "$participants" },
    { $match: { "participants.key": actor.key, "participants.muted": { $ne: true } } },
    { $group: { _id: null, total: { $sum: "$participants.unread" }, chats: { $sum: { $cond: [{ $gt: ["$participants.unread", 0] }, 1, 0] } } } },
  ]);
  return { unread: rows[0]?.total || 0, unreadChats: rows[0]?.chats || 0 };
};

module.exports = {
  MAX_TEXT,
  toActor,
  emitToKeys,
  loadConversation,
  serializeConversation,
  serializeOneConversation,
  loadPeopleForConversations,
  hydrateMessages,
  getOrCreateDirect,
  createGroup,
  sendMessage,
  postSystemMessage,
  getMessages,
  markRead,
  editMessage,
  deleteMessage,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  setMemberRole,
  setMuted,
  syncMeetingConversation,
  totalUnread,
  assertObjectId,
};
