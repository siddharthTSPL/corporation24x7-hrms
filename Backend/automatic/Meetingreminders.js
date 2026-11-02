const cron = require("node-cron");
const Meeting = require("../Models/meeting.model");
const { createBulkNotifications } = require("../utils/Notification.utils");
const { emitToRecipient } = require("../config/socket");
const rooms = require("../utils/chat/callRooms");
const { closeStaleSessions } = require("../utils/chat/call.service");
const { parseKey } = require("../utils/chat/people.utils");

const GRACE_MIN = 15; // after end time, with nobody in the room, a meeting is closed
let running = false;

const runMeetingJobs = async () => {
  if (running) return;
  running = true;
  try {
    const now = new Date();

    // 1) reminders: claim each meeting atomically so overlapping runs can't double-send
    const due = await Meeting.find({
      status: "scheduled",
      reminderSentAt: null,
      reminderMinutes: { $gt: 0 },
      startTime: { $gt: now },
      $expr: { $lte: [{ $subtract: ["$startTime", { $multiply: ["$reminderMinutes", 60000] }] }, now] },
    }).select("_id").limit(200).lean();

    for (const { _id } of due) {
      const m = await Meeting.findOneAndUpdate({ _id, reminderSentAt: null, status: "scheduled" }, { $set: { reminderSentAt: now } }, { new: true }).lean();
      if (!m) continue;
      const keys = [...new Set([...m.attendees.filter((a) => a.rsvp !== "declined").map((a) => a.key), ...(m.interestedKeys || [])])];
      const mins = Math.max(1, Math.round((m.startTime - now) / 60000));
      await createBulkNotifications({
        recipients: keys.map((k) => { const p = parseKey(k); return { recipientModel: p.model, recipientId: p.id }; }),
        organisation_id: m.organisation_id,
        type: "meeting",
        title: "Meeting starting soon",
        message: `"${m.title}" starts in ${mins} minute${mins === 1 ? "" : "s"}.`,
        link: `/meetings/${m._id}`,
        priority: "high",
        createdByModel: "System",
        meta: { meetingId: String(m._id) },
      });
      for (const k of keys) {
        const p = parseKey(k);
        emitToRecipient(p.model, p.id, "meeting:reminder", { meetingId: String(m._id), title: m.title, startTime: m.startTime, minutes: mins });
      }
    }

    // 2) housekeeping: close meetings that are over and empty
    const cutoff = new Date(now.getTime() - GRACE_MIN * 60000);
    const stale = await Meeting.find({ status: { $in: ["scheduled", "live"] }, endTime: { $lt: cutoff } }).select("_id roomKey").limit(500).lean();
    const ids = stale.filter((m) => !rooms.get(m.roomKey)).map((m) => m._id);
    if (ids.length) await Meeting.updateMany({ _id: { $in: ids } }, { $set: { status: "ended", endedAt: now } });
  } catch (err) {
    console.error("[Meeting jobs] Error:", err.message);
  } finally {
    running = false;
  }
};

// Calls that were live in memory when the server last stopped can never finish.
closeStaleSessions()
  .then((n) => n && console.log(`[Calls] closed ${n} stale call session(s) from before restart`))
  .catch((err) => console.error("[Calls] stale cleanup failed:", err.message));

cron.schedule("* * * * *", runMeetingJobs);

module.exports = runMeetingJobs;
