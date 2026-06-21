const cron = require("node-cron");
const ActiveTimer = require("../Models/activetimer.model");

const STALE_HEARTBEAT_MINUTES = 15;

const autoPauseStaleTimers = async () => {
  try {
    const cutoff = new Date(Date.now() - STALE_HEARTBEAT_MINUTES * 60 * 1000);

    const staleTimers = await ActiveTimer.find({
      status: "running",
      last_heartbeat_at: { $lte: cutoff },
    });

    for (const timer of staleTimers) {
  
      const sessionSeconds = Math.floor(
        (timer.last_heartbeat_at - timer.started_at) / 1000
      );
      timer.accumulated_seconds = Math.max(
        timer.accumulated_seconds + sessionSeconds, 
        sessionSeconds
      );

      timer.status = "paused";
      timer.paused_at = timer.last_heartbeat_at;
      timer.is_idle = true;
      timer.idle_since = timer.idle_since || timer.last_heartbeat_at;

      await timer.save();
    }

    if (staleTimers.length) {
      console.log(`[Timer Auto-Pause] Paused ${staleTimers.length} stale timer(s)`);
    }
  } catch (error) {
    console.error("[Timer Auto-Pause] Error:", error.message);
  }
};

cron.schedule("*/5 * * * *", autoPauseStaleTimers);

module.exports = autoPauseStaleTimers;