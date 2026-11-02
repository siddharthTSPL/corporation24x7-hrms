const mongoose = require("mongoose");
const Conversation = require("../Models/conversation.model");
const ChatMessage = require("../Models/chatmessage.model");
const chat = require("../utils/chat/chat.service");
const { httpError, resolvePeople } = require("../utils/chat/people.utils");

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });

const MAX_BATCH = 100;
const COUNTED_TYPES = ["text", "file", "sticker"];

const recipientsOf = (conv, msg) =>
  conv.participants.filter((p) => p.key !== msg.senderKey && new Date(p.joinedAt).getTime() <= new Date(msg.createdAt).getTime() + 1000);

const hasSeen = (p, msg) => !!p.lastReadAt && new Date(p.lastReadAt).getTime() >= new Date(msg.createdAt).getTime();

const counts = (conv, msg) => {
  const recipients = recipientsOf(conv, msg);
  const delivered = new Set(msg.deliveredTo || []);
  const seen = recipients.filter((p) => hasSeen(p, msg));
  return {
    totalRecipients: recipients.length,
    seenCount: seen.length,
    deliveredCount: recipients.filter((p) => hasSeen(p, msg) || delivered.has(p.key)).length,
  };
};

const loadConversationFor = async (actor, conversationId) => {
  if (!mongoose.isValidObjectId(conversationId)) throw httpError("Conversation not found.", 404);
  const conv = await Conversation.findOne({ _id: conversationId, organisation_id: actor.organisation_id, participantKeys: actor.key }).lean();
  if (!conv) throw httpError("Conversation not found.", 404);
  return conv;
};

const messageReceipts = async (req, res) => {
  const actor = actorOf(req);
  if (!mongoose.isValidObjectId(req.params.messageId)) throw httpError("Message not found.", 404);
  const msg = await ChatMessage.findOne({ _id: req.params.messageId, organisation_id: actor.organisation_id, deletedAt: null }).lean();
  if (!msg || !COUNTED_TYPES.includes(msg.type)) throw httpError("Message not found.", 404);
  const conv = await loadConversationFor(actor, msg.conversation);

  const me = conv.participants.find((p) => p.key === actor.key);
  const canSeeNames = msg.senderKey === actor.key || (conv.type === "group" && me && me.role === "admin");
  const base = { messageId: String(msg._id), conversationId: String(conv._id), type: conv.type, sentAt: msg.createdAt, ...counts(conv, msg) };
  if (!canSeeNames) return ok(res, { ...base, canSeeNames: false });

  const recipients = recipientsOf(conv, msg);
  const people = await resolvePeople(actor.organisation_id, recipients.map((p) => ({ model: p.memberModel, id: p.member })));
  const delivered = new Set(msg.deliveredTo || []);
  const mini = (p) => {
    const person = people.get(p.key);
    return { key: p.key, name: person ? person.name : "Former member", photo: person ? person.photo : "", designation: person ? person.designation : "" };
  };

  const seenBy = recipients.filter((p) => hasSeen(p, msg)).map((p) => ({ ...mini(p), lastReadAt: p.lastReadAt })).sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt));
  const deliveredOnly = recipients.filter((p) => !hasSeen(p, msg) && delivered.has(p.key)).map(mini);
  const pending = recipients.filter((p) => !hasSeen(p, msg) && !delivered.has(p.key)).map(mini);
  ok(res, { ...base, canSeeNames: true, seenBy, deliveredOnly, pending });
};

const conversationReceipts = async (req, res) => {
  const actor = actorOf(req);
  const conv = await loadConversationFor(actor, req.params.id);
  const ids = [...new Set((Array.isArray(req.body?.messageIds) ? req.body.messageIds : []).map(String))].filter((id) => mongoose.isValidObjectId(id)).slice(0, MAX_BATCH);
  if (!ids.length) return ok(res, { receipts: {} });

  const msgs = await ChatMessage.find({ _id: { $in: ids }, conversation: conv._id, deletedAt: null, type: { $in: COUNTED_TYPES } }).select("senderKey createdAt deliveredTo").lean();
  const receipts = {};
  for (const msg of msgs) receipts[String(msg._id)] = counts(conv, msg);
  ok(res, { receipts, conversationId: String(conv._id) });
};

module.exports = { messageReceipts, conversationReceipts };
