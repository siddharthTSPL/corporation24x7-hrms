const mongoose = require("mongoose");

// One row per (channel, birthday person, birthday date, days-before, recipient).
// The unique index on `key` is the atomic "claim" the birthday cron takes BEFORE
// sending, so a reminder goes out exactly once even when:
//   - the cron runs several times a day (catch-up after a restart / missed run),
//   - more than one server instance is running,
//   - a recipient deletes / clears the in-app notification (which is what the
//     old notification-based dedupe relied on).
// Rows only matter for a few days, so they self-delete after 30 days.
const birthdayReminderLogSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

module.exports =
  mongoose.models.BirthdayReminderLog ||
  mongoose.model("BirthdayReminderLog", birthdayReminderLogSchema);