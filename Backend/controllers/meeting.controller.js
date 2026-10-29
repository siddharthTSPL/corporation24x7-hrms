const mongoose = require("mongoose");
const Meeting = require("../Models/meeting.model");
const Conversation = require("../Models/conversation.model");
const OrgTeam = require("../Models/orgteam.model");
const AdminModel = require("../Models/Admin.model");
const { createBulkNotifications } = require("../utils/Notification.utils");
const { sendEmail } = require("../utils/nodemailer.utils");
const { buildIcs } = require("../utils/chat/ics.utils");
const chat = require("../utils/chat/chat.service");
const calls = require("../utils/chat/call.service");
const rooms = require("../utils/chat/callRooms");
const { getIceServers } = require("../utils/chat/ice.utils");
const controls = require("../utils/chat/meetingControls.service");
const guestSvc = require("../utils/chat/guest.service");
const { httpError, parseKey, personKey, requirePeople, resolvePeople, listAllPeople, shapePerson } = require("../utils/chat/people.utils");

const MAX_ATTENDEES = 500;
const MAX_DURATION_MS = 12 * 60 * 60 * 1000;
const MAX_OCCURRENCES = 52;
const DEFAULT_TZ = "Asia/Kolkata";

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });
const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const joinUrl = (meetingId) => (FRONTEND_URL() ? `${FRONTEND_URL()}${process.env.MEETING_JOIN_PATH || "/meetings"}/${meetingId}` : "");

const validTz = (tz) => {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return DEFAULT_TZ; }
};
const fmtWhen = (d, tz) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: validTz(tz) }).format(new Date(d));

const parseDate = (v, label) => {
  const d = new Date(v);
  if (!v || isNaN(d)) throw httpError(`${label} must be a valid date-time (ISO 8601).`);
  return d;
};

const isModerator = (m, actor) => m.hostKey === actor.key || m.coHostKeys.includes(actor.key);

const loadMeeting = async (actor, id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError("Meeting not found.", 404);
  const m = await Meeting.findOne({ _id: id, organisation_id: actor.organisation_id, attendeeKeys: actor.key });
  if (!m) throw httpError("Meeting not found.", 404);
  return m;
};

const requireModerator = (m, actor) => {
  if (!isModerator(m, actor)) throw httpError("Only the host or a co-host can do this.", 403);
};

// ---------- who is invited ----------

// Merges: explicit people + "everyone" + departments + teams (hr | it | accounts).
const resolveAttendees = async (actor, { attendees = [], audience = {} }) => {
  const people = new Map();
  const add = (p) => people.set(p.key, p);

  if (Array.isArray(attendees) && attendees.length) {
    for (const p of (await requirePeople(actor.organisation_id, attendees)).values()) add(p);
  }

  const aud = { everyone: !!audience.everyone, departments: [], teams: [] };
  if (aud.everyone) {
    for (const p of await listAllPeople(actor.organisation_id)) add(p);
  } else {
    if (Array.isArray(audience.departments) && audience.departments.length) {
      aud.departments = audience.departments.map(String).slice(0, 50);
      for (const p of await listAllPeople(actor.organisation_id, { departments: aud.departments })) add(p);
    }
    if (Array.isArray(audience.teams) && audience.teams.length) {
      aud.teams = [...new Set(audience.teams.filter((t) => ["hr", "it", "accounts"].includes(t)))];
      const refs = [];
      if (aud.teams.includes("hr")) {
        const hr = await AdminModel.find({ organisation_id: actor.organisation_id, isHR: true }).select("_id").lean();
        refs.push(...hr.map((a) => ({ model: "Admin", id: a._id })));
      }
      const fn = aud.teams.filter((t) => t !== "hr");
      if (fn.length) {
        const docs = await OrgTeam.find({ organisation_id: actor.organisation_id, team: { $in: fn } }).lean();
        for (const d of docs) refs.push(...d.members.map((m) => ({ model: m.memberModel, id: m.member })));
      }
      for (const p of (await resolvePeople(actor.organisation_id, refs)).values()) add(p);
    }
  }
  return { people, audience: aud };
};

// ---------- conflicts ----------

