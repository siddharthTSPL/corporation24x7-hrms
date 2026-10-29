// Outsider ("guest") access to scheduled meetings.
//
// A guest is someone WITHOUT an account in this organisation. The host adds their
// email to a meeting; we mail them a link + a personal 6-digit PIN. On the join
// page they enter email + PIN, get a short-lived guest token, connect a socket
// with it, and wait in the lobby until the host / a co-host admits them.
//
// A guest's key is  Guest:<guestId>  (same "Model:id" shape as every other person
// in chat/calls, so rooms, lobby, kick, hand-raise etc. work unchanged).
const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Meeting = require("../../Models/meeting.model");
const { sendEmail } = require("../nodemailer.utils");
const { buildIcs } = require("./ics.utils");
const { httpError, resolvePeople, MODELS, escapeRegex } = require("./people.utils");

const scrypt = promisify(crypto.scrypt);

const GUEST_MODEL = "Guest";
const MAX_GUESTS = 100;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;
const LATE_GRACE_MS = 180 * 60 * 1000; // same overrun window as call.service
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

const guestKey = (id) => `${GUEST_MODEL}:${String(id)}`;
const isGuestKey = (key) => String(key || "").startsWith(`${GUEST_MODEL}:`);

const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cleanName = (v) => String(v || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);

// ---------- PIN ----------

const newPin = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

const hashPin = async (pin, salt) => (await scrypt(String(pin), salt, 32)).toString("hex");

const makePinFields = async () => {
  const pin = newPin();
  const pinSalt = crypto.randomBytes(16).toString("hex");
  const pinHash = await hashPin(pin, pinSalt);
  return { pin, fields: { pinHash, pinSalt, pinAttempts: 0, lockedUntil: null } };
};

