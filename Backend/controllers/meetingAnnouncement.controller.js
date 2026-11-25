const mongoose = require("mongoose");
const MeetingAnnouncement = require("../Models/meetingannouncement.model");
const guestSvc = require("../utils/chat/guest.service");
const u = require("../utils/chat/meetingSpace.utils");
const { httpError, parseKey, requirePeople, resolvePeople } = require("../utils/chat/people.utils");

const RSVP_VALUES = ["invited", "accepted", "declined", "tentative"];

const loadAnnouncement = async (m, id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError("Announcement not found.", 404);
  const a = await MeetingAnnouncement.findOne({ _id: id, meeting: m._id, organisation_id: m.organisation_id, deletedAt: null });
  if (!a) throw httpError("Announcement not found.", 404);
  return a;
};

const resolveAudience = (m, actor, to = {}) => {
  const audience = {
    attendees: to.attendees !== false,
    rsvp: Array.isArray(to.rsvp) ? [...new Set(to.rsvp.filter((r) => RSVP_VALUES.includes(r)))] : [],
    interested: !!to.interested,
    guests: !!to.guests,
  };
  const keys = new Set();
  if (audience.attendees) {
    for (const a of m.attendees) {
      if (a.key === m.hostKey || a.key === actor.key) continue;
      const wanted = audience.rsvp.length ? audience.rsvp.includes(a.rsvp) : a.rsvp !== "declined";
      if (wanted) keys.add(a.key);
    }
  }
  if (audience.interested) for (const k of m.interestedKeys) if (k !== actor.key) keys.add(k);
  const guestEmails = audience.guests ? (m.guests || []).filter((g) => !g.revoked).map((g) => g.email) : [];
  return { audience, recipientKeys: [...keys], guestEmails };
};

const shape = (a, actor, people, moderator) => ({
  id: String(a._id),
  meetingId: String(a.meeting),
  title: a.title,
  text: a.text,
  pinned: a.pinned,
  author: u.mini(people, a.authorKey),
  createdAt: a.createdAt,
  audience: a.audience,
  recipientCount: a.recipientKeys.length,
  seenCount: a.seenKeys.length,
  guestCount: a.guestEmails.length,
  emailedCount: a.emailedCount,
  seenByMe: a.seenKeys.includes(actor.key),
  canManage: moderator || a.authorKey === actor.key,
});

const peopleOf = (organisation_id, list) => resolvePeople(organisation_id, list.map((a) => parseKey(a.authorKey)));

