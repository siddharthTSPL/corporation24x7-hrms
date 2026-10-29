const mongoose = require("mongoose");
const path = require("path");
const Meeting = require("../Models/meeting.model");
const CallSession = require("../Models/callsession.model");
const MeetingBackground = require("../Models/meetingbackground.model");
const CallPreference = require("../Models/callpreference.model");
const imagekit = require("../utils/imagekit.utils");
const chat = require("../utils/chat/chat.service");
const rooms = require("../utils/chat/callRooms");
const controls = require("../utils/chat/meetingControls.service");
const { httpError, resolvePeople, parseKey } = require("../utils/chat/people.utils");

const ADMIN_ROLES = new Set(["admin", "senior_admin", "super_admin"]);
const MAX_PERSONAL_BACKGROUNDS = 10;
const MAX_ORG_BACKGROUNDS = 30;

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });
const isAdminRole = (req) => ADMIN_ROLES.has(req.actor.role);

const safeFileName = (name) => path.basename(String(name || "background")).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "background";

const thumbOf = (url) => `${url}${url.includes("?") ? "&" : "?"}tr=w-320,h-180,fo-auto`;

const shapeBackground = (bg, actor) => ({
  id: String(bg._id),
  name: bg.name,
  scope: bg.scope,
  url: bg.url,
  thumbUrl: thumbOf(bg.url),
  mine: bg.ownerKey === actor.key,
  createdAt: bg.createdAt,
});

const shapePreferences = (p) => ({
  effect: p.effect,
  blurIntensity: p.blurIntensity,
  backgroundId: p.backgroundId ? String(p.backgroundId) : null,
  mirrorVideo: p.mirrorVideo,
  joinMuted: p.joinMuted,
  joinCameraOff: p.joinCameraOff,
  noiseSuppression: p.noiseSuppression,
  echoCancellation: p.echoCancellation,
  autoGainControl: p.autoGainControl,
});

const DEFAULT_PREFERENCES = {
  effect: "none",
  blurIntensity: 50,
  backgroundId: null,
  mirrorVideo: true,
  joinMuted: false,
  joinCameraOff: false,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
};

const loadMeeting = async (actor, id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError("Meeting not found.", 404);
  const m = await Meeting.findOne({ _id: id, organisation_id: actor.organisation_id, attendeeKeys: actor.key });
  if (!m) throw httpError("Meeting not found.", 404);
  return m;
};

const requireModerator = (m, actor) => {
  if (m.hostKey !== actor.key && !m.coHostKeys.includes(actor.key)) throw httpError("Only the host or a co-host can do this.", 403);
};

