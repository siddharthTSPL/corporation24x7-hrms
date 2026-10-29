const cron = require("node-cron");
const MeetingActionItem = require("../Models/meetingactionitem.model");
const Meeting = require("../Models/meeting.model");
const { createBulkNotifications } = require("../utils/Notification.utils");
const { emitToRecipient } = require("../config/socket");
const { parseKey } = require("../utils/chat/people.utils");

const WINDOW_MS = 24 * 60 * 60 * 1000;
let running = false;

const runActionItemReminders = async () => {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const due = await MeetingActionItem.find({
      status: "open",
      dueDate: { $ne: null, $lte: new Date(now.getTime() + WINDOW_MS) },
      dueReminderSentAt: null,
    })
      .limit(500)
      .lean();
    if (!due.length) return;

    const meetings = await Meeting.find({ _id: { $in: [...new Set(due.map((d) => String(d.meeting)))] } }).select("title").lean();
    const titleOf = new Map(meetings.map((m) => [String(m._id), m.title]));

    for (const item of due) {
      const claimed = await MeetingActionItem.findOneAndUpdate({ _id: item._id, status: "open", dueReminderSentAt: null }, { $set: { dueReminderSentAt: now } }, { new: true }).lean();
      if (!claimed) continue;
      const p = parseKey(claimed.assigneeKey);
      const overdue = new Date(claimed.dueDate).getTime() < now.getTime();
      await createBulkNotifications({
        recipients: [{ recipientModel: p.model, recipientId: p.id }],
        organisation_id: claimed.organisation_id,
        type: "meeting",
        title: overdue ? "Action item overdue" : "Action item due soon",
        message: `"${claimed.title}" from "${titleOf.get(String(claimed.meeting)) || "a meeting"}" is ${overdue ? "overdue" : "due within 24 hours"}.`,
        link: `/meetings/${claimed.meeting}`,
        priority: "high",
        createdByModel: "System",
        meta: { meetingId: String(claimed.meeting), actionItemId: String(claimed._id) },
      });
      emitToRecipient(p.model, p.id, "meeting:action-item", { meetingId: String(claimed.meeting), actionItemId: String(claimed._id), reason: overdue ? "overdue" : "due_soon" });
    }
  } catch (err) {
    console.error("[Meeting action reminders] Error:", err.message);
  } finally {
    running = false;
  }
};

cron.schedule("*/15 * * * *", runActionItemReminders);

module.exports = runActionItemReminders;
