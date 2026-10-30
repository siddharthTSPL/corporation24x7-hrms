// REST side of the live-meeting extras (see utils/chat/meetingLive.service.js for the realtime side).
// Everything here is read-only except "share transcript": the live actions happen over the socket.
const MeetingLive = require("../Models/meetinglive.model");
const MeetingBoard = require("../Models/meetingboard.model");
const MeetingQuestion = require("../Models/meetingquestion.model");
const MeetingKudos = require("../Models/meetingkudos.model");
const MeetingNote = require("../Models/meetingnote.model");
const MeetingPoll = require("../Models/meetingpoll.model");
const MeetingActionItem = require("../Models/meetingactionitem.model");
const CallSession = require("../Models/callsession.model");
const rooms = require("../utils/chat/callRooms");
const live = require("../utils/chat/meetingLive.service");
const u = require("../utils/chat/meetingSpace.utils");
const { httpError, parseKey, resolvePeople } = require("../utils/chat/people.utils");

const MOODS = ["\uD83D\uDE34", "\uD83D\uDE15", "\uD83D\uDE10", "\uD83D\uDE42", "\uD83D\uDD25"];

const fmtClock = (d, tz) => {
  try {
    return new Intl.DateTimeFormat("en-IN", { timeStyle: "medium", timeZone: u.validTz(tz) }).format(new Date(d));
  } catch {
    return "";
  }
};
const fmtMin = (sec) => {
  const m = Math.round((sec || 0) / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

// Flushes anything still buffered in memory so a running meeting's REST reads are up to date.
const freshen = async (m) => {
  const room = rooms.get(m.roomKey);
  if (room && room.live && !room.ending) await live.flushNow(room);
};

// ---------------------------------------------------------------- Q&A
const listQuestions = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const moderator = u.isModerator(m, actor.key);
  const docs = await MeetingQuestion.find({ meeting: m._id, organisation_id: actor.organisation_id }).sort({ createdAt: 1 }).limit(500);
  const visible = docs.filter((q) => moderator || q.status !== "dismissed");
  u.ok(res, { questions: live.sortQuestions(visible).map((q) => live.qFor(q, actor.key)) });
};

// ---------------------------------------------------------------- kudos
const listKudos = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const docs = await MeetingKudos.find({ meeting: m._id, organisation_id: actor.organisation_id }).sort({ createdAt: 1 }).limit(200);
  u.ok(res, { kudos: docs.map(live.kudosView) });
};

const myKudos = async (req, res) => {
  const actor = u.actorOf(req);
  const days = u.clampInt(req.query.days, 1, 365, 90);
  const since = new Date(Date.now() - days * 86400000);
  const q = { organisation_id: actor.organisation_id, createdAt: { $gte: since } };
  const [received, given, receivedCount, givenCount] = await Promise.all([
    MeetingKudos.find({ ...q, toKey: actor.key }).sort({ createdAt: -1 }).limit(50),
    MeetingKudos.find({ ...q, fromKey: actor.key }).sort({ createdAt: -1 }).limit(50),
    MeetingKudos.countDocuments({ ...q, toKey: actor.key }),
    MeetingKudos.countDocuments({ ...q, fromKey: actor.key }),
  ]);
  u.ok(res, { days, receivedCount, givenCount, received: received.map(live.kudosView), given: given.map(live.kudosView) });
};

// Top kudos receivers / givers in the organisation (last N days).
const kudosLeaderboard = async (req, res) => {
  const actor = u.actorOf(req);
  const days = u.clampInt(req.query.days, 1, 365, 30);
  const since = new Date(Date.now() - days * 86400000);
  const match = { organisation_id: actor.organisation_id, createdAt: { $gte: since } };
  const top = (field) => MeetingKudos.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]);
  const [receivers, givers] = await Promise.all([top("toKey"), top("fromKey")]);
  const people = await resolvePeople(actor.organisation_id, [...receivers, ...givers].map((r) => parseKey(r._id)));
  const shape = (rows) => rows.map((r) => ({ ...u.mini(people, r._id), count: r.count }));
  u.ok(res, { days, topReceivers: shape(receivers), topGivers: shape(givers) });
};

// ---------------------------------------------------------------- whiteboard
const getBoard = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  await freshen(m);
  const b = await MeetingBoard.findOne({ meeting: m._id, organisation_id: actor.organisation_id }).lean();
  u.ok(res, { strokes: b ? b.strokes : [], updatedAt: b ? b.updatedAt : null });
};

// ---------------------------------------------------------------- transcript
const csvSafe = (s) => String(s || "");

