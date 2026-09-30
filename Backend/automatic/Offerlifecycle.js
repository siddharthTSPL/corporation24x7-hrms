const cron = require("node-cron");
const OfferLetter = require("../Models/offerletter.model");
const { markOfferExpired, sendOfferReminder } = require("../controllers/Offer.controller");

const REMINDER_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

const runOfferLifecycle = async () => {
  try {
    const now = new Date();

    const overdue = await OfferLetter.find({ status: "SENT", valid_till: { $lt: now } });
    for (const offer of overdue) {
      try {
        await markOfferExpired(offer);
      } catch (err) {
        console.error("[OfferLifecycle] expire failed:", err.message);
      }
    }

    const dueForReminder = await OfferLetter.find({
      status: "SENT",
      valid_till: { $gt: now },
      sent_at: { $lte: new Date(now.getTime() - REMINDER_AFTER_MS) },
      reminder_count: 0,
      sent_via: "EMAIL",
    });
    for (const offer of dueForReminder) {
      try {
        await sendOfferReminder(offer);
      } catch (err) {
        console.error("[OfferLifecycle] reminder failed:", err.message);
      }
    }
  } catch (err) {
    console.error("[OfferLifecycle] run failed:", err.message);
  }
};

cron.schedule("15 * * * *", runOfferLifecycle, { timezone: "Asia/Kolkata" });

module.exports = { runOfferLifecycle };