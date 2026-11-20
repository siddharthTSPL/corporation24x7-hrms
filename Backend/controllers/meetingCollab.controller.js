const mongoose = require("mongoose");
const Meeting = require("../Models/meeting.model");
const MeetingNote = require("../Models/meetingnote.model");
const MeetingActionItem = require("../Models/meetingactionitem.model");
const MeetingPoll = require("../Models/meetingpoll.model");
const MeetingFeedback = require("../Models/meetingfeedback.model");
const u = require("../utils/chat/meetingSpace.utils");
const { httpError, parseKey, requirePeople, resolvePeople } = require("../utils/chat/people.utils");

const MAX_ACTION_ITEMS = 200;
const MAX_POLLS = 30;
const FEEDBACK_TAGS = ["well_organised", "too_long", "no_agenda", "could_be_email", "productive", "unclear_outcome"];

const objectId = (id, label) => {
  if (!mongoose.isValidObjectId(id)) throw httpError(`${label} not found.`, 404);
  return id;
};

const noteView = (n, people) => ({
  content: n.content,
  decisions: n.decisions,
  published: n.published,
  publishedAt: n.publishedAt,
  sharedAt: n.sharedAt,
  version: n.version,
  updatedAt: n.updatedAt,
  updatedBy: n.updatedByKey ? u.mini(people, n.updatedByKey) : null,
});

const getNotes = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const moderator = u.isModerator(m, actor.key);
  const n = await MeetingNote.findOne({ meeting: m._id, organisation_id: actor.organisation_id });
  if (!n || (!moderator && !n.published)) return u.ok(res, { note: null, canEdit: moderator });
  const people = await resolvePeople(actor.organisation_id, n.updatedByKey ? [parseKey(n.updatedByKey)] : []);
  u.ok(res, { note: noteView(n, people), canEdit: moderator });
};

const saveNotes = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  if (m.status === "cancelled") throw httpError("A cancelled meeting cannot have notes.");
  const b = req.body || {};

  const content = b.content === undefined ? undefined : String(b.content).slice(0, 20000);
  const decisions = b.decisions === undefined
    ? undefined
    : (Array.isArray(b.decisions) ? b.decisions : []).map((d) => String(d).trim().slice(0, 300)).filter(Boolean).slice(0, 30);
  if (content === undefined && decisions === undefined && b.published === undefined) throw httpError("Nothing to save.");

  let n = await MeetingNote.findOne({ meeting: m._id, organisation_id: actor.organisation_id });
  if (n && b.version !== undefined && Number(b.version) !== n.version) {
    throw Object.assign(httpError("Someone else changed these notes. Reload to see the latest version.", 409), { currentVersion: n.version });
  }
  const wasPublished = !!(n && n.published);
  if (!n) n = new MeetingNote({ organisation_id: actor.organisation_id, meeting: m._id });
  else n.version += 1;

  if (content !== undefined) n.content = content;
  if (decisions !== undefined) n.decisions = decisions;
  if (b.published !== undefined) {
    n.published = !!b.published;
    if (n.published && !wasPublished) n.publishedAt = new Date();
  }
  n.updatedByKey = actor.key;
  await n.save();

  if (n.published && !wasPublished) {
    u.notifyKeys(actor, m.attendees.filter((a) => a.rsvp !== "declined").map((a) => a.key), m, {
      title: "Meeting notes published",
      message: `Notes for "${m.title}" are now available.`,
      event: "meeting:notes",
      payload: { reason: "published" },
    });
  } else if (n.published) {
    u.emitToKeysOnly(m.attendeeKeys.filter((k) => k !== actor.key), "meeting:notes", { meetingId: String(m._id), reason: "updated", version: n.version });
  }
  const people = await resolvePeople(actor.organisation_id, [parseKey(actor.key)]);
  u.ok(res, { note: noteView(n, people) });
};

