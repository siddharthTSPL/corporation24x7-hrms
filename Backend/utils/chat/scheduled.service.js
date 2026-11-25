// "Schedule message": write now, deliver later, as the same person.
// The background job (automatic/Chatjobs.js) calls processDue() every 30 seconds.
const mongoose = require("mongoose");
const Conversation = require("../../Models/conversation.model");
const ChatScheduled = require("../../Models/chatscheduled.model");
const chat = require("./chat.service");
const { httpError, parseKey } = require("./people.utils");

const MIN_LEAD_MS = 20 * 1000; // must be at least 20 s in the future
const MAX_LEAD_MS = 365 * 24 * 3600 * 1000;
const MAX_PENDING = 50;
const MAX_ATTEMPTS = 3;
const STALE_MS = 2 * 60 * 1000; // a "sending" row older than this belongs to a crashed run

const parseSendAt = (value) => {
  const d = new Date(value);
  if (!value || isNaN(d)) throw httpError("Choose a valid date and time.");
  const lead = d.getTime() - Date.now();
  if (lead < MIN_LEAD_MS) throw httpError("Pick a time in the future.");
  if (lead > MAX_LEAD_MS) throw httpError("You can schedule at most one year ahead.");
  return d;
};

const cleanText = (text) => {
  const t = String(text == null ? "" : text).replace(/\u0000/g, "").trim();
  if (!t) throw httpError("Message cannot be empty.");
  if (t.length > chat.MAX_TEXT) throw httpError(`Message is too long (max ${chat.MAX_TEXT} characters).`);
  return t;
};

const shape = (row, convName) => ({
  id: String(row._id),
  conversationId: String(row.conversation),
  conversationName: convName || undefined,
  text: row.text,
  replyTo: row.replyTo ? String(row.replyTo) : null,
  mentions: row.mentions || [],
  sendAt: row.sendAt,
  status: row.status,
  error: row.error || "",
  createdAt: row.createdAt,
});

const ownRow = async (actor, id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError("Scheduled message not found.", 404);
  const row = await ChatScheduled.findOne({ _id: id, organisation_id: actor.organisation_id, senderKey: actor.key });
  if (!row) throw httpError("Scheduled message not found.", 404);
  return row;
};

const schedule = async (actor, conversationId, { text, sendAt, replyTo = null, mentions = [] } = {}) => {
  const conv = await chat.loadConversation(actor, conversationId);
  chat.assertCanPost(conv, actor); // fail now, not at 3 AM
  const body = cleanText(text);
  const when = parseSendAt(sendAt);
  if ((await ChatScheduled.countDocuments({ senderKey: actor.key, status: "pending" })) >= MAX_PENDING) {
    throw httpError(`You can have at most ${MAX_PENDING} scheduled messages.`);
  }
  const row = await ChatScheduled.create({
    organisation_id: actor.organisation_id,
    conversation: conv._id,
    senderKey: actor.key,
    text: body,
    replyTo: replyTo && mongoose.isValidObjectId(replyTo) ? replyTo : undefined,
    mentions: (Array.isArray(mentions) ? mentions : []).map((m) => (m && typeof m === "object" ? m.key : m)).filter((k) => typeof k === "string").slice(0, 50),
    sendAt: when,
  });
  return shape(row, undefined);
};

// My upcoming (and recently failed) scheduled messages.
const listMine = async (actor, { conversationId = null } = {}) => {
  const q = { organisation_id: actor.organisation_id, senderKey: actor.key, status: { $in: ["pending", "sending", "failed"] } };
  if (conversationId) { chat.assertObjectId(conversationId, "conversation id"); q.conversation = conversationId; }
  const rows = await ChatScheduled.find(q).sort({ sendAt: 1 }).limit(100).lean();
  const convs = await Conversation.find({ _id: { $in: rows.map((r) => r.conversation) }, participantKeys: actor.key });
  const people = await chat.loadPeopleForConversations(actor.organisation_id, convs);
  const names = new Map(convs.map((c) => [String(c._id), chat.serializeConversation(c, actor, people).name]));
  return rows.map((r) => shape(r, names.get(String(r.conversation)) || "Chat"));
};

