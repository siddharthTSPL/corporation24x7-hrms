// Channels + communities (Slack / Teams style) on top of the existing group chat.
//   channel   = Conversation { type: "group", channel: { enabled: true, visibility, topic, community } }
//   community = Community document that groups channels; everyone in the organisation can browse and join.
// Because a channel IS a group conversation, messages, mentions, polls, pins, calls and read receipts all work as-is.
const Conversation = require("../../Models/conversation.model");
const Community = require("../../Models/community.model");
const chat = require("./chat.service");
const { httpError, requirePeople, escapeRegex } = require("./people.utils");

const CHANNEL_MAX_MEMBERS = 2000;
const COLORS = ["#730042", "#0369A1", "#047857", "#B45309", "#6D28D9", "#BE123C", "#0F766E", "#334155"];

const participantDoc = (person, role = "member") => ({ key: person.key, member: person.id, memberModel: person.model, role, joinedAt: new Date(), lastReadAt: new Date() });
const cleanName = (v, label = "Name") => {
  const n = String(v || "").trim().replace(/^#+/, "").replace(/\s+/g, " ");
  if (!n) throw httpError(`${label} is required.`);
  if (n.length > 60) throw httpError(`${label} is too long (max 60 characters).`);
  return n;
};
const meOf = async (actor) => [...(await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }])).values()][0];
const isCommunityAdmin = (c, key) => c.members.some((m) => m.key === key && m.role === "admin");

const shapeChannel = (c, actorKey) => ({
  id: String(c._id),
  name: c.name,
  description: c.description || "",
  topic: (c.channel && c.channel.topic) || "",
  visibility: (c.channel && c.channel.visibility) || "public",
  kind: (c.channel && c.channel.kind) || "custom",
  community: c.channel && c.channel.community ? String(c.channel.community) : null,
  memberCount: (c.participantKeys || []).length,
  joined: (c.participantKeys || []).includes(actorKey),
});

// ---------------------------------------------------------------- channels
const createChannel = async (actor, { name, description = "", topic = "", visibility = "public", community = null, kind = "custom", onlyAdminsCanSend = false } = {}) => {
  const title = cleanName(name, "Channel name");
  const vis = visibility === "private" ? "private" : "public";
  let comm = null;
  if (community) {
    comm = await Community.findOne({ _id: community, organisation_id: actor.organisation_id });
    if (!comm) throw httpError("Community not found.", 404);
    if (!isCommunityAdmin(comm, actor.key)) throw httpError("Only community admins can add channels.", 403);
  }
  const dup = await Conversation.findOne({
    organisation_id: actor.organisation_id,
    "channel.enabled": true,
    "channel.community": comm ? comm._id : { $in: [null] },
    name: new RegExp(`^${escapeRegex(title)}$`, "i"),
    ...(vis === "public" ? { "channel.visibility": "public" } : { participantKeys: actor.key }),
  }).select("_id");
  if (dup) throw httpError("A channel with this name already exists here.");

  const me = await meOf(actor);
  const conv = await Conversation.create({
    organisation_id: actor.organisation_id,
    type: "group",
    name: title,
    description: String(description || "").trim().slice(0, 300),
    settings: { onlyAdminsCanSend: !!onlyAdminsCanSend, onlyAdminsCanEditInfo: true, onlyAdminsCanAddMembers: true, onlyAdminsCanPin: false },
    channel: { enabled: true, visibility: vis, topic: String(topic || "").trim().slice(0, 200), community: comm ? comm._id : undefined, kind },
    participants: [participantDoc(me, "admin")],
    participantKeys: [me.key],
    createdBy: actor.id,
    createdByModel: actor.model,
  });
  await chat.postSystemMessage(conv, actor, { event: "group_created" }, `${me.name} created the channel #${title}`);
  return conv;
};

