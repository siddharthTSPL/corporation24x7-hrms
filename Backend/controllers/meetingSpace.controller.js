const Meeting = require("../Models/meeting.model");
const CallSession = require("../Models/callsession.model");
const chat = require("../utils/chat/chat.service");
const meetingCtrl = require("./meeting.controller");
const u = require("../utils/chat/meetingSpace.utils");
const { httpError, parseKey, requirePeople, resolvePeople, escapeRegex } = require("../utils/chat/people.utils");

const { helpers } = meetingCtrl;
const MAX_INTERESTED = 2000;
const MAX_ATTENDEES = 500;
const MILESTONES = new Set([1, 5, 10, 25, 50, 100, 250, 500, 1000]);
const NUDGE_COOLDOWN_MS = 60 * 60 * 1000;

const spotsLeft = (m) => (m.capacity ? Math.max(m.capacity - m.attendees.length, 0) : null);

const publicView = (m, actor, people, isAttendee) => ({
  id: String(m._id),
  title: m.title,
  description: m.description,
  agenda: m.agenda,
  host: u.mini(people, m.hostKey),
  startTime: m.startTime,
  endTime: m.endTime,
  timezone: m.timezone,
  media: m.media,
  status: m.status,
  visibility: m.visibility,
  capacity: m.capacity,
  spotsLeft: spotsLeft(m),
  attendeeCount: m.attendees.length,
  interestedCount: m.interestedKeys.length,
  isAttendee,
  isHost: m.hostKey === actor.key,
  isCoHost: m.coHostKeys.includes(actor.key),
  myInterest: m.interestedKeys.includes(actor.key),
  myRsvp: isAttendee ? (m.attendees.find((a) => a.key === actor.key) || {}).rsvp || null : null,
  seriesId: m.seriesId || null,
});

const discover = async (req, res) => {
  const actor = u.actorOf(req);
  const now = new Date();
  const from = req.query.from ? new Date(req.query.from) : now;
  const to = req.query.to ? new Date(req.query.to) : new Date(now.getTime() + 60 * 24 * 3600 * 1000);
  if (isNaN(from) || isNaN(to)) throw httpError("from and to must be valid dates.");
  const limit = u.clampInt(req.query.limit, 1, 100, 30);

  const q = {
    organisation_id: actor.organisation_id,
    visibility: "organisation",
    status: { $in: ["scheduled", "live"] },
    startTime: { $lt: to },
    endTime: { $gt: from > now ? from : now },
    attendeeKeys: { $ne: actor.key },
  };
  const search = String(req.query.q || "").trim().slice(0, 80);
  if (search) q.title = new RegExp(escapeRegex(search), "i");
  if (req.query.interested === "true") q.interestedKeys = actor.key;

  const rows = await Meeting.find(q).sort({ startTime: 1 }).limit(limit);
  const people = await resolvePeople(actor.organisation_id, rows.map((m) => ({ model: m.hostModel, id: m.host })));
  u.ok(res, { meetings: rows.map((m) => publicView(m, actor, people, false)) });
};

const getSpace = async (req, res) => {
  const actor = u.actorOf(req);
  const { m, isAttendee } = await u.loadReachableMeeting(actor, req.params.id);
  const people = await resolvePeople(actor.organisation_id, [{ model: m.hostModel, id: m.host }]);
  u.ok(res, { meeting: publicView(m, actor, people, isAttendee) });
};

const updateSpace = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  if (["ended", "cancelled"].includes(m.status)) throw httpError(`A ${m.status} meeting cannot be edited.`);
  const b = req.body || {};
  const set = {};

  if (b.visibility !== undefined) {
    if (!["invite_only", "organisation"].includes(b.visibility)) throw httpError("visibility must be invite_only or organisation.");
    set.visibility = b.visibility;
  }
  if (b.capacity !== undefined) {
    const cap = u.clampInt(b.capacity, 0, 5000, 0);
    if (cap > 0 && cap < m.attendees.length) throw httpError(`Capacity cannot be lower than the ${m.attendees.length} people already invited.`);
    set.capacity = cap;
  }
  if (!Object.keys(set).length) throw httpError("Nothing to update.");

  const filter = b.scope === "series" && m.seriesId
    ? { organisation_id: actor.organisation_id, seriesId: m.seriesId, hostKey: m.hostKey, status: "scheduled", startTime: { $gte: m.startTime } }
    : { _id: m._id };
  const result = await Meeting.updateMany(filter, { $set: set });
  u.ok(res, { updated: result.modifiedCount, ...set });
};

