// HTTP layer for channels, communities and personal follow-ups. Logic: utils/chat/channels.service.js
const ch = require("../utils/chat/channels.service");
const chat = require("../utils/chat/chat.service");
const ChatFollowup = require("../Models/chatfollowup.model");
const { httpError } = require("../utils/chat/people.utils");

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });

// ---------- channels ----------
const createChannel = async (req, res) => {
  const actor = actorOf(req);
  const conv = await ch.createChannel(actor, req.body || {});
  ok(res, { conversation: await chat.serializeOneConversation(conv, actor) }, 201);
};
const browseChannels = async (req, res) => ok(res, { channels: await ch.browseChannels(actorOf(req), req.query) });
const joinChannel = async (req, res) => ok(res, await ch.joinChannel(actorOf(req), req.params.id));

// ---------- communities ----------
const listCommunities = async (req, res) => ok(res, { communities: await ch.listCommunities(actorOf(req), req.query) });
const createCommunity = async (req, res) => {
  const actor = actorOf(req);
  const comm = await ch.createCommunity(actor, req.body || {});
  const [one] = (await ch.listCommunities(actor)).filter((c) => c.id === String(comm._id));
  ok(res, { community: one }, 201);
};
const joinCommunity = async (req, res) => ok(res, await ch.joinCommunity(actorOf(req), req.params.id));
const leaveCommunity = async (req, res) => ok(res, await ch.leaveCommunity(actorOf(req), req.params.id));
const setCommunityAdmin = async (req, res) => ok(res, await ch.setCommunityAdmin(actorOf(req), req.params.id, req.body || {}));

// ---------- follow-ups (my to-dos picked from chats / calls / meetings) ----------
const shapeFollowup = (f) => ({
  id: String(f._id),
  title: f.title,
  dueDate: f.dueDate,
  done: !!f.done,
  doneAt: f.doneAt,
  source: { type: f.source?.type || "manual", conversationId: f.source?.conversation ? String(f.source.conversation) : null, meetingId: f.source?.meeting ? String(f.source.meeting) : null, label: f.source?.label || "" },
  createdAt: f.createdAt,
});

const listFollowups = async (req, res) => {
  const actor = actorOf(req);
  const q = { organisation_id: actor.organisation_id, ownerKey: actor.key };
  if (req.query.status === "done") q.done = true;
  else if (req.query.status !== "all") q.done = false;
  const rows = await ChatFollowup.find(q).sort({ done: 1, dueDate: 1, createdAt: -1 }).limit(100).lean();
  ok(res, { followups: rows.map(shapeFollowup) });
};

const parseDue = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const createFollowups = async (req, res) => {
  const actor = actorOf(req);
  const items = (Array.isArray(req.body?.items) ? req.body.items : [req.body]).slice(0, 20);
  const docs = [];
  for (const it of items) {
    const title = String(it?.title || "").trim().slice(0, 300);
    if (!title) continue;
    const src = it.source || {};
    docs.push({
      organisation_id: actor.organisation_id,
      ownerKey: actor.key,
      title,
      dueDate: parseDue(it.dueDate),
      source: {
        type: ["chat", "call", "meeting", "manual"].includes(src.type) ? src.type : "manual",
        conversation: src.conversationId && /^[a-f\d]{24}$/i.test(src.conversationId) ? src.conversationId : undefined,
        meeting: src.meetingId && /^[a-f\d]{24}$/i.test(src.meetingId) ? src.meetingId : undefined,
        label: String(src.label || "").slice(0, 120),
      },
    });
  }
  if (!docs.length) throw httpError("A follow-up needs a title.");
  const created = await ChatFollowup.insertMany(docs);
  ok(res, { followups: created.map(shapeFollowup) }, 201);
};

const updateFollowup = async (req, res) => {
  const actor = actorOf(req);
  const set = {};
  if (typeof req.body?.done === "boolean") { set.done = req.body.done; set.doneAt = req.body.done ? new Date() : null; }
  if (typeof req.body?.title === "string" && req.body.title.trim()) set.title = req.body.title.trim().slice(0, 300);
  if ("dueDate" in (req.body || {})) set.dueDate = parseDue(req.body.dueDate);
  const f = await ChatFollowup.findOneAndUpdate({ _id: req.params.id, organisation_id: actor.organisation_id, ownerKey: actor.key }, { $set: set }, { new: true }).lean();
  if (!f) throw httpError("Follow-up not found.", 404);
  ok(res, { followup: shapeFollowup(f) });
};

const deleteFollowup = async (req, res) => {
  const actor = actorOf(req);
  const r = await ChatFollowup.deleteOne({ _id: req.params.id, organisation_id: actor.organisation_id, ownerKey: actor.key });
  if (!r.deletedCount) throw httpError("Follow-up not found.", 404);
  ok(res, { deleted: true });
};

module.exports = { createChannel, browseChannels, joinChannel, listCommunities, createCommunity, joinCommunity, leaveCommunity, setCommunityAdmin, listFollowups, createFollowups, updateFollowup, deleteFollowup };
