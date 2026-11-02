// Group invite links (admin controls).
//   admin:  create / reset / turn off the link
//   anyone in the SAME organisation who has the code: preview the group, then join
// A link only ever works inside the organisation of the group, and resetting it kills the old one.
const crypto = require("crypto");
const Conversation = require("../../Models/conversation.model");
const chat = require("./chat.service");
const { httpError, requirePeople } = require("./people.utils");

const CODE_RE = /^[A-Za-z0-9_-]{10,40}$/;
const newCode = () => crypto.randomBytes(12).toString("base64url"); // 16 chars, ~96 bits

const loadAdminGroup = async (actor, conversationId) => {
  const conv = await chat.loadConversation(actor, conversationId);
  if (conv.type !== "group") throw httpError("Invite links are only available for group chats.");
  if (!chat.isAdminOf(conv, actor)) throw httpError("Only group admins can manage the invite link.", 403);
  return conv;
};

const shape = (conv) =>
  conv.invite && conv.invite.enabled && conv.invite.code
    ? { enabled: true, code: conv.invite.code, link: chat.inviteUrl(conv.invite.code), createdAt: conv.invite.createdAt }
    : { enabled: false };

const getInvite = async (actor, conversationId) => shape(await loadAdminGroup(actor, conversationId));

// Creates the link, or replaces it with a fresh one (the old link stops working immediately).
const createOrResetInvite = async (actor, conversationId) => {
  const conv = await loadAdminGroup(actor, conversationId);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await Conversation.updateOne(
        { _id: conv._id },
        { $set: { "invite.code": newCode(), "invite.enabled": true, "invite.createdByKey": actor.key, "invite.createdAt": new Date() } }
      );
      break;
    } catch (err) {
      if (!(err && err.code === 11000) || attempt === 2) throw err; // astronomically unlikely code clash -> retry
    }
  }
  const fresh = await Conversation.findById(conv._id);
  chat.emitToKeys(fresh.participantKeys, "chat:conversation:updated", { conversationId: String(conv._id) });
  return shape(fresh);
};

const disableInvite = async (actor, conversationId) => {
  const conv = await loadAdminGroup(actor, conversationId);
  await Conversation.updateOne({ _id: conv._id }, { $set: { "invite.enabled": false } });
  chat.emitToKeys(conv.participantKeys, "chat:conversation:updated", { conversationId: String(conv._id) });
  return { enabled: false };
};

const findByCode = async (actor, code) => {
  if (!CODE_RE.test(String(code || ""))) throw httpError("This invite link is invalid or has been turned off.", 404);
  const conv = await Conversation.findOne({ organisation_id: actor.organisation_id, type: "group", "invite.code": code, "invite.enabled": true });
  if (!conv) throw httpError("This invite link is invalid or has been turned off.", 404);
  return conv;
};

// What the "Join group?" screen shows.
const previewInvite = async (actor, code) => {
  const conv = await findByCode(actor, code);
  const member = conv.participantKeys.includes(actor.key);
  return {
    name: conv.name,
    description: conv.description || "",
    photo: conv.photo || "",
    memberCount: conv.participantKeys.length,
    full: conv.participantKeys.length >= Conversation.MAX_GROUP_MEMBERS,
    alreadyMember: member,
    conversationId: member ? String(conv._id) : undefined,
  };
};

const joinByInvite = async (actor, code) => {
  const conv = await findByCode(actor, code);
  if (conv.participantKeys.includes(actor.key)) return { conversation: await chat.serializeOneConversation(conv, actor), alreadyMember: true };

  const [me] = [...(await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }])).values()]; // must be an active person of this organisation
  // atomic: never exceeds the member limit, never adds the same person twice, even with many people joining at once
  const r = await Conversation.updateOne(
    {
      _id: conv._id,
      "invite.code": code,
      "invite.enabled": true,
      participantKeys: { $ne: actor.key },
      $expr: { $lt: [{ $size: "$participantKeys" }, Conversation.MAX_GROUP_MEMBERS] },
    },
    {
      $push: { participants: { key: me.key, member: me.id, memberModel: me.model, role: "member", joinedAt: new Date(), lastReadAt: new Date() } },
      $addToSet: { participantKeys: me.key },
    }
  );
  if (!r.modifiedCount) {
    const now = await Conversation.findById(conv._id);
    if (now && now.participantKeys.includes(actor.key)) return { conversation: await chat.serializeOneConversation(now, actor), alreadyMember: true };
    if (now && now.participantKeys.length >= Conversation.MAX_GROUP_MEMBERS) throw httpError("This group is full.");
    throw httpError("This invite link is invalid or has been turned off.", 404);
  }

  const joined = await Conversation.findById(conv._id);
  await chat.postSystemMessage(joined, actor, { event: "member_joined_link", targets: [actor.key] }, `${me.name} joined using the group's invite link`);
  chat.emitToKeys(joined.participantKeys, "chat:conversation:updated", { conversationId: String(joined._id) });
  return { conversation: await chat.serializeOneConversation(joined, actor), alreadyMember: false };
};

module.exports = { getInvite, createOrResetInvite, disableInvite, previewInvite, joinByInvite };
