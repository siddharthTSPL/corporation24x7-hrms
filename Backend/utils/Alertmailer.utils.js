const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();
const { getRecent, fmtLines } = require("./Logbuffer.utils");

// ---------------------------------------------------------------------------
// Central place every monitoring piece uses to report a problem.
//   sendAlert({ key, severity, title, message, error, details, fixed,
//               context, hint, logs, plain })
//
// Mail layout (plain words first, technical detail below):
//   KYA HUA -> KAHAN HUA (route + code line) -> REQUEST -> ERROR MESSAGE ->
//   KYA KAREIN -> DETAILS -> LOGS of that request -> LAST SERVER LOGS -> STACK
//
// - Recipients: ALERT_EMAILS env (comma separated), else the two defaults.
// - Same `key` is mailed at most once per cooldown (critical 15 min, others
//   ALERT_COOLDOWN_MIN, default 60); max ALERT_MAX_PER_HOUR mails/hour.
// - Never throws. Secrets (DB URIs, tokens, passwords) are redacted.
// ---------------------------------------------------------------------------
const DEFAULT_RECIPIENTS = ["ashishgangwar009@gmail.com", "muzeemsaifi88@gmail.com"];

const recipients = () => {
  const raw = (process.env.ALERT_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return raw.length ? raw : DEFAULT_RECIPIENTS;
};

const cooldownMs = (severity) =>
  (severity === "critical" ? 15 : Number(process.env.ALERT_COOLDOWN_MIN) || 60) * 60 * 1000;

const MAX_PER_HOUR = Number(process.env.ALERT_MAX_PER_HOUR) || 20;
const COLORS = { critical: "#b91c1c", error: "#dc2626", warning: "#d97706", info: "#2563eb" };

const memLastSent = new Map();
let sentTimes = [];
let suppressed = 0;

const redact = (value) =>
  String(value ?? "")
    .replace(/mongodb(\+srv)?:\/\/[^\s'"]+/gi, "mongodb://[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, "[JWT REDACTED]")
    .replace(/(password|passwd|pwd|secret|token|api[_-]?key|authorization)(["']?\s*[:=]\s*["']?)[^\s,"'}&]+/gi, "$1$2[REDACTED]");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const toText = (details) => {
  if (details == null) return "";
  if (typeof details === "string") return details;
  try { return JSON.stringify(details, null, 2); } catch { return String(details); }
};

// First stack frame that is OUR code (not node_modules / node internals).
const codeLocation = (stack) => {
  if (!stack) return null;
  for (const line of String(stack).split("\n")) {
    const m = line.match(/\(?((?:[A-Za-z]:)?[^()\s]+?):(\d+):(\d+)\)?\s*$/);
    if (!m) continue;
    const file = m[1];
    if (file.includes("node_modules") || file.startsWith("node:")) continue;
    const fn = (line.match(/at\s+(.+?)\s+\(/) || [])[1];
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    return `${rel}:${m[2]}${fn ? `   (function: ${fn})` : ""}`;
  }
  return null;
};

// Plain-language explanation of the most common errors.
const explain = (text) => {
  const t = String(text || "");
  let m;
  if ((m = t.match(/Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/i)))
    return { what: `Code ne '${m[2] || "kisi field"}' padhne ki koshish ki, par jis object par padh raha tha wo ${m[1]} tha (value hi nahi mili).`,
      fix: "Neeche 'Code location' wali line kholo. Us line se pehle wala variable check karo - aksar DB me record nahi mila, ya request me koi field bheji hi nahi gayi. Fix: `obj?.field` ya `if (!obj) return res.status(404)...` lagao." };
  if (/is not a function/i.test(t))
    return { what: "Code ne kisi cheez ko function ki tarah chalaya jo function hai hi nahi.", fix: "Code location kholo - import/require ka naam galat ho sakta hai, ya function export nahi hua." };
  if (/is not defined/i.test(t))
    return { what: "Code me ek variable use hua jo kahin declare/import nahi kiya gaya.", fix: "Code location par jaake us variable ka import ya spelling check karo." };
  if (/Cast to ObjectId failed|CastError/i.test(t))
    return { what: "Kisi API ko galat format ki id mili (ObjectId 24 characters ki honi chahiye).", fix: "Frontend se jo id bheji ja rahi hai wo check karo (undefined / khali / galat id to nahi)." };
  if (/ValidationError|validation failed/i.test(t))
    return { what: "DB me save karte time koi required field missing ya galat value thi.", fix: "Error message me jo field naam hai uski value request me check karo." };
  if (/E11000|duplicate key/i.test(t))
    return { what: "Wahi value dobara save karne ki koshish hui jo unique hai (duplicate).", fix: "Message me field aur value hai - check karo wo pehle se DB me hai kya. Purana unique index bhi wajah ho sakta hai." };
  if (/MongoServerSelectionError|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo|buffering timed out|topology was destroyed/i.test(t))
    return { what: "Server database (ya kisi bahari service) tak pahunch nahi pa raha.", fix: "Internet / Atlas cluster status dekho, Atlas me server ka IP whitelisted hai ya nahi, aur .env ka LINK sahi hai ya nahi." };
  if (/JsonWebTokenError|jwt (malformed|expired)|invalid signature/i.test(t))
    return { what: "Login token invalid ya expire hai.", fix: "Agar bahut zyada aa raha hai to JWT_SECRET .env me badla to nahi? Ek user ka ho to wo dobara login kare." };
  if (/EAUTH|Invalid login|535|SMTP|ESOCKET/i.test(t))
    return { what: "Mail bhejne me SMTP login / connection fail hua.", fix: "NOREPLY_EMAIL, NOREPLY_EMAIL_PASSWORD, SMTP_HOST, SMTP_PORT dekho. Mail password badla ho sakta hai." };
  if (/heap|ENOMEM|out of memory/i.test(t))
    return { what: "Server ki memory khatam ho rahi hai.", fix: "Kisi bade query / bade array / memory leak ko dhundo; server restart karna temporary solution hai." };
  return { what: "Server me ek unexpected error aaya.", fix: "'Code location' wali file:line se shuru karo, aur neeche ke logs padho ki us waqt server kya kar raha tha." };
};

const section = (title, body) => (body ? `\n── ${title} ──\n${body}` : "");

const buildMail = ({ severity, title, message, stack, details, fixed, count, host, context, hint, requestLogs, recentLogs, plain }) => {
  const color = COLORS[severity] || COLORS.error;
  const env = process.env.NODE_ENV || "development";
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const head = `${severity.toUpperCase()}: ${title}`;
  const meta = `Env: ${env} | Host: ${host} | ${when} IST${count > 1 ? ` | seen ${count}x` : ""}`;

  const blocks = []; // [heading, text]
  if (plain) {
    blocks.push(["", redact(message)]);
  } else {
    const ex = hint || explain(`${message}\n${stack}`);
    const loc = codeLocation(stack);
    if (fixed) blocks.push(["AUTO-FIXED", "✅ System ne ye problem khud theek kar di (details neeche)."]);
    blocks.push(["KYA HUA (simple me)", ex.what]);
    if (loc || context?.request?.route) {
      blocks.push(["KAHAN HUA", [context?.request?.route ? `Route         : ${context.request.route}` : "", loc ? `Code location : ${loc}` : ""].filter(Boolean).join("\n")]);
    }
    if (context?.request) {
      const r = context.request;
      blocks.push(["KIS REQUEST PE", [
        r.url && `URL           : ${r.url}`,
        r.status && `Status        : ${r.status}${r.durationMs != null ? `  (took ${r.durationMs} ms)` : ""}`,
        r.user && `User          : ${r.user}`,
        r.ip && `IP            : ${r.ip}`,
        r.userAgent && `Browser/App   : ${r.userAgent}`,
        r.params && Object.keys(r.params).length && `URL params    : ${JSON.stringify(r.params)}`,
        r.bodyKeys && r.bodyKeys.length && `Body fields   : ${r.bodyKeys.join(", ")}   (values not logged)`,
      ].filter(Boolean).map(redact).join("\n")]);
    }
    blocks.push(["ERROR MESSAGE", redact(message)]);
    blocks.push(["KYA KAREIN", ex.fix]);
    if (details) blocks.push(["DETAILS", redact(toText(details))]);
    if (requestLogs?.length) blocks.push(["LOGS - is request ne ye print kiya", redact(fmtLines(requestLogs))]);
    if (recentLogs?.length) blocks.push(["LOGS - server ki aakhri lines", redact(fmtLines(recentLogs))]);
    if (stack) blocks.push(["FULL STACK TRACE", redact(stack)]);
  }

  const text = [head, meta, ...blocks.filter(([, b]) => b).map(([h, b]) => (h ? section(h, b) : `\n${b}`))].join("\n");
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:760px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <div style="background:${color};color:#fff;padding:14px 18px"><div style="font-size:12px;letter-spacing:1px">${esc(severity.toUpperCase())}</div><div style="font-size:18px;font-weight:600">${esc(title)}</div></div>
  <div style="padding:14px 18px;font-size:14px;color:#111827">
    <p style="margin:0 0 10px;color:#6b7280;font-size:12px">${esc(meta)}</p>
    ${blocks.filter(([, b]) => b).map(([h, b]) => `${h ? `<div style="margin:14px 0 4px;font-size:12px;font-weight:700;letter-spacing:.5px;color:${h === "KYA KAREIN" ? "#065f46" : h === "KYA HUA (simple me)" ? color : "#374151"}">${esc(h)}</div>` : ""}<pre style="white-space:pre-wrap;word-break:break-word;margin:0;background:${h === "KYA KAREIN" ? "#ecfdf5" : "#f9fafb"};border:1px solid #e5e7eb;border-radius:6px;padding:10px;font-size:12px;line-height:1.5;font-family:Consolas,Menlo,monospace">${esc(b)}</pre>`).join("")}
  </div></div>`;
  return { text, html };
};

const touchDb = async ({ key, severity, title, message, stack, details, fixed }) => {
  if (mongoose.connection.readyState !== 1) return null;
  try {
    const SystemAlert = require("../Models/systemalert.model");
    return await SystemAlert.findOneAndUpdate(
      { key },
      {
        $set: { severity, title, message: redact(message).slice(0, 2000), stack: redact(stack).slice(0, 4000), meta: details ?? null, lastSeenAt: new Date(), ...(fixed ? { autoFixed: true } : {}) },
        $inc: { count: 1 },
        $setOnInsert: { firstSeenAt: new Date() },
      },
      { upsert: true, returnDocument: "after" }
    ).lean();
  } catch (e) {
    console.error("[Alert] db bookkeeping failed:", e.message);
    return null;
  }
};

const markEmailed = async (key) => {
  if (mongoose.connection.readyState !== 1) return;
  try { await require("../Models/systemalert.model").updateOne({ key }, { $set: { lastEmailedAt: new Date() } }); } catch { /* ignore */ }
};

/**
 * @param {object} p
 * @param {object} [p.context]     { request: { route, url, status, durationMs, user, ip, userAgent, params, bodyKeys } }
 * @param {{what:string,fix:string}} [p.hint]  override the auto explanation
 * @param {Array}  [p.requestLogs] log lines printed by the failing request
 * @param {boolean} [p.logs=true]  attach the last server log lines
 * @param {boolean} [p.plain]      render only `message` (used for the hourly report)
 * @returns {Promise<boolean>} true if a mail was actually sent
 */
const sendAlert = async ({ key, severity = "error", title, message = "", error = null, details = null, fixed = false, force = false, context = null, hint = null, requestLogs = null, logs = true, plain = false }) => {
  try {
    const k = key || `${severity}:${title}`.slice(0, 180);
    const stack = error?.stack || "";
    const msg = message || error?.message || "";
    console.error(`[ALERT][${severity}] ${title} - ${redact(msg).slice(0, 300)}`);

    const doc = await touchDb({ key: k, severity, title, message: msg, stack, details, fixed });
    const now = Date.now();
    const lastMs = doc?.lastEmailedAt ? new Date(doc.lastEmailedAt).getTime() : memLastSent.get(k) || 0;
    if (!force && now - lastMs < cooldownMs(severity)) return false;

    sentTimes = sentTimes.filter((t) => now - t < 60 * 60 * 1000);
    if (!force && sentTimes.length >= MAX_PER_HOUR && severity !== "critical") { suppressed++; return false; }

    const host = require("os").hostname();
    // Server-wide recent lines, minus the ones already shown as "this request's logs".
    const seen = new Set((requestLogs || []).map((l) => `${l.t}|${l.text}`));
    const recentLogs = logs && !plain ? getRecent(40).filter((l) => !seen.has(`${l.t}|${l.text}`)).slice(requestLogs?.length ? -15 : -30) : null;
    const { text, html } = buildMail({ severity, title, message: msg, stack, details, fixed, count: doc?.count || 1, host, context, hint, requestLogs, recentLogs, plain });
    const prefix = process.env.ALERT_SUBJECT_PREFIX || "HRMS";
    const subject = `[${prefix}][${severity.toUpperCase()}] ${title}${suppressed ? ` (+${suppressed} suppressed)` : ""}`.slice(0, 200);

    const { sendEmail } = require("./nodemailer.utils");
    await sendEmail({ to: recipients().join(","), subject, html, text, mailbox: "noreply" });

    memLastSent.set(k, now);
    sentTimes.push(now);
    suppressed = 0;
    await markEmailed(k);
    return true;
  } catch (e) {
    console.error("[Alert] could not send alert mail:", e.message);
    return false;
  }
};

const sendAlertWithTimeout = (payload, ms = 8000) =>
  Promise.race([sendAlert({ ...payload, force: true }), new Promise((r) => setTimeout(() => r(false), ms))]);

module.exports = { sendAlert, sendAlertWithTimeout, redact, recipients, _buildMail: buildMail };