const announce = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  if (m.status === "cancelled") throw httpError("A cancelled meeting cannot be messaged.");

  const b = req.body || {};
  const text = String(b.text || "").trim();
  if (!text) throw httpError("Write a message first.");
  if (text.length > 3000) throw httpError("Message is too long (max 3000 characters).");
  const title = String(b.title || "").trim().slice(0, 150);

  const { audience, recipientKeys, guestEmails } = resolveAudience(m, actor, b.to);
  if (!recipientKeys.length && !guestEmails.length) throw httpError("Nobody matches the selected audience.");

  const ann = await MeetingAnnouncement.create({
    organisation_id: actor.organisation_id,
    meeting: m._id,
    authorKey: actor.key,
    title,
    text,
    pinned: !!b.pinned,
    audience,
    recipientKeys,
    guestEmails,
  });

  const [author] = [...(await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }])).values()];
  const heading = title || `New message about "${m.title}"`;

  u.notifyKeys(actor, recipientKeys, m, {
    title: heading,
    message: `${author.name}: ${text.slice(0, 160)}`,
    priority: b.priority === "high" ? "high" : "medium",
    event: "meeting:announcement",
    payload: { announcementId: String(ann._id), title: heading, text: text.slice(0, 200), authorKey: actor.key },
  });

  let emailed = 0;
  const sendEmailFlag = b.sendEmail !== false;
  if (sendEmailFlag && guestEmails.length) {
    const guestUrl = guestSvc.guestJoinUrl(m._id);
    const guests = (m.guests || []).filter((g) => !g.revoked && guestEmails.includes(g.email));
    emailed += guests.length;
    u.sendInBatches(guests, (g) =>
      u.sendMail(
        g.email,
        `${m.title}: ${title || "message from the host"}`,
        u.brandedEmail({
          heading: m.title,
          intro: `${u.escapeHtml(author.name)} sent a message about this meeting.`,
          bodyHtml: `<p><b>When:</b> ${u.escapeHtml(u.fmtWhen(m.startTime, m.timezone))} (${u.escapeHtml(m.timezone)})</p>
            ${title ? `<p style="font-weight:600">${u.escapeHtml(title)}</p>` : ""}
            <div style="background:#f6eef2;border-radius:8px;padding:12px 16px">${u.escapeHtml(text).replace(/\n/g, "<br>")}</div>
            <p style="color:#555;font-size:13px">Use the PIN from your original invitation to join. Need a new PIN? Ask the host to resend it.</p>`,
          ctaUrl: guestUrl,
          ctaLabel: "Join page",
        })
      )
    );
  }
  if (b.emailAttendees === true && recipientKeys.length) {
    const people = await resolvePeople(actor.organisation_id, recipientKeys.map(parseKey));
    const withMail = [...people.values()].filter((p) => p.email);
    emailed += withMail.length;
    const url = u.meetingUrl(m._id);
    u.sendInBatches(withMail, (p) =>
      u.sendMail(
        p.email,
        `${m.title}: ${title || "new message"}`,
        u.brandedEmail({
          heading: m.title,
          intro: `${u.escapeHtml(author.name)} sent a message about this meeting.`,
          bodyHtml: `${title ? `<p style="font-weight:600">${u.escapeHtml(title)}</p>` : ""}<div style="background:#f6eef2;border-radius:8px;padding:12px 16px">${u.escapeHtml(text).replace(/\n/g, "<br>")}</div>`,
          ctaUrl: url,
        })
      )
    );
  }
  if (emailed) await MeetingAnnouncement.updateOne({ _id: ann._id }, { $set: { emailedCount: emailed } });
  ann.emailedCount = emailed;

  const people = await resolvePeople(actor.organisation_id, [parseKey(actor.key)]);
  u.ok(res, { announcement: shape(ann, actor, people, true) }, 201);
};

const list = async (req, res) => {
  const actor = u.actorOf(req);
  const { m } = await u.loadReachableMeeting(actor, req.params.id);
  const moderator = u.isModerator(m, actor.key);
  const limit = u.clampInt(req.query.limit, 1, 50, 20);

  const q = { meeting: m._id, organisation_id: actor.organisation_id, deletedAt: null };
  if (!moderator) q.recipientKeys = actor.key;
  if (req.query.before) {
    if (!mongoose.isValidObjectId(req.query.before)) throw httpError("Invalid cursor.");
    q._id = { $lt: req.query.before };
  }
  if (req.query.unseen === "true") q.seenKeys = { $ne: actor.key };

  const rows = await MeetingAnnouncement.find(q).sort({ _id: -1 }).limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const people = await peopleOf(actor.organisation_id, page);
  const unseenCount = await MeetingAnnouncement.countDocuments({ meeting: m._id, deletedAt: null, recipientKeys: actor.key, seenKeys: { $ne: actor.key } });

  u.ok(res, {
    announcements: page.map((a) => shape(a, actor, people, moderator)),
    hasMore,
    nextCursor: hasMore ? String(page[page.length - 1]._id) : null,
    unseenCount,
  });
};

const emitSeen = (m, a, count) =>
  u.emitToKeysOnly([m.hostKey, ...m.coHostKeys, a.authorKey], "meeting:announcement:seen", {
    meetingId: String(m._id),
    announcementId: String(a._id),
    seenCount: count,
    recipientCount: a.recipientKeys.length,
  });

