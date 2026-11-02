// Background work for chat, every 30 seconds:
//   * send scheduled messages that are due
//   * delete disappearing messages that have expired
// Safe on several servers at once: rows are claimed atomically and cleanup is idempotent.
const cron = require("node-cron");
const scheduled = require("../utils/chat/scheduled.service");
const disappearing = require("../utils/chat/disappearing.service");

let running = false;

const runChatJobs = async () => {
  if (running) return;
  running = true;
  try {
    await scheduled.processDue();
  } catch (err) {
    console.error("[chat jobs] scheduled messages failed:", err.message);
  }
  try {
    // keep going while there is a backlog, but never loop forever
    for (let i = 0; i < 10; i++) if ((await disappearing.sweepExpired()) < 500) break;
  } catch (err) {
    console.error("[chat jobs] disappearing messages cleanup failed:", err.message);
  } finally {
    running = false;
  }
};

cron.schedule("*/30 * * * * *", runChatJobs);

module.exports = { runChatJobs };