const setInterest = async (req, res) => {
  const actor = u.actorOf(req);
  const { m, isAttendee } = await u.loadReachableMeeting(actor, req.params.id);
  if (isAttendee) throw httpError("You are already invited to this meeting. Use RSVP instead.");
  if (m.visibility !== "organisation") throw httpError("Meeting not found.", 404);
  if (!["scheduled", "live"].includes(m.status)) throw httpError(`This meeting is ${m.status}.`);

  const want = req.body?.interested !== false;
  let changed = false;

  if (want) {
    if (m.interestedKeys.length >= MAX_INTERESTED) throw httpError("This meeting has reached its interest limit.");
    const [me] = [...(await requirePeople(actor.organisation_id, [{ model: actor.model, id: actor.id }])).values()];
    const note = String(req.body?.note || "").trim().slice(0, 200);
    const r = await Meeting.updateOne(
      { _id: m._id, interestedKeys: { $ne: actor.key } },
      { $push: { interested: { key: me.key, person: me.id, personModel: me.model, note, at: new Date() } }, $addToSet: { interestedKeys: me.key } }
    );
    changed = r.modifiedCount > 0;
  } else {
    const r = await Meeting.updateOne({ _id: m._id, interestedKeys: actor.key }, { $pull: { interested: { key: actor.key }, interestedKeys: actor.key } });
    changed = r.modifiedCount > 0;
  }

  const fresh = await Meeting.findById(m._id).select("interestedKeys hostKey coHostKeys title").lean();
  const count = fresh ? fresh.interestedKeys.length : 0;

  if (changed && fresh) {
    const moderators = [fresh.hostKey, ...fresh.coHostKeys];
    u.emitToKeysOnly(moderators, "meeting:interest", { meetingId: String(m._id), key: actor.key, interested: want, count });
    if (want && MILESTONES.has(count)) {
      u.notifyKeys(actor, moderators, m, {
        title: "Interest in your meeting",
        message: `${count} ${count === 1 ? "person is" : "people are"} interested in "${m.title}".`,
      });
    }
  }
  u.ok(res, { interested: want, interestedCount: count });
};

const listInterested = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  const people = await resolvePeople(actor.organisation_id, m.interested.map((i) => ({ model: i.personModel, id: i.person })));
  const interested = m.interested
    .map((i) => ({ ...u.person(people, i.key), note: i.note || "", at: i.at }))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  u.ok(res, { interested, count: interested.length, capacity: m.capacity, spotsLeft: spotsLeft(m) });
};