const pinMatches = async (pin, guest) => {
  if (!guest.pinHash || !guest.pinSalt) return false;
  const a = Buffer.from(await hashPin(pin, guest.pinSalt), "hex");
  const b = Buffer.from(guest.pinHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ---------- guest token ----------
// Signed with a DIFFERENT secret than normal logins, so it can never be accepted
// by any of the existing auth middlewares - it only works for the guest socket.

const guestSecret = () => process.env.MEETING_GUEST_JWT_SECRET || `${process.env.JWT_SECRET}:meeting-guest`;

const signGuestToken = (meeting, guest, name) => {
  const secondsLeft = Math.floor((meeting.endTime.getTime() + LATE_GRACE_MS - Date.now()) / 1000);
  const expiresIn = Math.min(Math.max(secondsLeft, 3600), 24 * 3600);
  return jwt.sign({ typ: "meeting_guest", gid: String(guest.guestId), mid: String(meeting._id), org: String(meeting.organisation_id), name }, guestSecret(), { expiresIn });
};

const verifyGuestToken = (token) => {
  try {
    const p = jwt.verify(String(token), guestSecret());
    return p && p.typ === "meeting_guest" && p.gid && p.mid ? p : null;
  } catch {
    return null;
  }
};

// Used by the socket handshake: is this guest still allowed in this meeting?
const loadGuestContext = async (meetingId, guestId) => {
  if (!mongoose.isValidObjectId(meetingId) || !mongoose.isValidObjectId(guestId)) return null;
  const meeting = await Meeting.findOne({ _id: meetingId, guests: { $elemMatch: { guestId, revoked: false } } });
  if (!meeting || ["cancelled", "ended"].includes(meeting.status)) return null;
  if (Date.now() > meeting.endTime.getTime() + LATE_GRACE_MS) return null;
  const guest = meeting.guests.find((g) => String(g.guestId) === String(guestId));
  return { meeting, guest };
};

// ---------- invite building ----------

const memberEmailSet = async (organisation_id, emails) => {
  const found = new Set();
  const regexes = emails.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i"));
  await Promise.all(
    Object.entries(MODELS).map(async ([model, Model]) => {
      const field = model === "SuperAdmin" ? "email" : "work_email";
      const filter = { [field]: { $in: regexes }, ...(model === "SuperAdmin" ? { _id: organisation_id } : { organisation_id }) };
      const docs = await Model.find(filter).select(field).lean();
      for (const d of docs) if (d[field]) found.add(String(d[field]).toLowerCase());
    })
  );
  return found;
};

// Validates a raw [{email, name}] list and builds the guest sub-documents.
// `existing` = guests already on the meeting (to skip duplicates / revive revoked ones).
// Returns { entries: [{ pin, doc, revive }], skipped: [{ email, reason }] }
const prepareGuests = async (actor, raw, { existing = [] } = {}) => {
  const list = Array.isArray(raw) ? raw : [];
  const skipped = [];
  const seen = new Set();
  const cleaned = [];
  for (const item of list.slice(0, MAX_GUESTS * 2)) {
    const email = String((item && (item.email || item)) || "").trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email) || email.length > 254) { skipped.push({ email, reason: "invalid_email" }); continue; }
    if (seen.has(email)) continue;
    seen.add(email);
    cleaned.push({ email, name: cleanName(item && item.name) });
  }
  if (!cleaned.length) return { entries: [], skipped };

  const members = await memberEmailSet(actor.organisation_id, cleaned.map((c) => c.email));
  const byEmail = new Map(existing.map((g) => [g.email, g]));
  const activeCount = existing.filter((g) => !g.revoked).length;

  const entries = [];
  for (const c of cleaned) {
    if (members.has(c.email)) { skipped.push({ email: c.email, reason: "already_member" }); continue; }
    const prev = byEmail.get(c.email);
    if (prev && !prev.revoked) { skipped.push({ email: c.email, reason: "already_invited" }); continue; }
    if (activeCount + entries.filter((e) => !e.revive).length >= MAX_GUESTS) { skipped.push({ email: c.email, reason: "limit_reached" }); continue; }
    const { pin, fields } = await makePinFields();
    entries.push({
      pin,
      revive: !!prev,
      doc: {
        guestId: prev ? prev.guestId : new mongoose.Types.ObjectId(),
        email: c.email,
        name: c.name || (prev && prev.name) || "",
        ...fields,
        invitedAt: new Date(),
        invitedByKey: actor.key,
        revoked: false,
        revokedAt: null,
      },
    });
  }
  return { entries, skipped };
};

// ---------- email ----------

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "").replace(/\/$/, "");
const guestJoinUrl = (meetingId) => (FRONTEND_URL() ? `${FRONTEND_URL()}${process.env.MEETING_GUEST_JOIN_PATH || "/meeting-guest"}/${meetingId}` : "");

const validTz = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return "Asia/Kolkata"; } };
const fmtWhen = (d, tz) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: validTz(tz) }).format(new Date(d));