const browseChannels = async (actor, { q = "", community = "", limit = 60 } = {}) => {
  const query = { organisation_id: actor.organisation_id, type: "group", "channel.enabled": true, "channel.visibility": "public" };
  if (community) query["channel.community"] = community;
  const term = String(q || "").trim().slice(0, 60);
  if (term) query.$or = [{ name: new RegExp(escapeRegex(term), "i") }, { "channel.topic": new RegExp(escapeRegex(term), "i") }, { description: new RegExp(escapeRegex(term), "i") }];
  const rows = await Conversation.find(query).select("name description participantKeys channel").sort({ name: 1 }).limit(Math.min(Math.max(parseInt(limit, 10) || 60, 1), 100)).lean();
  return rows.map((c) => shapeChannel(c, actor.key));
};

// Atomic: never above the limit, never adds the same person twice.
const addSelfToChannel = async (convId, me, extra = {}) => {
  const r = await Conversation.updateOne(
    { _id: convId, ...extra, participantKeys: { $ne: me.key }, $expr: { $lt: [{ $size: "$participantKeys" }, CHANNEL_MAX_MEMBERS] } },
    { $push: { participants: participantDoc(me) }, $addToSet: { participantKeys: me.key } }
  );
  return r.modifiedCount > 0;
};

const joinChannel = async (actor, channelId) => {
  chat.assertObjectId(channelId, "channel id");
  const conv = await Conversation.findOne({ _id: channelId, organisation_id: actor.organisation_id, type: "group", "channel.enabled": true, "channel.visibility": "public" });
  if (!conv) throw httpError("Channel not found, or it is private.", 404);
  if (conv.participantKeys.includes(actor.key)) return { conversation: await chat.serializeOneConversation(conv, actor), alreadyMember: true };
  const me = await meOf(actor);
  const added = await addSelfToChannel(conv._id, me, { "channel.visibility": "public" });
  if (!added) throw httpError("This channel is full.");
  // joining a channel of a community also makes you a community member
  if (conv.channel.community) {
    await Community.updateOne({ _id: conv.channel.community, memberKeys: { $ne: me.key } }, { $push: { members: { key: me.key, role: "member", joinedAt: new Date() } }, $addToSet: { memberKeys: me.key } });
  }
  const joined = await Conversation.findById(conv._id);
  await chat.postSystemMessage(joined, actor, { event: "member_joined_link", targets: [actor.key] }, `${me.name} joined the channel`);
  chat.emitToKeys(joined.participantKeys, "chat:conversation:updated", { conversationId: String(joined._id) });
  return { conversation: await chat.serializeOneConversation(joined, actor), alreadyMember: false };
};

// ---------------------------------------------------------------- communities
const shapeCommunity = (c, channels, actorKey) => {
  const mine = (c.members || []).find((m) => m.key === actorKey);
  return {
    id: String(c._id),
    name: c.name,
    description: c.description || "",
    color: c.color || COLORS[0],
    memberCount: (c.memberKeys || []).length,
    joined: !!mine,
    myRole: mine ? mine.role : null,
    channels: channels.filter((ch) => String(ch.channel.community) === String(c._id)).map((ch) => shapeChannel(ch, actorKey)),
  };
};

const listCommunities = async (actor, { q = "" } = {}) => {
  const query = { organisation_id: actor.organisation_id };
  const term = String(q || "").trim().slice(0, 60);
  if (term) query.name = new RegExp(escapeRegex(term), "i");
  const comms = await Community.find(query).sort({ name: 1 }).limit(100).lean();
  if (!comms.length) return [];
  const channels = await Conversation.find({
    organisation_id: actor.organisation_id,
    type: "group",
    "channel.enabled": true,
    "channel.community": { $in: comms.map((c) => c._id) },
    $or: [{ "channel.visibility": "public" }, { participantKeys: actor.key }],
  }).select("name description participantKeys channel").sort({ name: 1 }).lean();
  return comms.map((c) => shapeCommunity(c, channels, actor.key));
};

const loadCommunity = async (actor, id) => {
  chat.assertObjectId(id, "community id");
  const c = await Community.findOne({ _id: id, organisation_id: actor.organisation_id });
  if (!c) throw httpError("Community not found.", 404);
  return c;
};

