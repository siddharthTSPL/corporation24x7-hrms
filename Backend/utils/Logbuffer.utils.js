const { AsyncLocalStorage } = require("async_hooks");
const { format } = require("util");

// Keeps the last ~300 console lines in memory, and - per HTTP request - the
// lines that request itself printed (AsyncLocalStorage follows the request
// across awaits). Alert mails attach these so you see WHAT the server was
// doing right before the error. Nothing is written to disk.
const als = new AsyncLocalStorage();
const ring = [];
let installed = false;

const install = () => {
  if (installed) return;
  installed = true;
  ["log", "info", "warn", "error"].forEach((level) => {
    const orig = console[level].bind(console);
    console[level] = (...args) => {
      try {
        const line = { t: Date.now(), level, text: format(...args).slice(0, 600) };
        ring.push(line);
        if (ring.length > 300) ring.shift();
        const store = als.getStore();
        if (store && store.logs.length < 80) store.logs.push(line);
      } catch { /* never break logging */ }
      orig(...args);
    };
  });
};

const NOISE = /^(Email sent|Email transporter|\[dotenv|\[ALERT\])/;
const clean = (lines) => lines.filter((l) => !NOISE.test(l.text));

const ist = (t) => new Date(t).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + "." + String(t % 1000).padStart(3, "0");
const fmtLines = (lines) => lines.map((l) => `${ist(l.t)} ${l.level.toUpperCase().padEnd(5)} ${l.text}`).join("\n");

const getRecent = (n = 30) => clean(ring).slice(-n);
const getRequestLogs = () => clean(als.getStore()?.logs || []);

module.exports = { install, als, getRecent, getRequestLogs, fmtLines };