const actionItemView = (i, people, meetings) => ({
  id: String(i._id),
  meetingId: String(i.meeting),
  meeting: meetings ? meetings.get(String(i.meeting)) || null : undefined,
  title: i.title,
  details: i.details,
  assignee: u.mini(people, i.assigneeKey),
  createdBy: u.mini(people, i.createdByKey),
  dueDate: i.dueDate,
  overdue: i.status === "open" && !!i.dueDate && new Date(i.dueDate).getTime() < Date.now(),
  priority: i.priority,
  status: i.status,
  completedAt: i.completedAt,
  completedBy: i.completedByKey ? u.mini(people, i.completedByKey) : null,
  createdAt: i.createdAt,
});

const peopleForItems = (organisation_id, items) => {
  const keys = new Set();
  for (const i of items) [i.assigneeKey, i.createdByKey, i.completedByKey].filter(Boolean).forEach((k) => keys.add(k));
  return resolvePeople(organisation_id, [...keys].map(parseKey));
};

const listActionItems = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const q = { meeting: m._id, organisation_id: actor.organisation_id };
  if (["open", "done"].includes(req.query.status)) q.status = req.query.status;
  if (req.query.assignee) q.assigneeKey = String(req.query.assignee);
  const items = await MeetingActionItem.find(q).sort({ status: -1, dueDate: 1, createdAt: -1 }).limit(MAX_ACTION_ITEMS);
  const people = await peopleForItems(actor.organisation_id, items);
  u.ok(res, { actionItems: items.map((i) => actionItemView(i, people)) });
};

const createActionItem = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const b = req.body || {};
  const title = String(b.title || "").trim();
  if (!title) throw httpError("Action item title is required.");
  const assigneeKey = String(b.assigneeKey || actor.key);
  if (!m.attendeeKeys.includes(assigneeKey)) throw httpError("Assign action items to people invited to this meeting.");
  if (assigneeKey !== actor.key && !u.isModerator(m, actor.key)) throw httpError("Only the host or a co-host can assign action items to others.", 403);
  if (["cancelled"].includes(m.status)) throw httpError("A cancelled meeting cannot have action items.");
  if ((await MeetingActionItem.countDocuments({ meeting: m._id })) >= MAX_ACTION_ITEMS) throw httpError(`A meeting can have at most ${MAX_ACTION_ITEMS} action items.`);

  const item = await MeetingActionItem.create({
    organisation_id: actor.organisation_id,
    meeting: m._id,
    title: title.slice(0, 200),
    details: String(b.details || "").trim().slice(0, 1000),
    assigneeKey,
    createdByKey: actor.key,
    dueDate: u.parseDateOrNull(b.dueDate, "dueDate"),
    priority: ["low", "medium", "high"].includes(b.priority) ? b.priority : "medium",
  });

  u.notifyKeys(actor, [assigneeKey], m, {
    title: "New action item",
    message: `"${item.title}" from "${m.title}" was assigned to you${item.dueDate ? `, due ${u.fmtWhen(item.dueDate, m.timezone)}` : ""}.`,
    priority: item.priority === "high" ? "high" : "medium",
    event: "meeting:action-item",
    payload: { actionItemId: String(item._id), reason: "assigned" },
  });
  const people = await peopleForItems(actor.organisation_id, [item]);
  u.ok(res, { actionItem: actionItemView(item, people) }, 201);
};