const createCommunity = async (actor, { name, description = "", color = "" } = {}) => {
  const title = cleanName(name, "Community name");
  if (await Community.findOne({ organisation_id: actor.organisation_id, name: new RegExp(`^${escapeRegex(title)}$`, "i") }).select("_id")) throw httpError("A community with this name already exists.");
  const comm = await Community.create({
    organisation_id: actor.organisation_id,
    name: title,
    description: String(description || "").trim().slice(0, 300),
    color: COLORS.includes(color) ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
    members: [{ key: actor.key, role: "admin" }],
    memberKeys: [actor.key],
    createdByKey: actor.key,
  });
  const ann = await createChannel(actor, { name: "announcements", description: `Official updates from ${title}`, community: comm._id, kind: "announcements", onlyAdminsCanSend: true });
  await createChannel(actor, { name: "general", description: `Everyone in ${title}`, community: comm._id, kind: "general" });
  await Community.updateOne({ _id: comm._id }, { $set: { announcementChannel: ann._id } });
  return comm;
};

const joinCommunity = async (actor, id) => {
  const comm = await loadCommunity(actor, id);
  if (comm.memberKeys.includes(actor.key)) return { alreadyMember: true };
  if (comm.memberKeys.length >= Community.MAX_MEMBERS) throw httpError("This community is full.");
  const me = await meOf(actor);
  await Community.updateOne({ _id: comm._id, memberKeys: { $ne: me.key } }, { $push: { members: { key: me.key, role: "member", joinedAt: new Date() } }, $addToSet: { memberKeys: me.key } });
  // start in the default channels (announcements + general); the rest are opt-in
  const defaults = await Conversation.find({ organisation_id: actor.organisation_id, "channel.community": comm._id, "channel.kind": { $in: ["announcements", "general"] } });
  for (const ch of defaults) {
    if (await addSelfToChannel(ch._id, me)) chat.emitToKeys([...ch.participantKeys, me.key], "chat:conversation:updated", { conversationId: String(ch._id) });
  }
  return { alreadyMember: false };
};

const leaveCommunity = async (actor, id) => {
  const comm = await loadCommunity(actor, id);
  if (!comm.memberKeys.includes(actor.key)) return { left: true };
  if (isCommunityAdmin(comm, actor.key) && comm.members.filter((m) => m.role === "admin").length === 1 && comm.memberKeys.length > 1) {
    throw httpError("You are the only admin. Make someone else an admin before leaving.");
  }
  await Community.updateOne({ _id: comm._id }, { $pull: { members: { key: actor.key } }, $pullAll: { memberKeys: [actor.key] } });
  const channels = await Conversation.find({ organisation_id: actor.organisation_id, "channel.community": comm._id, participantKeys: actor.key }).select("participantKeys");
  await Conversation.updateMany({ _id: { $in: channels.map((c) => c._id) } }, { $pull: { participants: { key: actor.key } }, $pullAll: { participantKeys: [actor.key] } });
  for (const ch of channels) chat.emitToKeys([...ch.participantKeys], "chat:conversation:updated", { conversationId: String(ch._id), removed: [actor.key] });
  return { left: true };
};

const setCommunityAdmin = async (actor, id, { key, role = "admin" }) => {
  const comm = await loadCommunity(actor, id);
  if (!isCommunityAdmin(comm, actor.key)) throw httpError("Only community admins can do this.", 403);
  if (!comm.memberKeys.includes(key)) throw httpError("That person is not in the community.");
  await Community.updateOne({ _id: comm._id, "members.key": key }, { $set: { "members.$.role": role === "admin" ? "admin" : "member" } });
  return { ok: true };
};

module.exports = { createChannel, browseChannels, joinChannel, createCommunity, listCommunities, joinCommunity, leaveCommunity, setCommunityAdmin, loadCommunity, isCommunityAdmin, shapeChannel };
