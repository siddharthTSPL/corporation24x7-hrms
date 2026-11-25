/**
 * Local test of the monitoring system. Sends REAL alert mails to ALERT_EMAILS,
 * so use it to confirm everything works end to end.
 *
 *   node scripts/Testmonitoring.js mail       # plain test alert mail
 *   node scripts/Testmonitoring.js http500    # route throws + controller-style res.status(500)  -> 2 alert mails
 *   node scripts/Testmonitoring.js reject     # unhandled promise rejection                       -> 1 alert mail
 *   node scripts/Testmonitoring.js crash      # uncaught exception: mail, then the process exits  -> 1 CRITICAL mail
 *   node scripts/Testmonitoring.js cleanup    # delete the [TEST] rows this script left in SystemAlert
 *
 * It writes nothing to attendance/employee data - only (TTL-expiring) rows in the
 * SystemAlert collection, which `cleanup` removes.
 */
require("dotenv").config();
process.env.HEALTH_MONITOR = "off";
process.env.ALERT_ON_BOOT = "false";
const mongoose = require("mongoose");
const http = require("http");

const what = process.argv[2];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (port, path) => new Promise((res) => http.get({ port, path }, (r) => { r.resume(); r.on("end", () => res(r.statusCode)); }).on("error", () => res(0)));

(async () => {
  if (!["mail", "http500", "reject", "crash", "cleanup"].includes(what)) {
    console.log("Usage: node scripts/Testmonitoring.js <mail|http500|reject|crash|cleanup>");
    return;
  }
  await mongoose.connect(process.env.LINK, { family: 4 });
  const stamp = Date.now(); // unique text => unique alert key => no cooldown skipping between test runs

  if (what === "cleanup") {
    const r = await require("../Models/systemalert.model").deleteMany({ title: /\[TEST\]/ });
    console.log(`Deleted ${r.deletedCount} test alert row(s).`);
  }

  if (what === "mail") {
    const { sendAlert, recipients } = require("../utils/Alertmailer.utils");
    const ok = await sendAlert({ key: `test:${stamp}`, severity: "warning", title: "[TEST] alert mail", message: "Alert pipeline works.", force: true });
    console.log(ok ? `✅ mail sent to ${recipients().join(", ")}` : "❌ mail NOT sent - check SMTP_* / NOREPLY_EMAIL in .env");
  }

  if (what === "http500") {
    const express = require("express");
    const requestMonitor = require("../middleware/errorhandling/requestmonitor.middleware");
    const errorHandler = require("../middleware/errorhandling/errorhandling.middleware");
    const app = express();
    app.use(requestMonitor);
    app.get("/boom", (req, res) => {
      console.log("[TEST] /boom: loading employee from DB...");
      const employee = undefined; // pretend the DB found nothing
      console.log("[TEST] /boom: now reading employee.name");
      res.json({ name: employee.name }); // TypeError -> goes through the error middleware
    });
    app.get("/soft", (req, res) => res.status(500).json({ error: `[TEST] controller-style 500 ${stamp}` })); // bypasses it
    app.use(errorHandler);
    const server = app.listen(0);
    const port = server.address().port;
    console.log("GET /boom ->", await get(port, "/boom"));
    console.log("GET /soft ->", await get(port, "/soft"));
    await wait(4000); // let the alert mails go out
    server.close();
    console.log("Check the inbox: 2 mails titled 'HTTP 500 on GET /boom' and 'HTTP 500 on GET /soft'.");
  }

  if (what === "reject") {
    require("../utils/Processguard").installProcessGuard();
    Promise.reject(new Error(`[TEST] unhandled rejection ${stamp}`));
    await wait(5000);
    console.log("Check the inbox: 'Unhandled promise rejection'.");
  }

  if (what === "crash") {
    require("../utils/Processguard").installProcessGuard();
    console.log("Throwing an uncaught exception in 1 second - the process should mail you and then exit...");
    setTimeout(() => { throw new Error(`[TEST] simulated crash ${stamp}`); }, 1000);
    return; // keep the process alive until the guard exits it
  }
})()
  .then(async () => { if (what !== "crash") await mongoose.disconnect(); })
  .catch(async (e) => { console.error("FAILED:", e); process.exitCode = 1; await mongoose.disconnect(); });