const updateActionItem = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const item = await MeetingActionItem.findOne({ _id: objectId(req.params.itemId, "Action item"), meeting: m._id, organisation_id: actor.organisation_id });
  if (!item) throw httpError("Action item not found.", 404);

  const moderator = u.isModerator(m, actor.key);
  const owner = item.createdByKey === actor.key;
  const assignee = item.assigneeKey === actor.key;
  const b = req.body || {};
  const editsFields = ["title", "details", "assigneeKey", "dueDate", "priority"].some((k) => b[k] !== undefined);
  if (editsFields && !moderator && !owner) throw httpError("Only the host, a co-host or the creator can edit this action item.", 403);
  if (b.status !== undefined && !moderator && !owner && !assignee) throw httpError("You can't change this action item's status.", 403);

  let reassigned = false;
  if (b.title !== undefined) {
    const t = String(b.title).trim();
    if (!t) throw httpError("Action item title cannot be empty.");
    item.title = t.slice(0, 200);
  }
  if (b.details !== undefined) item.details = String(b.details).trim().slice(0, 1000);
  if (b.priority !== undefined) {
    if (!["low", "medium", "high"].includes(b.priority)) throw httpError("priority must be low, medium or high.");
    item.priority = b.priority;
  }
  if (b.dueDate !== undefined) {
    item.dueDate = u.parseDateOrNull(b.dueDate, "dueDate");
    item.dueReminderSentAt = null;
  }
  if (b.assigneeKey !== undefined && String(b.assigneeKey) !== item.assigneeKey) {
    if (!m.attendeeKeys.includes(String(b.assigneeKey))) throw httpError("Assign action items to people invited to this meeting.");
    item.assigneeKey = String(b.assigneeKey);
    item.dueReminderSentAt = null;
    reassigned = true;
  }
  if (b.status !== undefined) {
    if (!["open", "done"].includes(b.status)) throw httpError("status must be open or done.");
    if (b.status !== item.status) {
      item.status = b.status;
      item.completedAt = b.status === "done" ? new Date() : null;
      item.completedByKey = b.status === "done" ? actor.key : "";
    }
  }
  await item.save();

  if (reassigned) {
    u.notifyKeys(actor, [item.assigneeKey], m, {
      title: "Action item assigned to you",
      message: `"${item.title}" from "${m.title}" is now yours.`,
      event: "meeting:action-item",
      payload: { actionItemId: String(item._id), reason: "assigned" },
    });
  }
  if (item.status === "done" && item.createdByKey !== actor.key) {
    u.notifyKeys(actor, [item.createdByKey], m, {
      title: "Action item completed",
      message: `"${item.title}" from "${m.title}" was marked done.`,
      priority: "low",
      event: "meeting:action-item",
      payload: { actionItemId: String(item._id), reason: "done" },
    });
  }
  const people = await peopleForItems(actor.organisation_id, [item]);
  u.ok(res, { actionItem: actionItemView(item, people) });
};

const deleteActionItem = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const item = await MeetingActionItem.findOne({ _id: objectId(req.params.itemId, "Action item"), meeting: m._id, organisation_id: actor.organisation_id });
  if (!item) throw httpError("Action item not found.", 404);
  if (!u.isModerator(m, actor.key) && item.createdByKey !== actor.key) throw httpError("Only the host, a co-host or the creator can delete this action item.", 403);
  await item.deleteOne();
  u.ok(res, { deleted: true });
};

const myActionItems = async (req, res) => {
  const actor = u.actorOf(req);
  const q = { organisation_id: actor.organisation_id, assigneeKey: actor.key };
  const status = req.query.status === "done" ? "done" : req.query.status === "all" ? null : "open";
  if (status) q.status = status;
  if (req.query.overdue === "true") {
    q.status = "open";
    q.dueDate = { $lt: new Date() };
  }
  const limit = u.clampInt(req.query.limit, 1, 200, 100);
  const items = await MeetingActionItem.find(q).sort({ dueDate: 1, createdAt: -1 }).limit(limit);
  const meetingDocs = await Meeting.find({ _id: { $in: [...new Set(items.map((i) => String(i.meeting)))] }, organisation_id: actor.organisation_id }).select("title startTime status").lean();
  const meetings = new Map(meetingDocs.map((m) => [String(m._id), { id: String(m._id), title: m.title, startTime: m.startTime, status: m.status }]));
  const people = await peopleForItems(actor.organisation_id, items);
  const now = Date.now();
  u.ok(res, {
    actionItems: items.map((i) => actionItemView(i, people, meetings)),
    summary: {
      open: items.filter((i) => i.status === "open").length,
      overdue: items.filter((i) => i.status === "open" && i.dueDate && new Date(i.dueDate).getTime() < now).length,
    },
  });
};

const pollStatus = (p) => (p.status === "closed" || (p.closesAt && new Date(p.closesAt).getTime() <= Date.now()) ? "closed" : "open");