// Busy slots overlapping [start, end) for these people. Titles only show if the
// asker is also in that meeting; otherwise it is just "Busy".
const findConflicts = async (actor, keys, start, end, excludeIds = []) => {
  const rows = await Meeting.find({
    organisation_id: actor.organisation_id,
    status: { $in: ["scheduled", "live"] },
    attendeeKeys: { $in: keys },
    startTime: { $lt: end },
    endTime: { $gt: start },
    ...(excludeIds.length ? { _id: { $nin: excludeIds } } : {}),
  })
    .select("title startTime endTime attendees.key attendees.rsvp attendeeKeys")
    .limit(300)
    .lean();

  const want = new Set(keys);
  const out = [];
  for (const m of rows) {
    const visible = m.attendeeKeys.includes(actor.key);
    for (const a of m.attendees) {
      if (want.has(a.key) && a.rsvp !== "declined") {
        out.push({ key: a.key, meetingId: visible ? String(m._id) : null, title: visible ? m.title : "Busy", startTime: m.startTime, endTime: m.endTime });
      }
    }
  }
  return out;
};

// ---------- recurrence ----------

const buildOccurrences = (start, end, rec) => {
  const out = [{ start, end }];
  if (!rec || rec.freq === "none") return out;
  const interval = Math.min(Math.max(parseInt(rec.interval, 10) || 1, 1), 12);
  const count = Math.min(Math.max(parseInt(rec.count, 10) || 10, 1), MAX_OCCURRENCES);
  const until = rec.until ? parseDate(rec.until, "recurrence.until") : null;
  const hardStop = new Date(start.getTime() + 366 * 24 * 3600 * 1000);
  const dur = end.getTime() - start.getTime();

  for (let i = 1; out.length < count; i++) {
    const s = new Date(start);
    if (rec.freq === "daily") s.setUTCDate(s.getUTCDate() + i * interval);
    else if (rec.freq === "weekly") s.setUTCDate(s.getUTCDate() + i * interval * 7);
    else if (rec.freq === "monthly") s.setUTCMonth(s.getUTCMonth() + i * interval);
    else break;
    if (s > hardStop || (until && s > until)) break;
    out.push({ start: s, end: new Date(s.getTime() + dur) });
  }
  return out;
};

// ---------- notifications / email ----------

const toRecipients = (keys) => keys.map((k) => { const p = parseKey(k); return { recipientModel: p.model, recipientId: p.id }; });

const notify = (actor, keys, meeting, { title, message, priority = "medium" }) => {
  if (!keys.length) return;
  createBulkNotifications({
    recipients: toRecipients(keys),
    organisation_id: actor.organisation_id,
    type: "meeting",
    title,
    message,
    link: `/meetings/${meeting._id}`,
    priority,
    createdBy: actor.id,
    createdByModel: actor.model,
    meta: { meetingId: String(meeting._id) },
  }).catch(() => {});
  chat.emitToKeys(keys, "meeting:updated", { meetingId: String(meeting._id), reason: title });
};

