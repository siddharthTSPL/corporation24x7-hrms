const mongoose = require("mongoose");
const Meeting = require("../../Models/meeting.model");
const chat = require("./chat.service");
const guestSvc = require("./guest.service");
const { createBulkNotifications } = require("../Notification.utils");
const { sendEmail } = require("../nodemailer.utils");
const { httpError, parseKey } = require("./people.utils");

const actorOf = (req) => chat.toActor(req.actor);
const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });

const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const validTz = (tz) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "Asia/Kolkata";
  }
};

const fmtWhen = (d, tz) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: validTz(tz) }).format(new Date(d));

const frontendUrl = () => (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const meetingUrl = (id) => (frontendUrl() ? `${frontendUrl()}${process.env.MEETING_JOIN_PATH || "/meetings"}/${id}` : "");

const isModerator = (m, key) => m.hostKey === key || (m.coHostKeys || []).includes(key);

const assertMeetingId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw httpError("Meeting not found.", 404);
};

const loadAttendeeMeeting = async (actor, id) => {
  assertMeetingId(id);
  const m = await Meeting.findOne({ _id: id, organisation_id: actor.organisation_id, attendeeKeys: actor.key });
  if (!m) throw httpError("Meeting not found.", 404);
  return m;
};

const loadReachableMeeting = async (actor, id) => {
  assertMeetingId(id);
  const m = await Meeting.findOne({
    _id: id,
    organisation_id: actor.organisation_id,
    $or: [{ attendeeKeys: actor.key }, { visibility: "organisation" }],
  });
  if (!m) throw httpError("Meeting not found.", 404);
  return { m, isAttendee: m.attendeeKeys.includes(actor.key) };
};

const requireModerator = (m, actor) => {
  if (!isModerator(m, actor.key)) throw httpError("Only the host or a co-host can do this.", 403);
};

const accountKeys = (keys) => [...new Set(keys)].filter((k) => k && !guestSvc.isGuestKey(k));

const notifyKeys = (actor, keys, meeting, { title, message, priority = "medium", event, payload = {}, bell = true }) => {
  const targets = accountKeys(keys).filter((k) => k !== actor.key);
  if (!targets.length) return;
  if (bell) {
    createBulkNotifications({
      recipients: targets.map((k) => {
        const p = parseKey(k);
        return { recipientModel: p.model, recipientId: p.id };
      }),
      organisation_id: actor.organisation_id,
      type: "meeting",
      title,
      message,
      link: `/meetings/${meeting._id}`,
      priority,
      createdBy: actor.id,
      createdByModel: actor.model,
      meta: { meetingId: String(meeting._id), ...(payload.announcementId ? { announcementId: String(payload.announcementId) } : {}) },
    }).catch(() => {});
  }
  if (event) chat.emitToKeys(targets, event, { meetingId: String(meeting._id), ...payload });
};

const emitToKeysOnly = (keys, event, payload) => {
  const targets = accountKeys(keys);
  if (targets.length) chat.emitToKeys(targets, event, payload);
};

const brandedEmail = ({ heading, intro, bodyHtml = "", ctaUrl = "", ctaLabel = "Open meeting", footer = "" }) =>
  `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#730042;margin-bottom:4px">${escapeHtml(heading)}</h2>
    ${intro ? `<p style="color:#555;margin-top:0">${intro}</p>` : ""}
    ${bodyHtml}
    ${ctaUrl ? `<p><a href="${escapeHtml(ctaUrl)}" style="background:#CD166E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(ctaLabel)}</a></p>` : ""}
    ${footer ? `<p style="color:#888;font-size:12px">${footer}</p>` : ""}
  </div>`;

const sendInBatches = (items, send, size = 5) => {
  if (!items.length) return;
  (async () => {
    for (let i = 0; i < items.length; i += size) {
      await Promise.all(items.slice(i, i + size).map((item) => Promise.resolve(send(item)).catch((e) => console.error("[meeting] email failed:", e.message))));
    }
  })();
};

const sendMail = (to, subject, html) => sendEmail({ to, subject, html });

const person = (people, key) => people.get(key) || { key, id: parseKey(key).id, model: parseKey(key).model, name: "Former member", photo: "", email: "", designation: "", department: "", role: "" };

const mini = (people, key) => {
  const p = person(people, key);
  return { key: p.key, id: p.id, model: p.model, name: p.name, photo: p.photo, designation: p.designation, department: p.department };
};

const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

const parseDateOrNull = (v, label) => {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(v);
  if (isNaN(d)) throw httpError(`${label} must be a valid date-time (ISO 8601).`);
  return d;
};

module.exports = {
  actorOf,
  ok,
  escapeHtml,
  validTz,
  fmtWhen,
  meetingUrl,
  isModerator,
  assertMeetingId,
  loadAttendeeMeeting,
  loadReachableMeeting,
  requireModerator,
  accountKeys,
  notifyKeys,
  emitToKeysOnly,
  brandedEmail,
  sendInBatches,
  sendMail,
  person,
  mini,
  clampInt,
  parseDateOrNull,
};