const promoteInterested = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  if (!["scheduled", "live"].includes(m.status)) throw httpError(`A ${m.status} meeting cannot be edited.`);

  const keys = new Set(Array.isArray(req.body?.keys) ? req.body.keys.map(String) : []);
  const all = req.body?.all === true;
  const targets = m.interested.filter((i) => all || keys.has(i.key));
  if (!targets.length) throw httpError("Choose at least one interested person.");

  const left = spotsLeft(m);
  if (left !== null && targets.length > left) throw httpError(`Only ${left} spot${left === 1 ? "" : "s"} left in this meeting.`);
  if (m.attendees.length + targets.length > MAX_ATTENDEES) throw httpError(`A meeting can have at most ${MAX_ATTENDEES} attendees.`);

  const picked = new Set(targets.map((t) => t.key));
  for (const t of targets) m.attendees.push({ key: t.key, person: t.person, personModel: t.personModel, rsvp: "accepted", respondedAt: new Date() });
  m.attendeeKeys = m.attendees.map((a) => a.key);
  m.interested = m.interested.filter((i) => !picked.has(i.key));
  m.interestedKeys = m.interested.map((i) => i.key);
  await m.save();

  await chat.syncMeetingConversation(m.conversation, actor.organisation_id, m.attendees.map((a) => ({ model: a.personModel, id: a.person })), m.hostKey);

  const everyone = await resolvePeople(actor.organisation_id, m.attendees.map((a) => ({ model: a.personModel, id: a.person })));
  const [host] = [...(await requirePeople(actor.organisation_id, [{ model: m.hostModel, id: m.host }])).values()];
  const added = [...picked].map((k) => everyone.get(k)).filter(Boolean);

  u.notifyKeys(actor, [...picked], m, {
    title: "You're confirmed for a meeting",
    message: `${host.name} confirmed your spot in "${m.title}" on ${u.fmtWhen(m.startTime, m.timezone)}.`,
    priority: "high",
    event: "meeting:updated",
    payload: { reason: "promoted" },
  });
  if (req.body?.sendEmail !== false) helpers.emailAttendees(m, host, added, "REQUEST", [...everyone.values()]);

  u.ok(res, { promoted: picked.size, attendeeCount: m.attendees.length, interestedCount: m.interestedKeys.length, spotsLeft: spotsLeft(m) });
};

const nudge = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  if (m.status !== "scheduled") throw httpError("You can only remind people about a meeting that hasn't started.");

  const cutoff = new Date(Date.now() - NUDGE_COOLDOWN_MS);
  const claimed = await Meeting.findOneAndUpdate(
    { _id: m._id, $or: [{ lastNudgeAt: null }, { lastNudgeAt: { $lt: cutoff } }] },
    { $set: { lastNudgeAt: new Date() } },
    { new: true }
  );
  if (!claimed) throw httpError("You already sent a reminder in the last hour.", 429);

  const pending = m.attendees.filter((a) => a.rsvp === "invited" && a.key !== m.hostKey).map((a) => a.key);
  if (!pending.length) {
    await Meeting.updateOne({ _id: m._id }, { $set: { lastNudgeAt: m.lastNudgeAt || null } });
    return u.ok(res, { nudged: 0 });
  }

  const [host] = [...(await requirePeople(actor.organisation_id, [{ model: m.hostModel, id: m.host }])).values()];
  u.notifyKeys(actor, pending, m, {
    title: "Please respond to the invite",
    message: `${host.name} is waiting for your response to "${m.title}" on ${u.fmtWhen(m.startTime, m.timezone)}.`,
    priority: "high",
    event: "meeting:updated",
    payload: { reason: "nudge" },
  });

  if (req.body?.sendEmail === true) {
    const people = await resolvePeople(actor.organisation_id, pending.map(parseKey));
    const url = u.meetingUrl(m._id);
    u.sendInBatches([...people.values()].filter((p) => p.email), (p) =>
      u.sendMail(
        p.email,
        `Reminder: please respond to "${m.title}"`,
        u.brandedEmail({
          heading: m.title,
          intro: `${u.escapeHtml(host.name)} is waiting for your response.`,
          bodyHtml: `<p><b>When:</b> ${u.escapeHtml(u.fmtWhen(m.startTime, m.timezone))} (${u.escapeHtml(m.timezone)})</p>`,
          ctaUrl: url,
          ctaLabel: "Respond",
        })
      )
    );
  }
  u.ok(res, { nudged: pending.length });
};

const instant = async (req, res) => {
  const b = req.body || {};
  req.body = {
    ...b,
    title: String(b.title || "").trim() || "Instant meeting",
    startTime: new Date().toISOString(),
    endTime: undefined,
    durationMin: u.clampInt(b.durationMin, 5, 240, 30),
    allowJoinBeforeHost: true,
    recurrence: undefined,
  };
  return meetingCtrl.createMeeting(req, res);
};