// Fire-and-forget invites (with .ics). Never blocks or fails the API call.
const emailAttendees = (meeting, host, recipients, method, allPeople) => {
  const list = recipients.filter((p) => p.email && p.key !== host.key).slice(0, 200);
  if (!list.length) return;
  const url = joinUrl(meeting._id);
  const when = `${fmtWhen(meeting.startTime, meeting.timezone)} – ${fmtWhen(meeting.endTime, meeting.timezone).split(", ").pop()} (${meeting.timezone})`;
  const cancelled = method === "CANCEL";
  const subject = `${cancelled ? "Cancelled" : method === "UPDATE" ? "Updated invitation" : "Invitation"}: ${meeting.title} @ ${fmtWhen(meeting.startTime, meeting.timezone)}`;
  const ics = buildIcs(
    { id: String(meeting._id), title: meeting.title, description: meeting.description, agenda: meeting.agenda, startTime: meeting.startTime, endTime: meeting.endTime, sequence: meeting.sequence },
    { method: cancelled ? "CANCEL" : "REQUEST", organizer: { name: host.name, email: host.email }, attendees: allPeople.map((p) => ({ name: p.name, email: p.email })), url }
  );
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#730042;margin-bottom:4px">${escapeHtml(meeting.title)}</h2>
    <p style="color:#555;margin-top:0">${cancelled ? "This meeting has been cancelled." : `${escapeHtml(host.name)} invited you to a ${meeting.media} meeting.`}</p>
    <p><b>When:</b> ${escapeHtml(when)}</p>
    ${meeting.description ? `<p>${escapeHtml(meeting.description)}</p>` : ""}
    ${meeting.agenda ? `<p><b>Agenda:</b><br>${escapeHtml(meeting.agenda).replace(/\n/g, "<br>")}</p>` : ""}
    ${!cancelled && url ? `<p><a href="${escapeHtml(url)}" style="background:#CD166E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open meeting</a></p>` : ""}
  </div>`;

  (async () => {
    for (let i = 0; i < list.length; i += 5) {
      await Promise.all(
        list.slice(i, i + 5).map((p) =>
          sendEmail({
            to: p.email, subject, html,
            attachments: [{ filename: "invite.ics", content: ics, contentType: `text/calendar; charset=utf-8; method=${cancelled ? "CANCEL" : "REQUEST"}` }],
          }).catch((e) => console.error("[meeting] invite email failed:", e.message))
        )
      );
    }
  })();
};

// ---------- shaping ----------

const rsvpCounts = (attendees) => attendees.reduce((a, x) => ((a[x.rsvp] = (a[x.rsvp] || 0) + 1), a), { invited: 0, accepted: 0, declined: 0, tentative: 0 });

const shapeMeeting = (m, actor, people, { detail = false } = {}) => {
  const o = typeof m.toObject === "function" ? m.toObject() : m;
  const me = o.attendees.find((a) => a.key === actor.key);
  const room = rooms.get(rooms.meetingRoomKey(o._id));
  const person = (k) => people.get(k) || { key: k, name: "Former member", photo: "" };
  const opensAt = new Date(new Date(o.startTime).getTime() - (isModerator(o, actor) ? 30 : 10) * 60000);

  const base = {
    id: String(o._id),
    title: o.title,
    description: o.description,
    agenda: o.agenda,
    host: person(o.hostKey),
    isHost: o.hostKey === actor.key,
    isCoHost: o.coHostKeys.includes(actor.key),
    startTime: o.startTime,
    endTime: o.endTime,
    timezone: o.timezone,
    media: o.media,
    status: o.status,
    myRsvp: me ? me.rsvp : null,
    attendeeCount: o.attendees.length,
    rsvp: rsvpCounts(o.attendees),
    audience: o.audience,
    recurrence: o.recurrence,
    seriesId: o.seriesId || null,
    conversationId: o.conversation ? String(o.conversation) : null,
    roomKey: o.roomKey,
    allowJoinBeforeHost: o.allowJoinBeforeHost,
    settings: controls.plainSettings(o.settings),
    reminderMinutes: o.reminderMinutes,
    opensAt,
    live: room ? { participants: [...rooms.distinctPeople(room)].length } : null,
    startedAt: o.startedAt,
    endedAt: o.endedAt,
    cancelReason: o.cancelReason || "",
    guestCount: (o.guests || []).filter((g) => !g.revoked).length,
    visibility: o.visibility || "invite_only",
    capacity: o.capacity || 0,
    interestedCount: (o.interestedKeys || []).length,
  };
  if (detail) {
    if (isModerator(o, actor)) base.guests = (o.guests || []).map(guestSvc.publicGuest);
    base.coHosts = o.coHostKeys.map(person);
    base.attendees = o.attendees.map((a) => ({ ...person(a.key), rsvp: a.rsvp, respondedAt: a.respondedAt, isHost: a.key === o.hostKey }));
  }
  return base;
};

const peopleFor = (organisation_id, meetings) => {
  const refs = [];
  for (const m of meetings) {
    const o = typeof m.toObject === "function" ? m.toObject() : m;
    refs.push({ model: o.hostModel, id: o.host });
    for (const k of o.coHostKeys) refs.push(parseKey(k));
    if (m.__detail) for (const a of o.attendees) refs.push({ model: a.personModel, id: a.person });
  }
  return resolvePeople(organisation_id, refs);
};

const shapeOne = async (m, actor, detail = true) => {
  m.__detail = detail;
  const people = await peopleFor(actor.organisation_id, [m]);
  return shapeMeeting(m, actor, people, { detail });
};

// ---------- handlers ----------

// POST /meetings
const createMeeting = async (req, res) => {
  const actor = actorOf(req);
  const b = req.body || {};

  const title = String(b.title || "").trim();
  if (!title) throw httpError("Meeting title is required.");
  if (title.length > 150) throw httpError("Title is too long (max 150 characters).");

  const start = parseDate(b.startTime, "startTime");
  const end = b.endTime ? parseDate(b.endTime, "endTime") : new Date(start.getTime() + (parseInt(b.durationMin, 10) || 30) * 60000);
  if (end <= start) throw httpError("End time must be after start time.");
  if (end - start > MAX_DURATION_MS) throw httpError("A meeting can be at most 12 hours long.");
  if (start.getTime() < Date.now() - 5 * 60000) throw httpError("Start time is in the past.");

  const media = b.media === "audio" ? "audio" : "video";
  const tz = validTz(b.timezone || DEFAULT_TZ);

  const { people, audience } = await resolveAttendees(actor, { attendees: b.attendees, audience: b.audience });
  const [host] = [...(await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }])).values()];
  people.set(host.key, host);
  // outsiders: people without an account, invited by email (they get a PIN by mail)
  const guestPlan = await guestSvc.prepareGuests(actor, b.guests);
  if (people.size + guestPlan.entries.length < 2) throw httpError("Invite at least one other person.");
  if (people.size > MAX_ATTENDEES) throw httpError(`A meeting can have at most ${MAX_ATTENDEES} attendees.`);

  let coHostKeys = [];
  if (Array.isArray(b.coHosts)) {
    coHostKeys = [...new Set(b.coHosts.map(String))].filter((k) => k !== host.key);
    if (coHostKeys.some((k) => !people.has(k))) throw httpError("Co-hosts must be among the invited people.");
  }

  const occ = buildOccurrences(start, end, b.recurrence);
  const seriesId = occ.length > 1 ? new mongoose.Types.ObjectId().toString() : undefined;

  // one in-meeting chat shared by the whole series
  const firstId = new mongoose.Types.ObjectId();
  const attendeeList = [...people.values()];
  const conv = await Conversation.create({
    organisation_id: actor.organisation_id,
    type: "meeting",
    name: title,
    meeting: firstId,
    participants: attendeeList.map((p) => ({ key: p.key, member: p.id, memberModel: p.model, role: p.key === host.key ? "admin" : "member" })),
    participantKeys: attendeeList.map((p) => p.key),
    createdBy: actor.id,
    createdByModel: actor.model,
  });

  const attendees = attendeeList.map((p) => ({ key: p.key, person: p.id, personModel: p.model, rsvp: p.key === host.key ? "accepted" : "invited", respondedAt: p.key === host.key ? new Date() : null }));
  const docs = occ.map((o, i) => {
    const _id = i === 0 ? firstId : new mongoose.Types.ObjectId();
    return {
      _id,
      organisation_id: actor.organisation_id,
      title,
      description: String(b.description || "").trim().slice(0, 3000),
      agenda: String(b.agenda || "").trim().slice(0, 3000),
      host: actor.id, hostModel: actor.model, hostKey: host.key, coHostKeys,
      startTime: o.start, endTime: o.end, timezone: tz, media,
      attendees, attendeeKeys: attendeeList.map((p) => p.key),
      guests: guestPlan.entries.map((e) => e.doc), // same guestId + PIN for every session of a series
      audience,
      recurrence: { freq: b.recurrence?.freq && occ.length > 1 ? b.recurrence.freq : "none", interval: Math.min(Math.max(parseInt(b.recurrence?.interval, 10) || 1, 1), 12), until: occ.length > 1 ? occ[occ.length - 1].start : null },
      seriesId,
      conversation: conv._id,
      roomKey: rooms.meetingRoomKey(_id),
      allowJoinBeforeHost: !!b.allowJoinBeforeHost,
      visibility: b.visibility === "organisation" ? "organisation" : "invite_only",
      capacity: Math.min(Math.max(parseInt(b.capacity, 10) || 0, 0), 5000),
      settings: controls.normalizeSettings(b.settings),
      reminderMinutes: Math.min(Math.max(parseInt(b.reminderMinutes, 10) || 10, 0), 1440),
    };
  });
  const created = await Meeting.insertMany(docs);
  const first = created[0];

  const conflicts = await findConflicts(actor, attendeeList.map((p) => p.key), first.startTime, first.endTime, created.map((m) => m._id));

  const invitees = attendeeList.filter((p) => p.key !== host.key);
  const when = fmtWhen(first.startTime, tz);
  notify(actor, invitees.map((p) => p.key), first, {
    title: "Meeting invitation",
    message: `${host.name} invited you to "${title}" on ${when}${occ.length > 1 ? ` (repeats, ${occ.length} sessions)` : ""}.`,
    priority: "high",
  });
  if (b.sendEmail !== false) emailAttendees(first, host, invitees, "REQUEST", attendeeList);
  if (guestPlan.entries.length && b.sendEmail !== false) guestSvc.emailGuests(created, host, guestPlan.entries.map((e) => ({ guest: e.doc, pin: e.pin })));

  const people2 = new Map(attendeeList.map((p) => [p.key, p]));
  const resolvedConflicts = conflicts.filter((c) => c.key !== host.key || true).map((c) => ({ ...c, name: people2.get(c.key)?.name || "" }));
  ok(res, {
    meeting: shapeMeeting(first, actor, people2, { detail: false }),
    occurrences: created.length,
    conflicts: resolvedConflicts,
    guests: { invited: guestPlan.entries.map((e) => e.doc.email), skipped: guestPlan.skipped },
  }, 201);
};

// GET /meetings?from=&to=&status=scheduled,live&hosting=true&limit=100
const listMeetings = async (req, res) => {
  const actor = actorOf(req);
  const from = req.query.from ? parseDate(req.query.from, "from") : new Date(Date.now() - 24 * 3600 * 1000);
  const to = req.query.to ? parseDate(req.query.to, "to") : new Date(Date.now() + 60 * 24 * 3600 * 1000);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);

  const q = { organisation_id: actor.organisation_id, attendeeKeys: actor.key, startTime: { $lt: to }, endTime: { $gt: from } };
  const statuses = String(req.query.status || "").split(",").filter((s) => ["scheduled", "live", "ended", "cancelled"].includes(s));
  q.status = statuses.length ? { $in: statuses } : { $ne: "cancelled" };
  if (req.query.hosting === "true") q.hostKey = actor.key;

  const rows = await Meeting.find(q).sort({ startTime: 1 }).limit(limit);
  const people = await peopleFor(actor.organisation_id, rows);
  ok(res, { meetings: rows.map((m) => shapeMeeting(m, actor, people)) });
};

const dayKey = (date, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const calendar = async (req, res) => {
  const actor = actorOf(req);
  const tz = validTz(req.query.tz || DEFAULT_TZ);
  let from;
  let to;
  if (req.query.month && /^\d{4}-\d{2}$/.test(String(req.query.month))) {
    const [y, mo] = String(req.query.month).split("-").map(Number);
    from = new Date(Date.UTC(y, mo - 1, 1) - 14 * 3600 * 1000);
    to = new Date(Date.UTC(y, mo, 1) + 14 * 3600 * 1000);
  } else {
    from = req.query.from ? parseDate(req.query.from, "from") : new Date(Date.now() - 24 * 3600 * 1000);
    to = req.query.to ? parseDate(req.query.to, "to") : new Date(Date.now() + 35 * 24 * 3600 * 1000);
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 300, 1), 500);

  const q = { organisation_id: actor.organisation_id, attendeeKeys: actor.key, startTime: { $lt: to }, endTime: { $gt: from }, status: { $ne: "cancelled" } };
  if (req.query.hosting === "true") q.hostKey = actor.key;
  const rows = await Meeting.find(q).sort({ startTime: 1 }).limit(limit);
  const people = await peopleFor(actor.organisation_id, rows);

  const days = {};
  const meetings = rows.map((row) => {
    const shaped = shapeMeeting(row, actor, people);
    const startDay = dayKey(row.startTime, tz);
    const endDay = dayKey(new Date(row.endTime.getTime() - 1), tz);
    const keys = startDay === endDay ? [startDay] : [startDay, endDay];
    for (const k of keys) (days[k] = days[k] || []).push(shaped.id);
    return shaped;
  });
  const counts = Object.fromEntries(Object.entries(days).map(([k, v]) => [k, v.length]));
  ok(res, { timezone: tz, from, to, meetings, days, counts, liveNow: meetings.filter((x) => x.status === "live").map((x) => x.id) });
};

const getMeeting = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  ok(res, { meeting: await shapeOne(m, actor, true) });
};

// PATCH /meetings/:id  (host / co-host)
const updateMeeting = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  requireModerator(m, actor);
  if (["ended", "cancelled"].includes(m.status)) throw httpError(`A ${m.status} meeting cannot be edited.`);
  const b = req.body || {};

  const [host] = [...(await requirePeople(actor.organisation_id, [{ model: m.hostModel, id: m.host }])).values()];
  let timeChanged = false;
  let detailChanged = false;

  if (b.title !== undefined) {
    const t = String(b.title).trim();
    if (!t) throw httpError("Title cannot be empty.");
    if (t !== m.title) { m.title = t.slice(0, 150); detailChanged = true; }
  }
  if (b.description !== undefined) { m.description = String(b.description).trim().slice(0, 3000); detailChanged = true; }
  if (b.agenda !== undefined) { m.agenda = String(b.agenda).trim().slice(0, 3000); detailChanged = true; }
  if (b.media !== undefined) m.media = b.media === "audio" ? "audio" : "video";
  if (b.timezone !== undefined) m.timezone = validTz(b.timezone);
  if (b.allowJoinBeforeHost !== undefined) m.allowJoinBeforeHost = !!b.allowJoinBeforeHost;
  if (b.settings !== undefined) m.settings = controls.normalizeSettings(b.settings, controls.plainSettings(m.settings));
  if (b.reminderMinutes !== undefined) m.reminderMinutes = Math.min(Math.max(parseInt(b.reminderMinutes, 10) || 0, 0), 1440);

  if (b.startTime !== undefined || b.endTime !== undefined || b.durationMin !== undefined) {
    if (m.status !== "scheduled") throw httpError("You can only reschedule a meeting that hasn't started.");
    const s = b.startTime !== undefined ? parseDate(b.startTime, "startTime") : m.startTime;
    const e = b.endTime !== undefined ? parseDate(b.endTime, "endTime") : b.durationMin !== undefined ? new Date(s.getTime() + (parseInt(b.durationMin, 10) || 30) * 60000) : new Date(s.getTime() + (m.endTime - m.startTime));
    if (e <= s) throw httpError("End time must be after start time.");
    if (e - s > MAX_DURATION_MS) throw httpError("A meeting can be at most 12 hours long.");
    if (s.getTime() < Date.now() - 5 * 60000) throw httpError("Start time is in the past.");
    if (s.getTime() !== m.startTime.getTime() || e.getTime() !== m.endTime.getTime()) {
      m.startTime = s; m.endTime = e; timeChanged = true;
      m.reminderSentAt = null;
      m.attendees.forEach((a) => { a.reminderSent = false; if (a.key !== m.hostKey) { a.rsvp = "invited"; a.respondedAt = null; } });
    }
  }

  // attendees: replace the list, or add/remove individually
  let added = [];
  let removedKeys = [];
  if (b.attendees !== undefined || b.addAttendees !== undefined || b.removeAttendees !== undefined || b.audience !== undefined) {
    const keep = new Map(m.attendees.map((a) => [a.key, a]));
    let want = new Set(keep.keys());
    if (b.attendees !== undefined || b.audience !== undefined) {
      const r = await resolveAttendees(actor, { attendees: b.attendees || [], audience: b.audience || {} });
      want = new Set(r.people.keys());
      m.audience = r.audience;
      for (const [k, p] of r.people) if (!keep.has(k)) added.push(p);
    }
    if (Array.isArray(b.addAttendees) && b.addAttendees.length) {
      for (const p of (await requirePeople(actor.organisation_id, b.addAttendees)).values()) {
        if (!want.has(p.key) && !keep.has(p.key)) added.push(p);
        want.add(p.key);
      }
    }
    if (Array.isArray(b.removeAttendees)) for (const k of b.removeAttendees) want.delete(String(k));
    want.add(m.hostKey);

    removedKeys = [...keep.keys()].filter((k) => !want.has(k));
    for (const p of added) {
      m.attendees.push({ key: p.key, person: p.id, personModel: p.model, rsvp: "invited" });
    }
    m.attendees = m.attendees.filter((a) => want.has(a.key));
    m.coHostKeys = m.coHostKeys.filter((k) => want.has(k));
    if (m.attendees.length > MAX_ATTENDEES) throw httpError(`A meeting can have at most ${MAX_ATTENDEES} attendees.`);
    if (m.attendees.length < 2) throw httpError("A meeting needs at least one other person.");
  }
  if (Array.isArray(b.coHosts)) {
    const keys = new Set(m.attendees.map((a) => a.key));
    const next = [...new Set(b.coHosts.map(String))].filter((k) => k !== m.hostKey);
    if (next.some((k) => !keys.has(k))) throw httpError("Co-hosts must be among the invited people.");
    m.coHostKeys = next;
  }

  m.attendeeKeys = m.attendees.map((a) => a.key);
  if (timeChanged || detailChanged) m.sequence += 1;
  await m.save();

  // chat membership follows the invite list
  if (added.length || removedKeys.length) {
    await chat.syncMeetingConversation(m.conversation, actor.organisation_id, m.attendees.map((a) => ({ model: a.personModel, id: a.person })), m.hostKey);
  }

  const existingKeys = m.attendeeKeys.filter((k) => k !== host.key && !added.some((p) => p.key === k));
  const everyone = await resolvePeople(actor.organisation_id, m.attendees.map((a) => ({ model: a.personModel, id: a.person })));
  if (added.length) {
    notify(actor, added.map((p) => p.key), m, { title: "Meeting invitation", message: `${host.name} invited you to "${m.title}" on ${fmtWhen(m.startTime, m.timezone)}.`, priority: "high" });
    if (b.sendEmail !== false) emailAttendees(m, host, added, "REQUEST", [...everyone.values()]);
  }
  if (removedKeys.length) {
    notify(actor, removedKeys, m, { title: "Removed from meeting", message: `You were removed from "${m.title}".` });
    const gone = await resolvePeople(actor.organisation_id, removedKeys.map(parseKey));
    if (b.sendEmail !== false) emailAttendees(m, host, [...gone.values()], "CANCEL", [...everyone.values()]);
  }
  if (timeChanged || detailChanged) {
    notify(actor, existingKeys, m, {
      title: timeChanged ? "Meeting rescheduled" : "Meeting updated",
      message: timeChanged ? `"${m.title}" moved to ${fmtWhen(m.startTime, m.timezone)}. Please respond again.` : `"${m.title}" was updated.`,
      priority: timeChanged ? "high" : "medium",
    });
    if (b.sendEmail !== false) emailAttendees(m, host, existingKeys.map((k) => everyone.get(k)).filter(Boolean), "UPDATE", [...everyone.values()]);
    if (b.sendEmail !== false) guestSvc.notifyGuestsOfChange(m, actor, "REQUEST", true).catch(() => {});
  }

  ok(res, { meeting: await shapeOne(m, actor, true) });
};

// POST /meetings/:id/respond  { rsvp: "accepted" | "declined" | "tentative" }
const respond = async (req, res) => {
  const actor = actorOf(req);
  const rsvp = req.body?.rsvp;
  if (!["accepted", "declined", "tentative"].includes(rsvp)) throw httpError("rsvp must be accepted, declined or tentative.");
  const m = await loadMeeting(actor, req.params.id);
  if (m.hostKey === actor.key) throw httpError("You are the host of this meeting.");
  if (["ended", "cancelled"].includes(m.status)) throw httpError(`This meeting is ${m.status}.`);

  await Meeting.updateOne({ _id: m._id, "attendees.key": actor.key }, { $set: { "attendees.$.rsvp": rsvp, "attendees.$.respondedAt": new Date() } });
  chat.emitToKeys([m.hostKey, ...m.coHostKeys, actor.key], "meeting:rsvp", { meetingId: String(m._id), key: actor.key, rsvp });
  ok(res, { rsvp });
};

// DELETE /meetings/:id?scope=this|series   body/query: reason
const cancelMeeting = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  requireModerator(m, actor);
  if (m.status === "cancelled") throw httpError("This meeting is already cancelled.");
  if (m.status === "ended") throw httpError("An ended meeting cannot be cancelled.");
  const reason = String(req.body?.reason || req.query.reason || "").trim().slice(0, 300);
  const series = req.query.scope === "series" && m.seriesId;

  const targets = series
    ? await Meeting.find({ organisation_id: actor.organisation_id, seriesId: m.seriesId, startTime: { $gte: m.startTime }, status: { $in: ["scheduled", "live"] } })
    : [m];

  for (const t of targets) {
    await calls.forceEndMeetingRoom(t._id, "host_ended");
    t.status = "cancelled";
    t.cancelReason = reason;
    t.sequence += 1;
    await t.save();
  }

  const [host] = [...(await requirePeople(actor.organisation_id, [{ model: m.hostModel, id: m.host }])).values()];
  const everyone = await resolvePeople(actor.organisation_id, m.attendees.map((a) => ({ model: a.personModel, id: a.person })));
  const others = m.attendeeKeys.filter((k) => k !== actor.key);
  notify(actor, others, m, {
    title: "Meeting cancelled",
    message: `"${m.title}" on ${fmtWhen(m.startTime, m.timezone)} was cancelled${series ? " (all upcoming sessions)" : ""}${reason ? `: ${reason}` : "."}`,
    priority: "high",
  });
  if (req.body?.sendEmail !== false) emailAttendees(m, host, others.map((k) => everyone.get(k)).filter(Boolean), "CANCEL", [...everyone.values()]);
  if (req.body?.sendEmail !== false) for (const t of targets) guestSvc.notifyGuestsOfChange(t, actor, "CANCEL").catch(() => {});
  ok(res, { cancelled: targets.length });
};

// POST /meetings/:id/end  -> host ends a live meeting for everyone
const endMeeting = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  requireModerator(m, actor);
  if (m.status !== "live") throw httpError("This meeting is not live.");
  const room = rooms.get(m.roomKey);
  if (room) await calls.forceEndMeetingRoom(m._id, "host_ended");
  else await Meeting.updateOne({ _id: m._id }, { $set: { status: "ended", endedAt: new Date() } });
  ok(res, { message: "Meeting ended." });
};

// GET /meetings/:id/join-info  -> can I join right now, and with which ICE servers?
const joinInfo = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  const running = !!rooms.get(m.roomKey);
  try {
    await calls.authorizeMeeting(actor, m._id, { roomRunning: running });
    ok(res, { canJoin: true, running, roomKey: m.roomKey, media: m.media, conversationId: String(m.conversation), iceServers: getIceServers(actor.key) });
  } catch (err) {
    if (!err.code) throw err;
    ok(res, { canJoin: false, running, code: err.code, message: err.message, startsAt: err.startsAt || m.startTime, roomKey: m.roomKey });
  }
};

// GET /meetings/:id/ics
const downloadIcs = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  const everyone = await resolvePeople(actor.organisation_id, m.attendees.map((a) => ({ model: a.personModel, id: a.person })));
  const host = everyone.get(m.hostKey);
  const ics = buildIcs(
    { id: String(m._id), title: m.title, description: m.description, agenda: m.agenda, startTime: m.startTime, endTime: m.endTime, sequence: m.sequence },
    {
      method: m.status === "cancelled" ? "CANCEL" : "REQUEST",
      organizer: host ? { name: host.name, email: host.email } : undefined,
      attendees: m.attendees.map((a) => ({ name: everyone.get(a.key)?.name, email: everyone.get(a.key)?.email, rsvp: a.rsvp })),
      url: joinUrl(m._id),
    }
  );
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="meeting-${m._id}.ics"`);
  res.status(200).send(ics);
};

