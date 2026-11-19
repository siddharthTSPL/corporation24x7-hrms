/**
 * Run every health check on demand and print the result.
 *
 *   node scripts/Healthcheck.js                 # read-only report (no mail, no fixes)
 *   node scripts/Healthcheck.js --deep          # + env vars, SMTP login, 24h alert digest
 *   node scripts/Healthcheck.js --fix           # also apply the SAFE auto-fixes
 *   node scripts/Healthcheck.js --mail          # also email failures to the alert recipients
 *   node scripts/Healthcheck.js --test-mail     # just send a test alert mail and exit
 *   node scripts/Healthcheck.js --digest        # send the hourly system report mail right now
 *
 * Exit code 1 if any check fails (handy for a CI/Task Scheduler job).
 */
process.env.HEALTH_MONITOR = "off"; // don't start the cron jobs inside this one-off run
require("dotenv").config();
const mongoose = require("mongoose");

const has = (f) => process.argv.includes(f);

(async () => {
  await mongoose.connect(process.env.LINK, { family: 4 });

  if (has("--test-mail")) {
    const { sendAlert, recipients } = require("../utils/Alertmailer.utils");
    const sent = await sendAlert({ key: "test-mail", severity: "info", title: "Test alert from Healthcheck.js", message: "If you can read this, alert mails are working.", force: true });
    console.log(sent ? `✅ Test mail sent to ${recipients().join(", ")}` : "❌ Test mail NOT sent - see error above (SMTP settings?)");
    return;
  }

  if (has("--digest")) {
    await require("../automatic/Healthmonitor").runHourlyDigest();
    console.log("✅ Hourly report mail triggered (check the inbox).");
    return;
  }

  const { runHealthChecks } = require("../automatic/Healthmonitor");
  const results = await runHealthChecks({ deep: has("--deep"), fix: has("--fix"), mail: has("--mail") });

  console.log("");
  results.forEach((r) => {
    console.log(`${r.ok ? "✅" : r.fixed ? "🛠️ " : "❌"} ${r.name.padEnd(16)} ${r.message}`);
    if (!r.ok && r.details) console.log("     ", JSON.stringify(r.details));
  });
  const failed = results.filter((r) => !r.ok && !r.fixed && r.name !== "digest");
  console.log(`\n${failed.length ? `${failed.length} problem(s) found.` : "All good."}`);
  if (failed.length) process.exitCode = 1;
})()
  .catch((e) => { console.error("FAILED:", e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());