const partsIn = (date, tz) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday").value;
  const hour = parseInt(parts.find((p) => p.type === "hour").value, 10) % 24;
  return { weekday, hour };
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const insights = async (req, res) => {
  const actor = u.actorOf(req);
  const tz = u.validTz(req.query.tz || "Asia/Kolkata");
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  if (isNaN(from) || isNaN(to) || to <= from) throw httpError("from and to must be valid dates with from before to.");
  if (to - from > 366 * 24 * 3600 * 1000) throw httpError("Choose a range of at most one year.");

  const rows = await Meeting.find({
    organisation_id: actor.organisation_id,
    attendeeKeys: actor.key,
    status: { $ne: "cancelled" },
    startTime: { $gte: from, $lt: to },
  })
    .select("title startTime endTime status hostKey attendees.key attendees.rsvp seriesId media")
    .limit(1000)
    .lean();

  const ids = rows.map((r) => r._id);
  const sessions = ids.length
    ? await CallSession.find({ organisation_id: actor.organisation_id, meeting: { $in: ids }, "participants.key": actor.key }).select("meeting participants").lean()
    : [];

  const joinedMeetingIds = new Set();
  let secondsInMeetings = 0;
  for (const s of sessions) {
    for (const p of s.participants || []) {
      if (p.key !== actor.key || !p.joinedAt) continue;
      joinedMeetingIds.add(String(s.meeting));
      const left = p.leftAt ? new Date(p.leftAt) : new Date();
      secondsInMeetings += Math.max(0, Math.round((left - new Date(p.joinedAt)) / 1000));
    }
  }

  const byWeekday = Object.fromEntries(WEEKDAYS.map((d) => [d, 0]));
  const byHour = Array.from({ length: 24 }, () => 0);
  const rsvp = { accepted: 0, declined: 0, tentative: 0, invited: 0 };
  let hosted = 0;
  let scheduledMinutes = 0;
  let recurring = 0;
  let audio = 0;
  let upcoming = 0;
  const now = Date.now();

  for (const r of rows) {
    const mine = r.attendees.find((a) => a.key === actor.key);
    if (r.hostKey === actor.key) hosted += 1;
    else if (mine) rsvp[mine.rsvp] = (rsvp[mine.rsvp] || 0) + 1;
    scheduledMinutes += Math.max(0, Math.round((new Date(r.endTime) - new Date(r.startTime)) / 60000));
    if (r.seriesId) recurring += 1;
    if (r.media === "audio") audio += 1;
    if (new Date(r.startTime).getTime() > now) upcoming += 1;
    const { weekday, hour } = partsIn(new Date(r.startTime), tz);
    byWeekday[weekday] = (byWeekday[weekday] || 0) + 1;
    byHour[hour] += 1;
  }

  const busiestHour = byHour.reduce((best, n, h) => (n > byHour[best] ? h : best), 0);
  const busiestDay = Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0];
  const endedCount = rows.filter((r) => r.status === "ended").length;

  u.ok(res, {
    range: { from, to },
    timezone: tz,
    totals: {
      meetings: rows.length,
      hosted,
      invitedTo: rows.length - hosted,
      upcoming,
      ended: endedCount,
      attended: joinedMeetingIds.size,
      recurring,
      audioOnly: audio,
      scheduledHours: Math.round((scheduledMinutes / 60) * 10) / 10,
      hoursInMeetings: Math.round((secondsInMeetings / 3600) * 10) / 10,
      averageMinutes: rows.length ? Math.round(scheduledMinutes / rows.length) : 0,
      attendanceRate: endedCount ? Math.round((rows.filter((r) => r.status === "ended" && joinedMeetingIds.has(String(r._id))).length / endedCount) * 100) : 0,
    },
    rsvp,
    byWeekday,
    byHour,
    busiest: { weekday: rows.length ? busiestDay[0] : null, hour: rows.length ? busiestHour : null },
  });
};

module.exports = {
  discover,
  getSpace,
  updateSpace,
  setInterest,
  listInterested,
  promoteInterested,
  nudge,
  instant,
  insights,
};