const markSeen = async (req, res) => {
  const actor = u.actorOf(req);
  const { m } = await u.loadReachableMeeting(actor, req.params.id);
  const a = await loadAnnouncement(m, req.params.aid);
  if (!a.recipientKeys.includes(actor.key)) throw httpError("Announcement not found.", 404);

  const r = await MeetingAnnouncement.updateOne(
    { _id: a._id, seenKeys: { $ne: actor.key } },
    { $push: { seenBy: { key: actor.key, at: new Date() } }, $addToSet: { seenKeys: actor.key } }
  );
  const fresh = await MeetingAnnouncement.findById(a._id).select("seenKeys recipientKeys").lean();
  if (r.modifiedCount > 0) emitSeen(m, a, fresh.seenKeys.length);
  u.ok(res, { seenCount: fresh.seenKeys.length, recipientCount: fresh.recipientKeys.length });
};

const markAllSeen = async (req, res) => {
  const actor = u.actorOf(req);
  const { m } = await u.loadReachableMeeting(actor, req.params.id);
  const pending = await MeetingAnnouncement.find({ meeting: m._id, deletedAt: null, recipientKeys: actor.key, seenKeys: { $ne: actor.key } }).select("_id authorKey recipientKeys seenKeys");
  if (!pending.length) return u.ok(res, { marked: 0 });

  await MeetingAnnouncement.updateMany(
    { _id: { $in: pending.map((p) => p._id) }, seenKeys: { $ne: actor.key } },
    { $push: { seenBy: { key: actor.key, at: new Date() } }, $addToSet: { seenKeys: actor.key } }
  );
  for (const a of pending) emitSeen(m, a, a.seenKeys.length + 1);
  u.ok(res, { marked: pending.length });
};

const viewers = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const a = await loadAnnouncement(m, req.params.aid);
  if (!u.isModerator(m, actor.key) && a.authorKey !== actor.key) throw httpError("Only the host, a co-host or the author can see who viewed this.", 403);

  const people = await resolvePeople(actor.organisation_id, a.recipientKeys.map(parseKey));
  const seenAt = new Map(a.seenBy.map((s) => [s.key, s.at]));
  const seen = a.seenBy.map((s) => ({ ...u.mini(people, s.key), seenAt: s.at })).sort((x, y) => new Date(y.seenAt) - new Date(x.seenAt));
  const pending = a.recipientKeys.filter((k) => !seenAt.has(k)).map((k) => u.mini(people, k));

  u.ok(res, {
    announcementId: String(a._id),
    recipientCount: a.recipientKeys.length,
    seenCount: seen.length,
    seen,
    pending,
    guests: a.guestEmails.map((email) => ({ email })),
  });
};

const update = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const a = await loadAnnouncement(m, req.params.aid);
  const moderator = u.isModerator(m, actor.key);
  if (!moderator && a.authorKey !== actor.key) throw httpError("You can't change this announcement.", 403);
  if (req.body?.pinned === undefined) throw httpError("Nothing to update.");
  a.pinned = !!req.body.pinned;
  await a.save();
  u.emitToKeysOnly([...a.recipientKeys, m.hostKey, ...m.coHostKeys], "meeting:announcement:updated", { meetingId: String(m._id), announcementId: String(a._id), pinned: a.pinned });
  u.ok(res, { pinned: a.pinned });
};

const remove = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const a = await loadAnnouncement(m, req.params.aid);
  if (!u.isModerator(m, actor.key) && a.authorKey !== actor.key) throw httpError("You can't delete this announcement.", 403);
  a.deletedAt = new Date();
  await a.save();
  u.emitToKeysOnly([...a.recipientKeys, m.hostKey, ...m.coHostKeys], "meeting:announcement:deleted", { meetingId: String(m._id), announcementId: String(a._id) });
  u.ok(res, { deleted: true });
};

const audiencePreview = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  const { audience, recipientKeys, guestEmails } = resolveAudience(m, actor, req.body?.to);
  u.ok(res, { audience, people: recipientKeys.length, guests: guestEmails.length });
};

module.exports = { announce, list, markSeen, markAllSeen, viewers, update, remove, audiencePreview };
