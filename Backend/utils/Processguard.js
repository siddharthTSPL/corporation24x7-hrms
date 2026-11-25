const mongoose = require("mongoose");
const { sendAlert, sendAlertWithTimeout } = require("./Alertmailer.utils");
const { install: installLogBuffer } = require("./Logbuffer.utils");

// Catches the things that kill or silently break a Node process:
//   - uncaughtException   -> mail, then exit(1) so the process manager restarts a clean process
//   - unhandledRejection  -> mail (process keeps running)
//   - MongoDB disconnect / error / reconnect
//   - server (re)start    -> info mail, so a crash loop is visible as repeated "started" mails
// Call installProcessGuard() once, as early as possible in server.js.
let installed = false;

const installProcessGuard = () => {
  if (installed) return;
  installed = true;
  installLogBuffer(); // remember recent console lines so alert mails can show them

  process.on("uncaughtException", async (err, origin) => {
    console.error("💥 uncaughtException:", err);
    await sendAlertWithTimeout({
      key: `crash:${(err && err.message) || "unknown"}`.slice(0, 180),
      severity: "critical",
      title: "Server CRASHED (uncaught exception)",
      message: `${err && err.message}\norigin: ${origin}`,
      error: err,
    });
    process.exit(1); // let pm2/Render/systemd restart a clean process
  });

  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    sendAlert({
      key: `unhandled:${err.message}`.slice(0, 180),
      severity: "error",
      title: "Unhandled promise rejection",
      message: err.message,
      error: err,
    });
  });

  // A disconnect WE asked for (graceful shutdown, scripts) is not an incident.
  let intentionalDisconnect = false;
  const origDisconnect = mongoose.disconnect.bind(mongoose);
  mongoose.disconnect = (...args) => { intentionalDisconnect = true; return origDisconnect(...args); };
  const origClose = mongoose.connection.close.bind(mongoose.connection);
  mongoose.connection.close = (...args) => { intentionalDisconnect = true; return origClose(...args); };

  let dbWasDown = false;
  mongoose.connection.on("disconnected", () => {
    if (intentionalDisconnect) return;
    dbWasDown = true;
    sendAlert({ key: "db:disconnected", severity: "critical", title: "MongoDB disconnected", message: "Mongoose lost its database connection. It will retry automatically." });
  });
  mongoose.connection.on("error", (err) => {
    sendAlert({ key: `db:error:${err.message}`.slice(0, 180), severity: "critical", title: "MongoDB connection error", message: err.message, error: err });
  });
  mongoose.connection.on("reconnected", () => {
    if (!dbWasDown) return;
    dbWasDown = false;
    sendAlert({ key: "db:reconnected", severity: "info", title: "MongoDB reconnected", message: "Database connection is back.", force: true });
  });

  if (process.env.ALERT_ON_BOOT !== "false") {
    // Delay a little so the DB connection (used for dedup bookkeeping) is up.
    setTimeout(() => {
      sendAlert({
        key: "boot",
        severity: "info",
        title: "Server started / restarted",
        message: `Node ${process.version}, pid ${process.pid}, env ${process.env.NODE_ENV || "development"}.\nIf you see this many times in a short while the server is crash-looping.`,
      });
    }, 15000).unref();
  }
};

module.exports = { installProcessGuard };
