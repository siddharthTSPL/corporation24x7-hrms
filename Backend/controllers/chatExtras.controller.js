// HTTP layer for the chat extras (see routes/chat.routes.js). Logic lives in utils/chat/*.service.js.
const chat = require("../utils/chat/chat.service");
const extras = require("../utils/chat/chatExtras.service");
const scheduled = require("../utils/chat/scheduled.service");
const invite = require("../utils/chat/groupInvite.service");
const linkPreview = require("../utils/chat/linkPreview.service");
const { extractUrls } = require("../utils/chat/formatting");
const { httpError } = require("../utils/chat/people.utils");

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });

// ---------- chat list ----------

// GET /chat/counts -> { all, unread, groups, direct, favourites, mentions, archived } for the filter chips
const counts = async (req, res) => ok(res, { counts: await extras.listCounts(actorOf(req)) });

// PATCH /chat/conversations/:id/favourite   { favourite }
const favourite = async (req, res) => ok(res, { favourite: await extras.setFavourite(actorOf(req), req.params.id, req.body?.favourite !== false) });

// ---------- drafts ----------

// PUT /chat/conversations/:id/draft   { text, replyTo? }   (empty text clears the draft)
const putDraft = async (req, res) => ok(res, { draft: await extras.setDraft(actorOf(req), req.params.id, req.body || {}) });
const getDraft = async (req, res) => ok(res, { draft: await extras.getDraft(actorOf(req), req.params.id) });

// ---------- disappearing messages ----------

// PATCH /chat/conversations/:id/disappearing   { seconds: 0 | 86400 | 604800 | 7776000 }
const disappearing = async (req, res) => ok(res, { disappearingSeconds: await extras.setDisappearing(actorOf(req), req.params.id, req.body?.seconds) });

// ---------- pinned messages ----------

// GET /chat/conversations/:id/pinned
const pinned = async (req, res) => ok(res, { pinned: await extras.getPinned(actorOf(req), req.params.id) });

// POST /chat/messages/:messageId/pin   { pinned: true|false, duration: "24h"|"7d"|"30d" }
const pin = async (req, res) => ok(res, await extras.pinMessage(actorOf(req), req.params.messageId, { pinned: req.body?.pinned !== false, duration: req.body?.duration || "7d" }));

// ---------- polls ----------

// POST /chat/conversations/:id/polls   { question, options: [..], multiple?, anonymous? }
const createPoll = async (req, res) => ok(res, { message: await extras.createPoll(actorOf(req), req.params.id, req.body || {}) }, 201);
// POST /chat/messages/:messageId/vote   { optionIds: [..] }   ([] withdraws the vote)
const vote = async (req, res) => ok(res, { poll: await extras.votePoll(actorOf(req), req.params.messageId, req.body?.optionIds) });
const closePoll = async (req, res) => ok(res, { poll: await extras.closePoll(actorOf(req), req.params.messageId) });
// GET /chat/messages/:messageId/poll -> results with voter names (not for anonymous polls)
const pollDetails = async (req, res) => ok(res, { poll: await extras.pollDetails(actorOf(req), req.params.messageId) });

// ---------- Media / Docs / Links ----------

const mediaSummary = async (req, res) => ok(res, { counts: await extras.mediaSummary(actorOf(req), req.params.id) });
// GET /chat/conversations/:id/media?tab=media|docs|audio|links&before=<cursor>&limit=30
const media = async (req, res) => ok(res, await extras.listMedia(actorOf(req), req.params.id, { tab: req.query.tab || "media", before: req.query.before || null, limit: req.query.limit }));

// ---------- mentions ----------

const mentionable = async (req, res) => ok(res, { members: await extras.mentionable(actorOf(req), req.params.id, req.query.q) });
const myMentions = async (req, res) => ok(res, await extras.listMyMentions(actorOf(req), req.params.id, { before: req.query.before || null, limit: req.query.limit }));

// ---------- link preview (while typing) ----------

const previewHits = new Map(); // actor key -> [timestamps]
const previewAllowed = (key) => {
  const now = Date.now();
  const hits = (previewHits.get(key) || []).filter((t) => now - t < 60000);
  hits.push(now);
  previewHits.set(key, hits);
  if (previewHits.size > 5000) previewHits.delete(previewHits.keys().next().value);
  return hits.length <= 30; // 30 lookups / minute / person
};

// GET /chat/link-preview?url=https://...
const linkPreviewLookup = async (req, res) => {
  const actor = actorOf(req);
  if (!previewAllowed(actor.key)) throw httpError("Too many link previews. Please wait a moment.", 429);
  const [url] = extractUrls(String(req.query.url || ""));
  if (!url) throw httpError("Provide a valid http(s) link in ?url=");
  ok(res, { preview: await linkPreview.getPreview(url) }); // null => nothing to show
};

// ---------- scheduled messages ----------

// POST /chat/conversations/:id/scheduled   { text, sendAt (ISO date), replyTo?, mentions? }
const schedule = async (req, res) => ok(res, { scheduled: await scheduled.schedule(actorOf(req), req.params.id, req.body || {}) }, 201);
const listScheduled = async (req, res) => ok(res, { scheduled: await scheduled.listMine(actorOf(req), { conversationId: req.query.conversationId || null }) });
const updateScheduled = async (req, res) => ok(res, { scheduled: await scheduled.update(actorOf(req), req.params.id, req.body || {}) });
const cancelScheduled = async (req, res) => { await scheduled.cancel(actorOf(req), req.params.id); ok(res, { message: "Scheduled message cancelled." }); };
const sendScheduledNow = async (req, res) => ok(res, await scheduled.sendNow(actorOf(req), req.params.id));

// ---------- group invite link ----------

const getInvite = async (req, res) => ok(res, { invite: await invite.getInvite(actorOf(req), req.params.id) });
const createInvite = async (req, res) => ok(res, { invite: await invite.createOrResetInvite(actorOf(req), req.params.id) });
const disableInvite = async (req, res) => ok(res, { invite: await invite.disableInvite(actorOf(req), req.params.id) });
const previewInvite = async (req, res) => ok(res, { group: await invite.previewInvite(actorOf(req), req.params.code) });
const joinInvite = async (req, res) => ok(res, await invite.joinByInvite(actorOf(req), req.params.code));

module.exports = {
  counts, favourite, putDraft, getDraft, disappearing, pinned, pin,
  createPoll, vote, closePoll, pollDetails, mediaSummary, media, mentionable, myMentions,
  linkPreviewLookup, schedule, listScheduled, updateScheduled, cancelScheduled, sendScheduledNow,
  getInvite, createInvite, disableInvite, previewInvite, joinInvite,
};