// POST /meetings/availability  { people: [{model,id}], startTime, endTime, excludeMeetingId? }
const availability = async (req, res) => {
  const actor = actorOf(req);
  const b = req.body || {};
  const start = parseDate(b.startTime, "startTime");
  const end = parseDate(b.endTime, "endTime");
  if (end <= start) throw httpError("End time must be after start time.");

  const { people } = await resolveAttendees(actor, { attendees: b.people || [], audience: b.audience || {} });
  people.set(actor.key, people.get(actor.key) || [...(await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }])).values()][0]);
  const exclude = b.excludeMeetingId && mongoose.isValidObjectId(b.excludeMeetingId) ? [b.excludeMeetingId] : [];
  const busy = await findConflicts(actor, [...people.keys()], start, end, exclude);
  ok(res, {
    checked: people.size,
    busy: busy.map((c) => ({ ...c, name: people.get(c.key)?.name || "" })),
    freeCount: people.size - new Set(busy.map((c) => c.key)).size,
  });
};

module.exports = {
  helpers: { notify, emailAttendees, shapeMeeting, peopleFor, joinUrl, fmtWhen, escapeHtml, validTz, isModerator, loadMeeting },
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  respond,
  cancelMeeting,
  endMeeting,
  joinInfo,
  downloadIcs,
  availability,
  calendar,
};