const csvCell = (v) => {
  const s = String(v == null ? "" : v);
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

const listBackgrounds = async (req, res) => {
  const actor = actorOf(req);
  const rows = await MeetingBackground.find({
    organisation_id: actor.organisation_id,
    $or: [{ scope: "organisation" }, { scope: "personal", ownerKey: actor.key }],
  }).sort({ createdAt: -1 });
  const shaped = rows.map((r) => shapeBackground(r, actor));
  ok(res, {
    organisation: shaped.filter((b) => b.scope === "organisation"),
    personal: shaped.filter((b) => b.scope === "personal"),
    limits: { personal: MAX_PERSONAL_BACKGROUNDS, organisation: MAX_ORG_BACKGROUNDS },
  });
};

const uploadBackground = async (req, res) => {
  const actor = actorOf(req);
  if (!req.file) throw httpError("Choose an image to upload.");
  const scope = req.body && req.body.scope === "organisation" ? "organisation" : "personal";
  if (scope === "organisation" && !isAdminRole(req)) throw httpError("Only admins can add organisation backgrounds.", 403);

  const filter = scope === "organisation"
    ? { organisation_id: actor.organisation_id, scope }
    : { organisation_id: actor.organisation_id, scope, ownerKey: actor.key };
  const count = await MeetingBackground.countDocuments(filter);
  const cap = scope === "organisation" ? MAX_ORG_BACKGROUNDS : MAX_PERSONAL_BACKGROUNDS;
  if (count >= cap) throw httpError(`You can keep at most ${cap} ${scope} backgrounds. Delete one first.`);

  const up = await imagekit.upload({
    file: req.file.buffer.toString("base64"),
    fileName: safeFileName(req.file.originalname),
    folder: `/meeting-backgrounds/${actor.organisation_id}/${scope === "organisation" ? "shared" : actor.key.replace(/[^\w-]/g, "_")}`,
    useUniqueFileName: true,
    tags: [String(actor.organisation_id)],
  });

  const name = String((req.body && req.body.name) || "").trim().slice(0, 80) || path.parse(safeFileName(req.file.originalname)).name.slice(0, 80) || "Background";
  const bg = await MeetingBackground.create({
    organisation_id: actor.organisation_id,
    scope,
    ownerKey: actor.key,
    name,
    url: up.url,
    fileId: up.fileId,
    mime: req.file.mimetype,
    size: req.file.size,
  });
  ok(res, { background: shapeBackground(bg, actor) }, 201);
};

const deleteBackground = async (req, res) => {
  const actor = actorOf(req);
  if (!mongoose.isValidObjectId(req.params.bgId)) throw httpError("Background not found.", 404);
  const bg = await MeetingBackground.findOne({ _id: req.params.bgId, organisation_id: actor.organisation_id });
  if (!bg) throw httpError("Background not found.", 404);
  const canDelete = bg.scope === "organisation" ? isAdminRole(req) : bg.ownerKey === actor.key;
  if (!canDelete) throw httpError("You can't delete this background.", 403);

  await MeetingBackground.deleteOne({ _id: bg._id });
  await CallPreference.updateMany({ organisation_id: actor.organisation_id, backgroundId: bg._id }, { $set: { backgroundId: null, effect: "none" } });
  imagekit.deleteFile(bg.fileId).catch(() => {});
  ok(res, { message: "Background deleted." });
};

const getPreferences = async (req, res) => {
  const actor = actorOf(req);
  const p = await CallPreference.findOne({ organisation_id: actor.organisation_id, key: actor.key });
  let prefs = p ? shapePreferences(p) : { ...DEFAULT_PREFERENCES };
  let background = null;
  if (prefs.backgroundId) {
    const bg = await MeetingBackground.findOne({
      _id: prefs.backgroundId,
      organisation_id: actor.organisation_id,
      $or: [{ scope: "organisation" }, { ownerKey: actor.key }],
    });
    if (bg) background = shapeBackground(bg, actor);
    else prefs = { ...prefs, backgroundId: null, effect: prefs.effect === "image" ? "none" : prefs.effect };
  }
  ok(res, { preferences: prefs, background });
};

const updatePreferences = async (req, res) => {
  const actor = actorOf(req);
  const b = req.body || {};
  const set = {};

  if (b.effect !== undefined) {
    if (!["none", "blur", "image"].includes(b.effect)) throw httpError("effect must be none, blur or image.");
    set.effect = b.effect;
  }
  if (b.blurIntensity !== undefined) {
    const n = Number(b.blurIntensity);
    if (!Number.isFinite(n) || n < 10 || n > 100) throw httpError("blurIntensity must be between 10 and 100.");
    set.blurIntensity = Math.round(n);
  }
  for (const k of ["mirrorVideo", "joinMuted", "joinCameraOff", "noiseSuppression", "echoCancellation", "autoGainControl"]) {
    if (b[k] !== undefined) {
      if (typeof b[k] !== "boolean") throw httpError(`${k} must be true or false.`);
      set[k] = b[k];
    }
  }
  if (b.backgroundId !== undefined) {
    if (b.backgroundId === null || b.backgroundId === "") {
      set.backgroundId = null;
    } else {
      if (!mongoose.isValidObjectId(b.backgroundId)) throw httpError("Background not found.", 404);
      const bg = await MeetingBackground.findOne({
        _id: b.backgroundId,
        organisation_id: actor.organisation_id,
        $or: [{ scope: "organisation" }, { ownerKey: actor.key }],
      });
      if (!bg) throw httpError("Background not found.", 404);
      set.backgroundId = bg._id;
      if (b.effect === undefined) set.effect = "image";
    }
  }

  const current = await CallPreference.findOne({ organisation_id: actor.organisation_id, key: actor.key });
  const finalEffect = set.effect !== undefined ? set.effect : current ? current.effect : "none";
  const finalBg = set.backgroundId !== undefined ? set.backgroundId : current ? current.backgroundId : null;
  if (finalEffect === "image" && !finalBg) throw httpError("Pick a background image to use the image effect.");
  if (finalEffect !== "image" && set.effect !== undefined && b.backgroundId === undefined) set.backgroundId = finalEffect === "none" ? null : finalBg;

  const doc = await CallPreference.findOneAndUpdate(
    { organisation_id: actor.organisation_id, key: actor.key },
    { $set: set, $setOnInsert: { organisation_id: actor.organisation_id, key: actor.key } },
    { new: true, upsert: true, runValidators: true }
  );
  ok(res, { preferences: shapePreferences(doc) });
};

const liveState = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  const room = rooms.get(m.roomKey);
  const moderator = m.hostKey === actor.key || m.coHostKeys.includes(actor.key);
  if (!room || room.ending) {
    return ok(res, { running: false, status: m.status, settings: controls.plainSettings(m.settings), hostKeys: [m.hostKey, ...m.coHostKeys] });
  }
  ok(res, controls.liveState(room, { forModerator: moderator }));
};

const updateSettings = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  requireModerator(m, actor);
  if (["ended", "cancelled"].includes(m.status)) throw httpError(`A ${m.status} meeting cannot be edited.`);

  const room = rooms.get(m.roomKey);
  let settings;
  if (room && !room.ending) {
    settings = await controls.applySettings(room, actor.key, req.body && req.body.settings ? req.body.settings : req.body);
  } else {
    settings = controls.normalizeSettings(req.body && req.body.settings ? req.body.settings : req.body, controls.plainSettings(m.settings));
    await Meeting.updateOne({ _id: m._id }, { $set: { settings } });
  }
  ok(res, { settings });
};