const guestEmailHtml = ({ meetings, host, guest, pin, cancelled = false, updated = false }) => {
  const first = meetings[0];
  const sessions = meetings.slice(0, 10).map((m) => {
    const url = guestJoinUrl(m._id);
    return `<li style="margin:4px 0">${escapeHtml(fmtWhen(m.startTime, m.timezone))} (${escapeHtml(m.timezone)})${url && !cancelled ? ` &ndash; <a href="${escapeHtml(url)}">join link</a>` : ""}</li>`;
  }).join("");
  const url = guestJoinUrl(first._id);
  const intro = cancelled
    ? "This meeting has been cancelled."
    : updated
      ? `${escapeHtml(host.name)} updated the details of this ${first.media} meeting. Your PIN has not changed.`
      : `${escapeHtml(host.name)} invited you to a ${first.media} meeting. You don't need an account &ndash; just use your PIN below.`;
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#730042;margin-bottom:4px">${escapeHtml(first.title)}</h2>
    <p style="color:#555;margin-top:0">${intro}</p>
    ${guest.name ? `<p>Hi ${escapeHtml(guest.name)},</p>` : ""}
    <p><b>${meetings.length > 1 ? "Sessions" : "When"}:</b></p>
    <ul style="padding-left:18px;margin-top:4px">${sessions}</ul>
    ${first.description ? `<p>${escapeHtml(first.description)}</p>` : ""}
    ${first.agenda ? `<p><b>Agenda:</b><br>${escapeHtml(first.agenda).replace(/\n/g, "<br>")}</p>` : ""}
    ${!cancelled && pin ? `<p style="margin:20px 0 6px"><b>Your meeting PIN</b></p>
      <div style="font-size:30px;letter-spacing:8px;font-weight:700;background:#f6eef2;border:1px dashed #CD166E;border-radius:8px;padding:12px 18px;display:inline-block">${escapeHtml(pin)}</div>
      <p style="color:#555;font-size:13px">Open the link, enter this email address (${escapeHtml(guest.email)}) and the PIN. The host will admit you from the waiting room. Please don't share this PIN &ndash; it is only for you.</p>` : ""}
    ${!cancelled && url ? `<p><a href="${escapeHtml(url)}" style="background:#CD166E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Join meeting</a></p>` : ""}
  </div>`;
};

// Fire-and-forget. `meetings` = every occurrence the guest was added to (first one is shown in detail).
const emailGuests = (meetings, host, entries, { method = "REQUEST", updated = false } = {}) => {
  if (!meetings.length || !entries.length) return;
  const first = meetings[0];
  const cancelled = method === "CANCEL";
  const when = fmtWhen(first.startTime, first.timezone);
  const subject = `${cancelled ? "Cancelled" : updated ? "Updated invitation" : "Invitation"}: ${first.title} @ ${when}`;

  (async () => {
    for (let i = 0; i < entries.length; i += 5) {
      await Promise.all(
        entries.slice(i, i + 5).map(({ guest, pin }) => {
          const ics = buildIcs(
            { id: String(first._id), title: first.title, description: first.description, agenda: first.agenda, startTime: first.startTime, endTime: first.endTime, sequence: first.sequence },
            { method, organizer: { name: host.name, email: host.email }, attendees: [{ name: guest.name, email: guest.email }], url: guestJoinUrl(first._id) }
          );
          return sendEmail({
            to: guest.email,
            subject,
            html: guestEmailHtml({ meetings, host, guest, pin, cancelled, updated }),
            attachments: [{ filename: "invite.ics", content: ics, contentType: `text/calendar; charset=utf-8; method=${method}` }],
          }).catch((e) => console.error("[meeting] guest email failed:", e.message));
        })
      );
    }
  })();
};

// Tells existing (non-revoked) guests about a reschedule / edit / cancellation. No PIN in these.
const notifyGuestsOfChange = async (meeting, actor, method, updated = false) => {
  const guests = (meeting.guests || []).filter((g) => !g.revoked);
  if (!guests.length) return;
  const [host] = [...(await resolvePeople(actor.organisation_id, [{ model: meeting.hostModel, id: meeting.host }])).values()];
  if (!host) return;
  emailGuests([meeting], host, guests.map((g) => ({ guest: g, pin: null })), { method, updated });
};

// ---------- join (public) ----------

const ipHits = new Map(); // ip -> { start, n }
const ipAllowed = (ip) => {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || now - rec.start > 10 * 60 * 1000) { ipHits.set(ip, { start: now, n: 1 }); return true; }
  rec.n += 1;
  if (ipHits.size > 5000) for (const [k, v] of ipHits) if (now - v.start > 10 * 60 * 1000) ipHits.delete(k);
  return rec.n <= 30;
};

const guestLogin = async ({ meetingId, email, pin, name, ip }) => {
  const bad = () => httpError("Invalid email or PIN.", 401);
  if (!ipAllowed(ip || "?")) throw httpError("Too many attempts. Please wait a few minutes and try again.", 429);

  const e = String(email || "").trim().toLowerCase();
  const p = String(pin || "").trim();
  if (!mongoose.isValidObjectId(meetingId) || !EMAIL_RE.test(e) || !/^\d{6}$/.test(p)) throw bad();

  const m = await Meeting.findOne({ _id: meetingId, "guests.email": e });
  const g = m && m.guests.find((x) => x.email === e);
  if (!m || !g || g.revoked) throw bad();

  if (m.status === "cancelled") throw Object.assign(httpError("This meeting was cancelled.", 410), { code: "MEETING_CANCELLED" });
  if (m.status === "ended" || Date.now() > m.endTime.getTime() + LATE_GRACE_MS) throw Object.assign(httpError("This meeting has ended.", 410), { code: "MEETING_ENDED" });

  const now = Date.now();
  if (g.lockedUntil && g.lockedUntil.getTime() > now) {
    const mins = Math.ceil((g.lockedUntil.getTime() - now) / 60000);
    throw httpError(`Too many wrong PINs. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask the host to resend your PIN.`, 429);
  }

  if (!(await pinMatches(p, g))) {
    const upd = await Meeting.findOneAndUpdate({ _id: m._id, "guests.guestId": g.guestId }, { $inc: { "guests.$.pinAttempts": 1 } }, { new: true });
    const cur = upd && upd.guests.find((x) => String(x.guestId) === String(g.guestId));
    if (cur && cur.pinAttempts >= MAX_PIN_ATTEMPTS) {
      await Meeting.updateOne({ _id: m._id, "guests.guestId": g.guestId }, { $set: { "guests.$.pinAttempts": 0, "guests.$.lockedUntil": new Date(now + PIN_LOCK_MS) } });
    }
    throw bad();
  }

  const displayName = cleanName(name) || g.name || e.split("@")[0];
  await Meeting.updateOne(
    { _id: m._id, "guests.guestId": g.guestId },
    { $set: { "guests.$.pinAttempts": 0, "guests.$.lockedUntil": null, "guests.$.lastJoinedAt": new Date(), "guests.$.name": displayName }, $inc: { "guests.$.joinCount": 1 } }
  );

  const [host] = [...(await resolvePeople(m.organisation_id, [{ model: m.hostModel, id: m.host }])).values()];
  return {
    token: signGuestToken(m, g, displayName),
    guest: { key: guestKey(g.guestId), id: String(g.guestId), name: displayName, email: g.email },
    meeting: {
      id: String(m._id), title: m.title, media: m.media, status: m.status, roomKey: m.roomKey,
      startTime: m.startTime, endTime: m.endTime, timezone: m.timezone, hostName: host ? host.name : "",
    },
  };
};

// Minimal, non-sensitive details for the join page (no login needed).
const guestMeetingInfo = async (meetingId) => {
  if (!mongoose.isValidObjectId(meetingId)) throw httpError("Meeting not found.", 404);
  const m = await Meeting.findById(meetingId).select("title media status startTime endTime timezone host hostModel organisation_id guests.email").lean();
  if (!m || !(m.guests || []).length) throw httpError("Meeting not found.", 404);
  const [host] = [...(await resolvePeople(m.organisation_id, [{ model: m.hostModel, id: m.host }])).values()];
  return { id: String(m._id), title: m.title, media: m.media, status: m.status, startTime: m.startTime, endTime: m.endTime, timezone: m.timezone, hostName: host ? host.name : "" };
};

// What the host sees. Never includes PIN data.
const publicGuest = (g) => ({
  guestId: String(g.guestId),
  key: guestKey(g.guestId),
  email: g.email,
  name: g.name || "",
  invitedAt: g.invitedAt,
  lastJoinedAt: g.lastJoinedAt || null,
  joinCount: g.joinCount || 0,
  revoked: !!g.revoked,
  locked: !!(g.lockedUntil && new Date(g.lockedUntil).getTime() > Date.now()),
});

module.exports = {
  GUEST_MODEL,
  MAX_GUESTS,
  guestKey,
  isGuestKey,
  prepareGuests,
  makePinFields,
  emailGuests,
  notifyGuestsOfChange,
  guestJoinUrl,
  guestLogin,
  guestMeetingInfo,
  verifyGuestToken,
  loadGuestContext,
  publicGuest,
};
