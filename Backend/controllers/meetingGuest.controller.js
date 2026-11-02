// Outsider (guest) invites for scheduled meetings.
//   Public  : GET  /meetings/guest/:id/info     POST /meetings/guest/join
//   Host    : GET/POST /meetings/:id/guests     POST /meetings/:id/guests/:guestId/resend
//             DELETE /meetings/:id/guests/:guestId
const mongoose = require("mongoose");
const Meeting = require("../Models/meeting.model");
const chat = require("../utils/chat/chat.service");
const calls = require("../utils/chat/call.service");
const rooms = require("../utils/chat/callRooms");
const guests = require("../utils/chat/guest.service");
const { httpError, requirePeople } = require("../utils/chat/people.utils");

const ok = (res, data = {}, status = 200) => res.status(status).json({ success: true, ...data });

const loadModeratedMeeting = async (req) => {
  const actor = chat.toActor(req.actor);
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) throw httpError("Meeting not found.", 404);
  const m = await Meeting.findOne({ _id: id, organisation_id: actor.organisation_id, attendeeKeys: actor.key });
  if (!m) throw httpError("Meeting not found.", 404);
  if (!(m.hostKey === actor.key || m.coHostKeys.includes(actor.key))) throw httpError("Only the host or a co-host can manage guests.", 403);
  return { actor, m };
};

const hostOf = async (actor, m) => [...(await requirePeople(actor.organisation_id, [{ model: m.hostModel, id: m.host }])).values()][0];

// ---------- public ----------

const info = async (req, res) => ok(res, { meeting: await guests.guestMeetingInfo(req.params.id) });

// POST /meetings/guest/join  { meetingId, email, pin, name? }
const join = async (req, res) => {
  const b = req.body || {};
  const out = await guests.guestLogin({ meetingId: b.meetingId, email: b.email, pin: b.pin, name: b.name, ip: req.ip });
  ok(res, out);
};

// ---------- host / co-host ----------

const list = async (req, res) => {
  const { m } = await loadModeratedMeeting(req);
  ok(res, { guests: m.guests.map(guests.publicGuest) });
};

// POST /meetings/:id/guests  { guests: [{ email, name? }], sendEmail?: boolean }
const invite = async (req, res) => {
  const { actor, m } = await loadModeratedMeeting(req);
  if (["ended", "cancelled"].includes(m.status)) throw httpError(`A ${m.status} meeting cannot be edited.`);
  const raw = Array.isArray(req.body?.guests) ? req.body.guests : [];
  if (!raw.length) throw httpError("Add at least one email address.");

  const { entries, skipped } = await guests.prepareGuests(actor, raw, { existing: m.guests });
  const fresh = entries.filter((e) => !e.revive);
  const revived = entries.filter((e) => e.revive);

  if (fresh.length) await Meeting.updateOne({ _id: m._id }, { $push: { guests: { $each: fresh.map((e) => e.doc) } } });
  for (const e of revived) {
    await Meeting.updateOne(
      { _id: m._id, "guests.guestId": e.doc.guestId },
      { $set: { "guests.$.pinHash": e.doc.pinHash, "guests.$.pinSalt": e.doc.pinSalt, "guests.$.pinAttempts": 0, "guests.$.lockedUntil": null, "guests.$.revoked": false, "guests.$.revokedAt": null, "guests.$.invitedAt": new Date(), "guests.$.name": e.doc.name } }
    );
  }

  if (entries.length && req.body?.sendEmail !== false) {
    const host = await hostOf(actor, m);
    guests.emailGuests([m], host, entries.map((e) => ({ guest: e.doc, pin: e.pin })));
  }
  const fresh2 = await Meeting.findById(m._id).select("guests");
  ok(res, { added: entries.map((e) => ({ email: e.doc.email, name: e.doc.name })), skipped, guests: fresh2.guests.map(guests.publicGuest) }, 201);
};

// POST /meetings/:id/guests/:guestId/resend   -> brand-new PIN (old one stops working)
const resend = async (req, res) => {
  const { actor, m } = await loadModeratedMeeting(req);
  if (["ended", "cancelled"].includes(m.status)) throw httpError(`A ${m.status} meeting cannot be edited.`);
  const g = m.guests.find((x) => String(x.guestId) === String(req.params.guestId));
  if (!g || g.revoked) throw httpError("Guest not found.", 404);

  const { pin, fields } = await guests.makePinFields();
  await Meeting.updateOne(
    { _id: m._id, "guests.guestId": g.guestId },
    { $set: { "guests.$.pinHash": fields.pinHash, "guests.$.pinSalt": fields.pinSalt, "guests.$.pinAttempts": 0, "guests.$.lockedUntil": null } }
  );
  const host = await hostOf(actor, m);
  guests.emailGuests([m], host, [{ guest: g, pin }]);
  ok(res, { message: `A new PIN was emailed to ${g.email}.` });
};

// DELETE /meetings/:id/guests/:guestId   -> revoke + remove from the lobby / call
const revoke = async (req, res) => {
  const { actor, m } = await loadModeratedMeeting(req);
  const g = m.guests.find((x) => String(x.guestId) === String(req.params.guestId));
  if (!g) throw httpError("Guest not found.", 404);
  if (!g.revoked) {
    await Meeting.updateOne({ _id: m._id, "guests.guestId": g.guestId }, { $set: { "guests.$.revoked": true, "guests.$.revokedAt": new Date() } });
    await calls.ejectKey(m.roomKey, guests.guestKey(g.guestId), actor.key);
    if (m.status !== "ended") {
      const host = await hostOf(actor, m);
      guests.emailGuests([m], host, [{ guest: g, pin: null }], { method: "CANCEL" });
    }
  }
  ok(res, { revoked: true });
};

module.exports = { info, join, list, invite, resend, revoke };