const pollView = (p, actor, people, moderator) => {
  const voters = new Set(p.options.flatMap((o) => o.voterKeys));
  const showNames = moderator && !p.anonymous;
  return {
    id: String(p._id),
    meetingId: String(p.meeting),
    question: p.question,
    multiple: p.multiple,
    anonymous: p.anonymous,
    status: pollStatus(p),
    closesAt: p.closesAt,
    createdAt: p.createdAt,
    createdBy: u.mini(people, p.createdByKey),
    totalVoters: voters.size,
    myVotes: p.options.filter((o) => o.voterKeys.includes(actor.key)).map((o) => String(o._id)),
    options: p.options.map((o) => ({
      id: String(o._id),
      text: o.text,
      votes: o.voterKeys.length,
      percent: voters.size ? Math.round((o.voterKeys.length / voters.size) * 100) : 0,
      voters: showNames ? o.voterKeys.map((k) => u.mini(people, k)) : undefined,
    })),
  };
};

const pollPeople = (organisation_id, polls, moderator) => {
  const keys = new Set();
  for (const p of polls) {
    keys.add(p.createdByKey);
    if (moderator && !p.anonymous) p.options.forEach((o) => o.voterKeys.forEach((k) => keys.add(k)));
  }
  return resolvePeople(organisation_id, [...keys].map(parseKey));
};

const listPolls = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const moderator = u.isModerator(m, actor.key);
  const polls = await MeetingPoll.find({ meeting: m._id, organisation_id: actor.organisation_id }).sort({ createdAt: -1 }).limit(MAX_POLLS);
  const people = await pollPeople(actor.organisation_id, polls, moderator);
  u.ok(res, { polls: polls.map((p) => pollView(p, actor, people, moderator)) });
};

const createPoll = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  if (["ended", "cancelled"].includes(m.status)) throw httpError(`You can't add polls to a ${m.status} meeting.`);
  const b = req.body || {};
  const question = String(b.question || "").trim();
  if (!question) throw httpError("Poll question is required.");
  const options = [...new Set((Array.isArray(b.options) ? b.options : []).map((o) => String(o).trim().slice(0, 120)).filter(Boolean))];
  if (options.length < 2) throw httpError("A poll needs at least two different options.");
  if (options.length > 10) throw httpError("A poll can have at most 10 options.");
  if ((await MeetingPoll.countDocuments({ meeting: m._id })) >= MAX_POLLS) throw httpError(`A meeting can have at most ${MAX_POLLS} polls.`);
  const closesAt = u.parseDateOrNull(b.closesAt, "closesAt");
  if (closesAt && closesAt.getTime() <= Date.now()) throw httpError("closesAt must be in the future.");

  const poll = await MeetingPoll.create({
    organisation_id: actor.organisation_id,
    meeting: m._id,
    question: question.slice(0, 250),
    options: options.map((text) => ({ text })),
    multiple: !!b.multiple,
    anonymous: !!b.anonymous,
    closesAt,
    createdByKey: actor.key,
  });
  u.notifyKeys(actor, m.attendeeKeys, m, {
    title: "New poll",
    message: question.slice(0, 160),
    event: "meeting:poll",
    payload: { pollId: String(poll._id), reason: "created" },
    bell: b.notify === true,
  });
  const people = await pollPeople(actor.organisation_id, [poll], true);
  u.ok(res, { poll: pollView(poll, actor, people, true) }, 201);
};