const update = async (actor, id, { text, sendAt } = {}) => {
  const row = await ownRow(actor, id);
  if (!["pending", "failed"].includes(row.status)) throw httpError("This message can no longer be changed.");
  if (text !== undefined) row.text = cleanText(text);
  if (sendAt !== undefined) row.sendAt = parseSendAt(sendAt);
  row.status = "pending"; // editing a failed one retries it
  row.error = "";
  row.attempts = 0;
  row.finishedAt = undefined;
  await row.save();
  return shape(row);
};

const cancel = async (actor, id) => {
  const row = await ownRow(actor, id);
  const r = await ChatScheduled.updateOne({ _id: row._id, status: { $in: ["pending", "failed"] } }, { $set: { status: "cancelled", finishedAt: new Date() } });
  if (!r.modifiedCount) throw httpError("This message was already sent.");
};

const sendNow = async (actor, id) => {
  const row = await ownRow(actor, id);
  const claimed = await ChatScheduled.findOneAndUpdate(
    { _id: row._id, status: { $in: ["pending", "failed"] } },
    { $set: { status: "sending", claimedAt: new Date() }, $inc: { attempts: 1 } },
    { new: true }
  );
  if (!claimed) throw httpError("This message was already sent.");
  const outcome = await deliver(claimed);
  if (outcome.error) throw httpError(outcome.error, 400);
  return outcome;
};

// Sends one claimed row. Permanent problems (left the group, admin-only now, ...) mark it failed;
// anything unexpected is retried a couple of times.
const deliver = async (row) => {
  const actor = chat.toActor({ id: parseKey(row.senderKey).id, recipientModel: parseKey(row.senderKey).model, organisation_id: row.organisation_id });
  try {
    let result;
    try {
      // clientId makes a retry idempotent: the same schedule can never be delivered twice
      result = await chat.sendMessage(actor, row.conversation, { text: row.text, replyTo: row.replyTo || null, mentions: row.mentions, clientId: `sched:${row._id}` });
    } catch (err) {
      if (row.replyTo && err.statusCode === 404 && /replying to/.test(err.message)) {
        result = await chat.sendMessage(actor, row.conversation, { text: row.text, mentions: row.mentions, clientId: `sched:${row._id}` }); // the original was deleted - send without the reply
      } else throw err;
    }
    await ChatScheduled.updateOne({ _id: row._id }, { $set: { status: "sent", sentMessage: result.message.id, finishedAt: new Date(), error: "" } });
    chat.emitToKeys([row.senderKey], "chat:scheduled:sent", { id: String(row._id), conversationId: String(row.conversation), messageId: result.message.id });
    return { sent: true, messageId: result.message.id };
  } catch (err) {
    const permanent = !!err.statusCode || row.attempts >= MAX_ATTEMPTS;
    const message = err.statusCode ? err.message : "Could not be sent.";
    if (permanent) {
      await ChatScheduled.updateOne({ _id: row._id }, { $set: { status: "failed", error: message, finishedAt: new Date() } });
      chat.emitToKeys([row.senderKey], "chat:scheduled:failed", { id: String(row._id), conversationId: String(row.conversation), error: message });
    } else {
      await ChatScheduled.updateOne({ _id: row._id }, { $set: { status: "pending", sendAt: new Date(Date.now() + 60 * 1000), error: message } });
    }
    if (!err.statusCode) console.error("[chat] scheduled message failed:", err);
    return { sent: false, error: message };
  }
};

// One job tick. Each row is claimed atomically, so two servers can run this at the same time safely.
const processDue = async () => {
  await ChatScheduled.updateMany({ status: "sending", claimedAt: { $lt: new Date(Date.now() - STALE_MS) } }, { $set: { status: "pending" } });
  let sent = 0;
  for (let i = 0; i < 200; i++) {
    const row = await ChatScheduled.findOneAndUpdate(
      { status: "pending", sendAt: { $lte: new Date() } },
      { $set: { status: "sending", claimedAt: new Date() }, $inc: { attempts: 1 } },
      { sort: { sendAt: 1 }, new: true }
    );
    if (!row) break;
    const r = await deliver(row);
    if (r.sent) sent++;
  }
  return sent;
};

module.exports = { schedule, listMine, update, cancel, sendNow, processDue };