const getTranscript = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const moderator = u.isModerator(m, actor.key);
  await freshen(m);
  const doc = await MeetingLive.findOne({ meeting: m._id, organisation_id: actor.organisation_id }).select("transcript transcriptShared").lean();
  if (!moderator && !(doc && doc.transcriptShared)) throw httpError("The host has not shared the transcript.", 403);
  const lines = doc ? doc.transcript || [] : [];
  if (String(req.query.format || "").toLowerCase() === "txt") {
    const body = lines.map((l) => `[${fmtClock(l.at, m.timezone)}] ${csvSafe(l.n)}: ${csvSafe(l.t)}`).join("\n");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="meeting-transcript-${String(m._id)}.txt"`);
    return res.send(`${m.title}\n${"=".repeat(Math.min(60, m.title.length))}\n\n${body}\n`);
  }
  u.ok(res, { shared: !!(doc && doc.transcriptShared), canShare: moderator, lines: lines.map((l) => ({ key: l.k, name: l.n, text: l.t, at: l.at, lang: l.lang })) });
};

const shareTranscript = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  u.requireModerator(m, actor);
  const shared = !(req.body && req.body.shared === false);
  await MeetingLive.updateOne(
    { meeting: m._id },
    { $set: { transcriptShared: shared }, $setOnInsert: { organisation_id: actor.organisation_id } },
    { upsert: true, setDefaultsOnInsert: false }
  );
  if (shared) {
    u.notifyKeys(actor, m.attendees.filter((a) => a.rsvp !== "declined").map((a) => a.key), m, {
      title: "Meeting transcript shared",
      message: `The transcript of "${m.title}" is now available.`,
      event: "meeting:transcript",
      payload: { shared: true },
    });
  }
  u.ok(res, { shared });
};

// ---------------------------------------------------------------- minutes of meeting
const buildMinutes = async (actor, m) => {
  const moderator = u.isModerator(m, actor.key);
  await freshen(m);
  const q = { meeting: m._id, organisation_id: actor.organisation_id };
  const [liveDoc, items, polls, questions, kudos, sessions, note] = await Promise.all([
    MeetingLive.findOne(q).lean(),
    MeetingActionItem.find(q).sort({ createdAt: 1 }).limit(200).lean(),
    MeetingPoll.find(q).sort({ createdAt: 1 }).limit(30).lean(),
    MeetingQuestion.find(q).sort({ createdAt: 1 }).limit(500).lean(),
    MeetingKudos.find(q).sort({ createdAt: 1 }).limit(200).lean(),
    CallSession.find(q).sort({ startedAt: 1 }).lean(),
    MeetingNote.findOne(q).lean(),
  ]);
  const L = liveDoc || {};
  const names = L.names || {};

  // who was there, for how long
  const byKey = new Map();
  for (const s of sessions) {
    const end = s.endedAt || new Date();
    for (const p of s.participants || []) {
      if (!p.joinedAt) continue;
      const left = p.leftAt ? new Date(p.leftAt) : end;
      byKey.set(p.key, (byKey.get(p.key) || 0) + Math.max(0, Math.round((left - new Date(p.joinedAt)) / 1000)));
    }
  }
  const keys = new Set([...byKey.keys(), ...items.flatMap((i) => [i.assigneeKey, i.createdByKey])]);
  const people = await resolvePeople(actor.organisation_id, [...keys].filter((k) => !k.startsWith("Guest:")).map(parseKey));
  const nameOf = (k) => {
    if (String(k).startsWith("Guest:")) {
      const g = (m.guests || []).find((x) => `Guest:${x.guestId}` === k);
      return (g && (g.name || g.email)) || names[k] || "Guest";
    }
    const p = people.get(k);
    return p ? p.name : names[k] || "Former member";
  };

  const attendance = [...byKey.entries()].map(([key, sec]) => ({ key, name: nameOf(key), durationSec: sec })).sort((a, b) => b.durationSec - a.durationSec);
  const startedAt = m.startedAt || (sessions[0] && sessions[0].startedAt) || null;
  const endedAt = m.endedAt || (sessions.length ? sessions[sessions.length - 1].endedAt : null);
  const durationSec = startedAt && endedAt ? Math.max(0, Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)) : 0;

  const decisions = [...(L.decisions || []).map((d) => ({ text: d.text, by: d.byName, at: d.at })), ...((note && (moderator || note.published) ? note.decisions : []) || []).map((t) => ({ text: t, by: "", at: null }))];

  const answered = questions.filter((x) => x.status === "answered");
  const total = questions.length;
  const talkMs = L.talkMs || {};
  const talkTotal = Object.values(talkMs).reduce((a, b) => a + (Number(b) || 0), 0);
  const talk = moderator
    ? Object.entries(talkMs)
        .map(([key, ms]) => ({ key, name: nameOf(key), ms: Number(ms) || 0, pct: talkTotal ? Math.round((ms / talkTotal) * 1000) / 10 : 0 }))
        .sort((a, b) => b.ms - a.ms)
    : undefined;

  const pulse = L.pulseRounds || [];
  return {
    meeting: { id: String(m._id), title: m.title, startTime: m.startTime, startedAt, endedAt, durationSec, status: m.status, host: nameOf(m.hostKey) },
    attendance,
    agenda: (L.agendaLog || []).map((a) => ({ title: a.title, plannedMin: a.plannedMin, spentSec: a.spentSec, status: a.status, overrunSec: a.plannedMin ? Math.max(0, a.spentSec - a.plannedMin * 60) : 0 })),
    decisions,
    actionItems: items.map((i) => ({ title: i.title, assignee: nameOf(i.assigneeKey), dueDate: i.dueDate, priority: i.priority, status: i.status })),
    polls: polls.map((p) => ({
      question: p.question,
      status: p.status,
      totalVotes: p.options.reduce((a, o) => a + o.voterKeys.length, 0),
      options: p.options.map((o) => ({ text: o.text, votes: o.voterKeys.length })),
    })),
    questions: {
      total,
      answered: answered.length,
      unanswered: questions.filter((x) => x.status === "open").length,
      highlights: answered.slice(0, 20).map((x) => ({ question: x.text, answer: x.answerText, upvotes: x.upvoterKeys.length })),
    },
    pulse: pulse.map((p) => ({ prompt: p.prompt, at: p.at, count: p.count, avg: p.avg, dist: p.dist })),
    kudos: kudos.map((k) => ({ from: k.fromName, to: k.toName, badge: k.badge, message: k.message })),
    wheel: (L.wheelHistory || []).map((w) => ({ winner: w.winnerName, at: w.at })),
    breakouts: (L.breakoutLog || []).map((b) => ({ startedAt: b.startedAt, endedAt: b.endedAt, rooms: b.rooms, people: b.people })),
    recording: (L.recordingLog || []).map((r) => ({ on: r.on, at: r.at, by: r.byName })),
    transcript: { lines: (L.transcript || []).length, shared: !!L.transcriptShared },
    talk,
    notes: note && (moderator || note.published) ? note.content : "",
  };
};

const minutesToMarkdown = (r, tz) => {
  const out = [];
  const when = r.meeting.startedAt || r.meeting.startTime;
  out.push(`# Minutes of meeting: ${r.meeting.title}`);
  out.push("");
  out.push(`- **Date:** ${when ? u.fmtWhen(when, tz) : "-"}`);
  out.push(`- **Host:** ${r.meeting.host}`);
  out.push(`- **Duration:** ${fmtMin(r.meeting.durationSec)}`);
  out.push(`- **Attended:** ${r.attendance.length}`);
  const section = (title, lines) => {
    if (!lines.length) return;
    out.push("", `## ${title}`, "", ...lines);
  };
  section("Attendance", r.attendance.map((a) => `- ${a.name} (${fmtMin(a.durationSec)})`));
  section("Agenda", r.agenda.map((a) => `- ${a.title}: ${fmtMin(a.spentSec)}${a.plannedMin ? ` of ${a.plannedMin} min planned${a.overrunSec ? ` (over by ${fmtMin(a.overrunSec)})` : ""}` : ""}${a.status === "skipped" ? " - skipped" : ""}`));
  section("Decisions", r.decisions.map((d, i) => `${i + 1}. ${d.text}${d.by ? ` _(${d.by})_` : ""}`));
  section("Action items", r.actionItems.map((i) => `- [${i.status === "done" ? "x" : " "}] ${i.title} - **${i.assignee}**${i.dueDate ? `, due ${u.fmtWhen(i.dueDate, tz)}` : ""}`));
  section("Poll results", r.polls.flatMap((p) => [`**${p.question}** (${p.totalVotes} votes)`, ...p.options.map((o) => `- ${o.text}: ${o.votes}`), ""]));
  if (r.questions.total) {
    section("Q&A", [
      `${r.questions.answered} of ${r.questions.total} questions answered, ${r.questions.unanswered} still open.`,
      "",
      ...r.questions.highlights.map((h) => `- **Q:** ${h.question}${h.answer ? `\n  **A:** ${h.answer}` : ""}`),
    ]);
  }
  section("Team mood", r.pulse.map((p) => `- ${p.prompt}: ${p.avg}/5 ${MOODS[Math.max(0, Math.min(4, Math.round(p.avg) - 1))]} (${p.count} responses)`));
  section("Kudos", r.kudos.map((k) => `- ${k.from} \u2192 ${k.to}${k.message ? `: ${k.message}` : ""}`));
  if (r.talk && r.talk.length) section("Talk time (host only)", r.talk.map((t) => `- ${t.name}: ${fmtMin(t.ms / 1000)} (${t.pct}%)`));
  if (r.notes) out.push("", "## Notes", "", r.notes);
  out.push("");
  return out.join("\n");
};

const minutes = async (req, res) => {
  const actor = u.actorOf(req);
  const m = await u.loadAttendeeMeeting(actor, req.params.id);
  const report = await buildMinutes(actor, m);
  if (String(req.query.format || "").toLowerCase() === "md") {
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="meeting-minutes-${String(m._id)}.md"`);
    return res.send(minutesToMarkdown(report, m.timezone));
  }
  u.ok(res, { minutes: report, markdown: minutesToMarkdown(report, m.timezone) });
};

module.exports = {
  listQuestions,
  listKudos,
  myKudos,
  kudosLeaderboard,
  getBoard,
  getTranscript,
  shareTranscript,
  minutes,
  _buildMinutes: buildMinutes,
  _minutesToMarkdown: minutesToMarkdown,
};