const votePoll = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const poll = await MeetingPoll.findOne({ _id: objectId(req.params.pollId, "Poll"), meeting: m._id, organisation_id: actor.organisation_id });
  if (!poll) throw httpError("Poll not found.", 404);
  if (pollStatus(poll) === "closed") throw httpError("This poll is closed.");

  const ids = [...new Set((Array.isArray(req.body?.optionIds) ? req.body.optionIds : []).map(String))];
  const valid = new Set(poll.options.map((o) => String(o._id)));
  if (ids.some((id) => !valid.has(id))) throw httpError("One of the options doesn't exist.");
  if (!poll.multiple && ids.length > 1) throw httpError("Choose only one option.");

  await MeetingPoll.updateOne({ _id: poll._id }, { $pull: { "options.$[].voterKeys": actor.key } });
  if (ids.length) {
    await MeetingPoll.updateOne(
      { _id: poll._id },
      { $addToSet: { "options.$[o].voterKeys": actor.key } },
      { arrayFilters: [{ "o._id": { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }] }
    );
  }
  const fresh = await MeetingPoll.findById(poll._id);
  const moderator = u.isModerator(m, actor.key);
  u.emitToKeysOnly([m.hostKey, ...m.coHostKeys], "meeting:poll", { meetingId: String(m._id), pollId: String(poll._id), reason: "voted" });
  const people = await pollPeople(actor.organisation_id, [fresh], moderator);
  u.ok(res, { poll: pollView(fresh, actor, people, moderator) });
};

const closePoll = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  const poll = await MeetingPoll.findOne({ _id: objectId(req.params.pollId, "Poll"), meeting: m._id, organisation_id: actor.organisation_id });
  if (!poll) throw httpError("Poll not found.", 404);
  if (poll.status !== "closed") {
    poll.status = "closed";
    poll.closedAt = new Date();
    await poll.save();
    u.emitToKeysOnly(m.attendeeKeys, "meeting:poll", { meetingId: String(m._id), pollId: String(poll._id), reason: "closed" });
  }
  const people = await pollPeople(actor.organisation_id, [poll], true);
  u.ok(res, { poll: pollView(poll, actor, people, true) });
};

const deletePoll = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  const r = await MeetingPoll.deleteOne({ _id: objectId(req.params.pollId, "Poll"), meeting: m._id, organisation_id: actor.organisation_id });
  if (!r.deletedCount) throw httpError("Poll not found.", 404);
  u.emitToKeysOnly(m.attendeeKeys, "meeting:poll", { meetingId: String(m._id), pollId: String(req.params.pollId), reason: "deleted" });
  u.ok(res, { deleted: true });
};

const submitFeedback = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  if (m.status !== "ended") throw httpError("You can rate a meeting once it has ended.");
  const b = req.body || {};
  const rating = parseInt(b.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError("rating must be a whole number from 1 to 5.");
  const tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map(String).filter((t) => FEEDBACK_TAGS.includes(t)))];

  const doc = await MeetingFeedback.findOneAndUpdate(
    { meeting: m._id, key: actor.key },
    {
      $set: { rating, comment: String(b.comment || "").trim().slice(0, 1000), anonymous: !!b.anonymous, tags },
      $setOnInsert: { organisation_id: actor.organisation_id },
    },
    { new: true, upsert: true, runValidators: true }
  );
  u.emitToKeysOnly([m.hostKey, ...m.coHostKeys], "meeting:feedback", { meetingId: String(m._id) });
  u.ok(res, { feedback: { rating: doc.rating, comment: doc.comment, anonymous: doc.anonymous, tags: doc.tags, updatedAt: doc.updatedAt } });
};

const myFeedback = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const doc = await MeetingFeedback.findOne({ meeting: m._id, key: actor.key });
  u.ok(res, {
    canRate: m.status === "ended",
    tags: FEEDBACK_TAGS,
    feedback: doc ? { rating: doc.rating, comment: doc.comment, anonymous: doc.anonymous, tags: doc.tags, updatedAt: doc.updatedAt } : null,
  });
};

const feedbackSummary = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  const rows = await MeetingFeedback.find({ meeting: m._id, organisation_id: actor.organisation_id }).sort({ createdAt: -1 }).limit(500);
  const people = await resolvePeople(actor.organisation_id, rows.filter((r) => !r.anonymous).map((r) => parseKey(r.key)));

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const tagCounts = {};
  for (const r of rows) {
    distribution[r.rating] += 1;
    for (const t of r.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  }
  const total = rows.reduce((sum, r) => sum + r.rating, 0);
  u.ok(res, {
    count: rows.length,
    invited: m.attendees.length,
    responseRate: m.attendees.length ? Math.round((rows.length / m.attendees.length) * 100) : 0,
    average: rows.length ? Math.round((total / rows.length) * 10) / 10 : null,
    distribution,
    tags: tagCounts,
    comments: rows
      .filter((r) => r.comment)
      .map((r) => ({ rating: r.rating, comment: r.comment, at: r.updatedAt, person: r.anonymous ? null : u.mini(people, r.key) })),
  });
};

