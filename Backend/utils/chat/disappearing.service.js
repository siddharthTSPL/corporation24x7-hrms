// Disappearing messages: deletes messages whose expiresAt has passed.
// (Reads already hide them the moment they expire - this just cleans up the data and the files.)
const Conversation = require("../../Models/conversation.model");
const ChatMessage = require("../../Models/chatmessage.model");
const ChatStar = require("../../Models/chatstar.model");
const imagekit = require("../imagekit.utils");
const chat = require("./chat.service");

const BATCH = 500;

// If the chat's "last message" just disappeared, show the newest message that is still there.
// The chat row itself stays in the list (lastMessage.at is kept), only the preview text goes.
const refreshLastMessage = async (convId, expiredIds) => {
  const conv = await Conversation.findById(convId).select("organisation_id lastMessage").lean();
  if (!conv || !conv.lastMessage || !conv.lastMessage.message || !expiredIds.has(String(conv.lastMessage.message))) return;
  const latest = await ChatMessage.findOne({ conversation: convId, deletedAt: null, ...chat.notExpired() }).sort({ _id: -1 }).lean();
  if (!latest) {
    await Conversation.updateOne({ _id: convId }, { $set: { "lastMessage.text": "", "lastMessage.type": "text", "lastMessage.senderName": "" }, $unset: { "lastMessage.message": "" } });
    return;
  }
  const [h] = await chat.hydrateMessages(conv.organisation_id, [latest]);
  await Conversation.updateOne(
    { _id: convId },
    { $set: { lastMessage: { message: latest._id, text: chat.snippet(latest), type: latest.type, senderKey: latest.senderKey || "", senderName: h.sender?.name || "", at: latest.createdAt } } }
  );
};

// Removes up to BATCH expired messages. Returns how many were removed.
const sweepExpired = async () => {
  const rows = await ChatMessage.find({ expiresAt: { $lte: new Date() } }).select("_id conversation attachments").limit(BATCH).lean();
  if (!rows.length) return 0;
  const ids = rows.map((r) => r._id);
  const idSet = new Set(ids.map(String));

  await ChatMessage.deleteMany({ _id: { $in: ids } });
  await ChatStar.deleteMany({ message: { $in: ids } });

  // uploaded files go too - unless a forwarded copy somewhere else still points at the same file (best effort)
  for (const r of rows) {
    for (const f of r.attachments || []) {
      if (!f.fileId) continue;
      ChatMessage.exists({ "attachments.fileId": f.fileId }).then((used) => (used ? null : imagekit.deleteFile(f.fileId))).catch(() => {});
    }
  }

  const byConv = new Map();
  for (const r of rows) {
    const k = String(r.conversation);
    if (!byConv.has(k)) byConv.set(k, []);
    byConv.get(k).push(String(r._id));
  }
  for (const [convId, messageIds] of byConv) {
    await Conversation.updateOne({ _id: convId }, { $pull: { pinnedMessages: { message: { $in: messageIds } } } });
    await refreshLastMessage(convId, idSet);
    const conv = await Conversation.findById(convId).select("participantKeys").lean();
    if (conv) chat.emitToKeys(conv.participantKeys, "chat:message:expired", { conversationId: convId, messageIds });
  }
  return rows.length;
};

module.exports = { sweepExpired };