const buildReport = async (actor, m) => {
  const sessions = await CallSession.find({ meeting: m._id, organisation_id: actor.organisation_id }).sort({ startedAt: 1 });
  const byKey = new Map();
  for (const s of sessions) {
    const end = s.endedAt || new Date();
    for (const p of s.participants || []) {
      const joined = p.joinedAt ? new Date(p.joinedAt) : null;
      if (!joined) continue;
      const left = p.leftAt ? new Date(p.leftAt) : end;
      const rec = byKey.get(p.key) || { firstJoinedAt: joined, lastLeftAt: left, durationSec: 0 };
      if (joined < rec.firstJoinedAt) rec.firstJoinedAt = joined;
      if (left > rec.lastLeftAt) rec.lastLeftAt = left;
      rec.durationSec += Math.max(0, Math.round((left - joined) / 1000));
      byKey.set(p.key, rec);
    }
  }
  const people = await resolvePeople(actor.organisation_id, m.attendees.map((a) => ({ model: a.personModel, id: a.person })));
  const meetingStart = m.startedAt ? new Date(m.startedAt) : null;
  const rows = m.attendees.map((a) => {
    const person = people.get(a.key) || { name: "Former member", photo: "" };
    const rec = byKey.get(a.key);
    const lateMin = rec && meetingStart ? Math.max(0, Math.round((rec.firstJoinedAt - meetingStart) / 60000)) : null;
    return {
      key: a.key,
      name: person.name,
      rsvp: a.rsvp,
      isHost: a.key === m.hostKey,
      isCoHost: m.coHostKeys.includes(a.key),
      attended: !!rec,
      firstJoinedAt: rec ? rec.firstJoinedAt : null,
      lastLeftAt: rec ? rec.lastLeftAt : null,
      durationSec: rec ? rec.durationSec : 0,
      joinedLateMin: lateMin,
    };
  });
  // outsiders invited by email + PIN
  for (const g of m.guests || []) {
    const key = `Guest:${g.guestId}`;
    const rec = byKey.get(key);
    const lateMin = rec && meetingStart ? Math.max(0, Math.round((rec.firstJoinedAt - meetingStart) / 60000)) : null;
    rows.push({
      key, name: g.name || g.email, email: g.email, isGuest: true, rsvp: "guest", isHost: false, isCoHost: false,
      attended: !!rec, firstJoinedAt: rec ? rec.firstJoinedAt : null, lastLeftAt: rec ? rec.lastLeftAt : null,
      durationSec: rec ? rec.durationSec : 0, joinedLateMin: lateMin,
    });
  }
  const attended = rows.filter((r) => r.attended).length;
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  return {
    meeting: { id: String(m._id), title: m.title, status: m.status, startTime: m.startTime, endTime: m.endTime, startedAt: m.startedAt, endedAt: m.endedAt },
    summary: {
      invited: rows.length,
      attended,
      absent: rows.length - attended,
      attendanceRate: rows.length ? Math.round((attended / rows.length) * 100) : 0,
      durationSec: last ? last.durationSec || (m.startedAt && m.endedAt ? Math.round((m.endedAt - m.startedAt) / 1000) : 0) : 0,
      sessions: sessions.length,
      startedAt: first ? first.startedAt : null,
      endedAt: last ? last.endedAt : null,
    },
    participants: rows,
  };
};

const meetingReport = async (req, res) => {
  const actor = actorOf(req);
  const m = await loadMeeting(actor, req.params.id);
  requireModerator(m, actor);
  const report = await buildReport(actor, m);

  if (String(req.query.format || "").toLowerCase() === "csv") {
    const header = ["Name", "RSVP", "Role", "Attended", "First joined", "Last left", "Minutes in meeting", "Joined late (min)"];
    const lines = report.participants.map((r) => [
      r.name,
      r.rsvp,
      r.isHost ? "Host" : r.isCoHost ? "Co-host" : r.isGuest ? "Guest" : "Attendee",
      r.attended ? "Yes" : "No",
      r.firstJoinedAt ? new Date(r.firstJoinedAt).toISOString() : "",
      r.lastLeftAt ? new Date(r.lastLeftAt).toISOString() : "",
      Math.round(r.durationSec / 60),
      r.joinedLateMin == null ? "" : r.joinedLateMin,
    ]);
    const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="meeting-attendance-${String(m._id)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  }
  ok(res, report);
};

const reactionList = async (req, res) => {
  ok(res, { reactions: controls.REACTIONS });
};

module.exports = {
  listBackgrounds,
  uploadBackground,
  deleteBackground,
  getPreferences,
  updatePreferences,
  liveState,
  updateSettings,
  meetingReport,
  reactionList,
};