const esc = u.escapeHtml;

const shareNotes = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  if (m.status === "cancelled") throw httpError("A cancelled meeting cannot be shared.");
  const n = await MeetingNote.findOne({ meeting: m._id, organisation_id: actor.organisation_id });
  if (!n || (!n.content.trim() && !n.decisions.length)) throw httpError("Write the notes first, then share them.");

  const b = req.body || {};
  const includeAttendees = b.includeAttendees !== false;
  const includeGuests = b.includeGuests !== false;
  const items = await MeetingActionItem.find({ meeting: m._id, organisation_id: actor.organisation_id }).sort({ status: -1, dueDate: 1 }).limit(MAX_ACTION_ITEMS);
  const keys = [...new Set([...items.map((i) => i.assigneeKey), ...m.attendeeKeys])];
  const people = await resolvePeople(actor.organisation_id, keys.map(parseKey));
  const [host] = [...(await requirePeople(actor.organisation_id, [{ model: m.hostModel, id: m.host }])).values()];

  const body = `<p><b>When:</b> ${esc(u.fmtWhen(m.startTime, m.timezone))} (${esc(m.timezone)})</p>
    ${n.decisions.length ? `<p><b>Decisions</b></p><ul style="padding-left:18px">${n.decisions.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
    ${n.content.trim() ? `<p><b>Notes</b></p><div style="background:#f6eef2;border-radius:8px;padding:12px 16px">${esc(n.content).replace(/\n/g, "<br>")}</div>` : ""}
    ${items.length ? `<p><b>Action items</b></p><ul style="padding-left:18px">${items.map((i) => `<li>${i.status === "done" ? "&#10003; " : ""}${esc(i.title)} &ndash; ${esc(u.person(people, i.assigneeKey).name)}${i.dueDate ? ` (due ${esc(u.fmtWhen(i.dueDate, m.timezone))})` : ""}</li>`).join("")}</ul>` : ""}`;
  const html = (ctaUrl) => u.brandedEmail({ heading: `Minutes: ${m.title}`, intro: `${esc(host.name)} shared the notes from this meeting.`, bodyHtml: body, ctaUrl, ctaLabel: "Open meeting" });

  let attendeeMails = 0;
  let guestMails = 0;
  if (includeAttendees) {
    const targets = m.attendees.filter((a) => a.rsvp !== "declined" && a.key !== actor.key).map((a) => people.get(a.key)).filter((p) => p && p.email);
    attendeeMails = targets.length;
    const page = html(u.meetingUrl(m._id));
    u.sendInBatches(targets, (p) => u.sendMail(p.email, `Minutes: ${m.title}`, page));
    u.notifyKeys(actor, targets.map((p) => p.key), m, { title: "Meeting minutes shared", message: `Notes and action items from "${m.title}" are ready.`, event: "meeting:notes", payload: { reason: "shared" } });
  }
  if (includeGuests) {
    const guests = (m.guests || []).filter((g) => !g.revoked && g.joinCount > 0);
    guestMails = guests.length;
    const page = html("");
    u.sendInBatches(guests, (g) => u.sendMail(g.email, `Minutes: ${m.title}`, page));
  }
  if (!n.published) {
    n.published = true;
    n.publishedAt = new Date();
  }
  n.sharedAt = new Date();
  await n.save();
  u.ok(res, { shared: { attendees: attendeeMails, guests: guestMails }, sharedAt: n.sharedAt });
};

module.exports = {
  getNotes,
  saveNotes,
  shareNotes,
  listActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  myActionItems,
  listPolls,
  createPoll,
  votePoll,
  closePoll,
  deletePoll,
  submitFeedback,
  myFeedback,
  feedbackSummary,
};
