const cron = require("node-cron");
const mongoose = require("mongoose");
const v8 = require("v8");
const { monitorEventLoopDelay } = require("perf_hooks");
const { sendAlert } = require("../utils/Alertmailer.utils");
const { startOfISTDay, getISTDateParts } = require("../utils/Istdate.utils");

// ---------------------------------------------------------------------------
// HEALTH MONITOR
//   every 15 min  -> quick checks   (DB, memory, event loop, attendance data)
//   every hour    -> ONE report mail with all problems of the last hour
//   daily 08:00 IST -> deep checks  (env vars, mail transporter)
//
// Each check returns { name, ok, severity, message, details?, fixed? }.
//  - failing check  -> alert mail (deduped via Alertmailer)
//  - was failing, now ok -> one "recovered" mail
//  - SAFE auto-fixes only (HEALTH_AUTOFIX=false turns them off):
//      * leave-status drift  -> re-runs the existing idempotent syncLeaveStatuses()
//      * open check-in from an earlier day -> re-runs the app's own autoCheckoutAll()
//    Anything that would need a guess (odd minutes, duplicates) is REPORTED, never silently rewritten.
// Disable everything with HEALTH_MONITOR=off.
// ---------------------------------------------------------------------------
const AUTOFIX_DEFAULT = process.env.HEALTH_AUTOFIX !== "false";
const DAY = 24 * 60 * 60 * 1000;
const loopHist = monitorEventLoopDelay({ resolution: 20 });
loopHist.enable();

const ok = (name, message = "ok") => ({ name, ok: true, severity: "info", message });
const bad = (name, severity, message, details = null, extra = {}) => ({ name, ok: false, severity, message, details, ...extra });

// ------------------------------ quick checks -------------------------------
const checkDb = async () => {
  if (mongoose.connection.readyState !== 1) return bad("db", "critical", `MongoDB not connected (readyState=${mongoose.connection.readyState})`);
  const t = Date.now();
  await mongoose.connection.db.admin().ping();
  const ms = Date.now() - t;
  return ms > 2000 ? bad("db", "warning", `MongoDB ping is slow: ${ms} ms`) : ok("db", `ping ${ms} ms`);
};

const checkMemory = async () => {
  const { heapUsed } = process.memoryUsage();
  const limit = v8.getHeapStatistics().heap_size_limit;
  const pct = Math.round((heapUsed / limit) * 100);
  const mb = Math.round(heapUsed / 1048576);
  return pct >= 85 ? bad("memory", "warning", `Heap at ${pct}% of limit (${mb} MB) - possible memory leak`) : ok("memory", `${pct}% (${mb} MB)`);
};

const checkEventLoop = async () => {
  const p99 = Math.round(loopHist.percentile(99) / 1e6);
  loopHist.reset();
  return p99 > 1000 ? bad("event_loop", "warning", `Event loop p99 lag ${p99} ms - something is blocking the server (heavy sync work / loop)`) : ok("event_loop", `p99 ${p99} ms`);
};

const sample = (docs) => docs.map((d) => String(d._id)).slice(0, 10);

const checkAttendanceData = async () => {
  const Attendance = require("../Models/attendance.model");
  const since = new Date(startOfISTDay(new Date()).getTime() - 7 * DAY);
  const problems = [];

  // 1) checkOut earlier than checkIn
  const reversed = await Attendance.find({ date: { $gte: since }, checkIn: { $ne: null }, checkOut: { $ne: null }, $expr: { $lt: ["$checkOut", "$checkIn"] } }).select("_id employee date").limit(50).lean();
  if (reversed.length) problems.push({ issue: "checkOut is before checkIn", count: reversed.length, ids: sample(reversed) });

  // 2) active/idle minutes longer than the real session (+ tolerance)
  const impossible = await Attendance.find({
    date: { $gte: since }, checkIn: { $ne: null }, checkOut: { $ne: null },
    $expr: { $gt: [{ $add: ["$activeMinutes", "$idleMinutes"] }, { $add: [{ $divide: [{ $subtract: ["$checkOut", "$checkIn"] }, 60000] }, 15] }] },
  }).select("_id employee date").limit(50).lean();
  if (impossible.length) problems.push({ issue: "active+idle minutes exceed the check-in..check-out time", count: impossible.length, ids: sample(impossible) });

  // 3) duplicate (employee, role, day)
  const dups = await Attendance.aggregate([
    { $match: { date: { $gte: since } } },
    { $group: { _id: { e: "$employee", r: "$role", d: "$date" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
    { $match: { n: { $gt: 1 } } }, { $limit: 20 },
  ]);
  if (dups.length) problems.push({ issue: "duplicate attendance records for the same employee+day (run scripts/mergeDuplicateAttendance.js)", count: dups.length, ids: dups.slice(0, 5).map((d) => d.ids.map(String)) });

  return problems.length
    ? bad("attendance_data", "error", problems.map((p) => `${p.count} x ${p.issue}`).join("; "), problems)
    : ok("attendance_data", "no anomalies in last 7 days");
};


// Open check-in whose OWN shift has already ended = the member never checked
// out and the 5-minute autoCheckoutAll() cron did not close it.
// Every org (and every employee) can have a different shift, so nothing here
// is hard-coded: for each open record the shift is fetched from the DB (the
// record's own `shift`, else the org's resolved shift) and the cutoff is
// computed with the app's getForceCheckoutInstant() = shift end + that shift's
// max-overtime allowance. Only records past that cutoff (+30 min grace for the
// cron) count as stuck - so an overnight shift that is still legitimately
// running is never flagged.
// The fix re-uses the app's own autoCheckoutAll() (status, late penalty,
// overtime and AttendanceSummary follow the app's rules). Orgs with auto
// check-out OFF are skipped entirely. HEALTH_AUTOFIX_ATTENDANCE=false -> report only.
const CRON_GRACE_MS = 30 * 60 * 1000;

const checkStuckSessions = async ({ fix }) => {
  const Attendance = require("../Models/attendance.model");
  const Shift = require("../Models/shift.model");
  const SuperAdmin = require("../Models/superadmin.model");
  const { resolveEmployeeShift, getForceCheckoutInstant } = require("../utils/shift.utils");

  const since = new Date(startOfISTDay(new Date()).getTime() - 7 * DAY);
  const offOrgs = (await SuperAdmin.find({ "attendanceSettings.autoCheckoutEnabled": false }).select("_id").lean()).map((o) => o._id);

  const open = await Attendance.find({
    organisation_id: { $nin: offOrgs },
    date: { $gte: since }, checkIn: { $ne: null }, checkOut: null,
    source: { $in: ["manual", "face"] }, checkoutRemark: { $ne: "missed_checkout" },
  }).select("_id employee date checkIn status shift organisation_id").limit(500).lean();
  if (!open.length) return ok("stuck_sessions", "no open sessions");

  // Fetch each record's shift (cached per shift id / per org).
  const shiftCache = new Map();
  const getShift = async (a) => {
    const ck = a.shift ? `s:${a.shift}` : `o:${a.organisation_id}`;
    if (!shiftCache.has(ck)) {
      let sh = null;
      try { sh = a.shift ? await Shift.findById(a.shift).lean() : null; } catch { /* fall through */ }
      if (!sh) { try { sh = await resolveEmployeeShift({}, a.organisation_id); } catch { sh = null; } }
      shiftCache.set(ck, sh);
    }
    return shiftCache.get(ck);
  };

  const now = Date.now();
  const stuck = [], noShift = [];
  const brief = (d, sh, cutoff) => ({ id: String(d._id), employee: String(d.employee), org: String(d.organisation_id), date: d.date, checkIn: d.checkIn, shift: sh ? `${sh.name || ""} ${sh.startTime}-${sh.endTime}`.trim() : null, cutoff: cutoff || null, statusBefore: d.status });
  for (const d of open) {
    const sh = await getShift(d);
    if (!sh) { noShift.push(brief(d, null)); continue; }
    const cutoff = getForceCheckoutInstant(sh, d.date, d.checkIn);
    if (now >= cutoff.getTime() + CRON_GRACE_MS) stuck.push({ doc: d, row: brief(d, sh, cutoff) });
  }

  if (noShift.length && !stuck.length) {
    return bad("stuck_sessions", "error", `${noShift.length} open check-in(s) whose organisation has no resolvable shift - auto-checkout cannot work for them`, noShift.slice(0, 20));
  }
  if (!stuck.length) return ok("stuck_sessions", `${open.length} open session(s), all still inside their own shift window`);

  const canFix = fix && process.env.HEALTH_AUTOFIX_ATTENDANCE !== "false";
  if (!canFix) return bad("stuck_sessions", "error", `${stuck.length} open check-in(s) are past their shift cutoff with no checkout (run with --fix to auto-checkout)`, stuck.slice(0, 20).map((x) => x.row));

  const ids = stuck.map((x) => x.doc._id);
  // autoCheckoutAll only matches a MISSING checkOut field; normalise explicit nulls first.
  await Attendance.updateMany({ _id: { $in: ids }, checkOut: null }, { $unset: { checkOut: "" } });
  const { autoCheckoutAll } = require("../controllers/attendance.controller");
  await autoCheckoutAll();

  const after = new Map((await Attendance.find({ _id: { $in: ids } }).select("_id checkOut status checkoutRemark").lean()).map((d) => [String(d._id), d]));
  const fixedRows = [], remaining = [];
  for (const { doc, row } of stuck) {
    const a = after.get(String(doc._id));
    const full = { ...row, checkOutNow: a?.checkOut || null, statusNow: a?.status, remark: a?.checkoutRemark };
    (a?.checkOut ? fixedRows : remaining).push(full);
  }
  if (remaining.length) return bad("stuck_sessions", "error", `${fixedRows.length} auto-checked-out, ${remaining.length} could NOT be closed - check manually`, { remaining, fixedRows, noShift });
  return bad("stuck_sessions", "warning", `${fixedRows.length} open check-in(s) past their own shift cutoff were AUTO-CHECKED-OUT (shift end + that shift's overtime allowance)`, fixedRows, { fixed: true });
};

// SAFE auto-fix: approved leave days must not stay "present". Uses the same
// idempotent function the hourly job uses, and keeps out of its 01:00-02:59 IST blackout window.
const checkLeaveDrift = async ({ fix }) => {
  const hourIST = new Date(Date.now() + 5.5 * 3600 * 1000).getUTCHours();
  if (hourIST === 1 || hourIST === 2) return ok("leave_drift", "skipped (nightly job window)");
  const { syncLeaveStatuses } = require("../utils/Leavestatussync.utils");
  const dry = await syncLeaveStatuses({ apply: false });
  if (!dry.corrected) return ok("leave_drift", `scanned ${dry.scanned}, no drift`);
  if (!fix) return bad("leave_drift", "warning", `${dry.corrected} attendance day(s) disagree with approved leaves (run with --fix to repair)`, { months: [...dry.months] });

  const real = await syncLeaveStatuses({ apply: true });
  const { recomputeSummaries } = require("../scripts/Reconcileattendancesummaryleaveaware");
  const now = getISTDateParts(new Date());
  await recomputeSummaries(true, null, { months: [...new Set([`${now.year}-${now.month}`, ...real.months])] });
  return bad("leave_drift", "warning", `${real.corrected} attendance day(s) disagreed with approved leaves - AUTO-FIXED and summaries rebuilt`, { months: [...real.months] }, { fixed: true });
};

// ------------------------------- deep checks -------------------------------
const REQUIRED_ENV = ["LINK", "JWT_SECRET", "SMTP_HOST", "SMTP_PORT", "BASE_URL", "FRONTEND_URL"];
const checkEnv = async () => {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (!(process.env.NOREPLY_EMAIL || process.env.ZOHO_EMAIL)) missing.push("NOREPLY_EMAIL/ZOHO_EMAIL");
  return missing.length ? bad("env", "critical", `Missing environment variables: ${missing.join(", ")}`) : ok("env");
};

const checkMailer = async () => {
  const nodemailer = require("nodemailer");
  const user = process.env.NOREPLY_EMAIL || process.env.ZOHO_EMAIL;
  const pass = process.env.NOREPLY_EMAIL_PASSWORD || process.env.ZOHO_APP_PASSWORD;
  try {
    await nodemailer.createTransport({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT, secure: false, auth: { user, pass } }).verify();
    return ok("mailer", "SMTP login ok");
  } catch (e) {
    return bad("mailer", "critical", `SMTP login failed - OTP / leave / alert mails will NOT go out: ${e.message}`);
  }
};

const checkDigest = async () => {
  const SystemAlert = require("../Models/systemalert.model");
  const rows = await SystemAlert.find({ lastSeenAt: { $gte: new Date(Date.now() - DAY) }, key: { $nin: ["boot"] } }).sort({ count: -1 }).limit(15).lean();
  if (!rows.length) return ok("digest", "no alerts in the last 24h");
  return bad("digest", "info", `${rows.length} distinct problem(s) in the last 24h`, rows.map((r) => `${r.severity.toUpperCase()} x${r.count}${r.autoFixed ? " (auto-fixed)" : ""}: ${r.title}`));
};


// ------------------------------ hourly report ------------------------------
// One mail EVERY hour with every problem seen in the last hour + a snapshot of
// all health checks (read-only, nothing is fixed by this run). It is sent even
// when everything is fine - so if these mails ever STOP arriving, the server
// itself is down.
const SEV_ORDER = { critical: 0, error: 1, warning: 2, info: 3 };
const istTime = (d) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
const fmtUptime = (sec) => `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;

// Pure formatter (easy to test): rows = SystemAlert docs, results = health check results.
const buildDigestText = ({ rows, results, stats, dbError }) => {
  const heapPct = Math.round((process.memoryUsage().heapUsed / v8.getHeapStatistics().heap_size_limit) * 100);
  const problems = rows.filter((r) => r.severity !== "info");
  const failingChecks = results.filter((r) => !r.ok && !r.fixed);
  const lines = [
    `Period : last 1 hour (till ${istTime(new Date())} IST)`,
    `Server : uptime ${fmtUptime(process.uptime())} | heap ${heapPct}% | 5xx responses this hour: ${stats.total}`,
    "",
  ];
  if (dbError) lines.push(`⚠️ Could not read alert history from the database: ${dbError}`, "");

  if (!problems.length && !failingChecks.length && !stats.total && !dbError) {
    lines.push("✅ No errors in the last hour. All health checks are passing.");
  } else {
    lines.push(`PROBLEMS SEEN THIS HOUR (${problems.length})`);
    problems.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.count - a.count).forEach((r) => {
      lines.push(`• [${r.severity.toUpperCase()}] ${r.title}${r.autoFixed ? "  (auto-fixed)" : ""}`);
      if (r.message) lines.push(`    ${String(r.message).split("\n")[0].slice(0, 220)}`);
      lines.push(`    seen ${r.count}x in total, last at ${istTime(r.lastSeenAt)} IST`);
    });
    if (!problems.length) lines.push("  none recorded");

    const topRoutes = Object.entries(stats.routes).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topRoutes.length) {
      lines.push("", "ROUTES WITH 5xx THIS HOUR");
      topRoutes.forEach(([route, n]) => lines.push(`• ${n}x  ${route}`));
    }
  }

  lines.push("", "HEALTH CHECKS (now)");
  results.forEach((r) => lines.push(`${r.ok ? "✅" : r.fixed ? "🛠️" : "❌"} ${r.name.padEnd(16)} ${r.message}`));
  const restarts = rows.find((r) => r.key === "boot");
  if (restarts) lines.push("", `ℹ️ Server (re)started during this hour - last at ${istTime(restarts.lastSeenAt)} IST.`);
  return { text: lines.join("\n"), worst: problems.length ? problems.reduce((w, r) => (SEV_ORDER[r.severity] < SEV_ORDER[w] ? r.severity : w), "info") : failingChecks.length ? "warning" : "info" };
};

const runHourlyDigest = async () => {
  let rows = [], dbError = null;
  try {
    const SystemAlert = require("../Models/systemalert.model");
    rows = await SystemAlert.find({ lastSeenAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, key: { $nin: ["hourly-digest", "test-mail"] } }).lean();
  } catch (e) {
    dbError = e.message;
  }
  const results = await runHealthChecks({ fix: false, mail: false });
  const stats = require("../middleware/errorhandling/requestmonitor.middleware").takeStats();
  const { text, worst } = buildDigestText({ rows, results, stats, dbError });
  const problems = rows.filter((r) => r.severity !== "info").length;
  await sendAlert({
    key: "hourly-digest",
    severity: dbError ? "error" : worst,
    title: problems || stats.total || results.some((r) => !r.ok && !r.fixed) ? `Hourly system report - ${problems} problem(s), ${stats.total} server error(s)` : "Hourly system report - all OK",
    message: text,
    plain: true,
    force: true,
  });
};


// Plain-language help shown in the alert mail for each health check.
const HINTS = {
  db: { what: "Database se connection nahi hai ya bahut slow hai.", fix: "Atlas cluster status, internet, server ka IP whitelist, aur .env ka LINK check karo." },
  memory: { what: "Server ki memory bahut zyada use ho rahi hai.", fix: "Memory leak ho sakta hai (bade arrays / cache). Server restart se temporary rahat milegi; logs me dekho kaunsa kaam baar baar chal raha hai." },
  event_loop: { what: "Server kuch der ke liye atak raha hai (koi bhaari kaam baaki requests ko rok raha hai).", fix: "Bade loops / sync file kaam / bahut bade DB result dhundo, khaaskar cron jobs ke time par." },
  attendance_data: { what: "Attendance records me aisi values hain jo ho nahi sakti (jaise checkout check-in se pehle, ya minutes session se zyada, ya duplicate).", fix: "DETAILS me record ids hain - unhe DB me kholke dekho. Duplicate ke liye: node scripts/mergeDuplicateAttendance.js. Ye sirf report hua hai, kuch badla nahi gaya." },
  stuck_sessions: { what: "Kisi ne check-in kiya par checkout nahi kiya, aur uski shift ka time khatam ho chuka hai.", fix: "Auto-fix ON ho to system khud checkout kar deta hai (DETAILS me dekho). Warna: node scripts/Healthcheck.js --fix" },
  leave_drift: { what: "Approved leave wale din attendance 'present' dikh rahi hai (mismatch).", fix: "Auto-fix ON ho to system sudhar deta hai. Warna: node scripts/Healthcheck.js --fix" },
  env: { what: ".env me koi zaroori setting missing hai.", fix: "Message me jo naam hain unhe .env (aur server ke environment variables) me daalo, phir server restart karo." },
  mailer: { what: "Mail server (SMTP) me login nahi ho raha - OTP, leave mails aur ye alerts bhi nahi jaayengi.", fix: "NOREPLY_EMAIL / NOREPLY_EMAIL_PASSWORD / SMTP_HOST / SMTP_PORT check karo; mail password badla ho sakta hai." },
};

// -------------------------------- runner ----------------------------------
const QUICK = [checkDb, checkMemory, checkEventLoop, checkAttendanceData, checkStuckSessions, checkLeaveDrift];
const DEEP = [checkEnv, checkMailer]; // 24h digest is replaced by the hourly report below
const failing = new Set(); // names that were failing on the previous run
let running = false;

const runHealthChecks = async ({ deep = false, fix = AUTOFIX_DEFAULT, mail = true } = {}) => {
  if (running) return [];
  running = true;
  const results = [];
  try {
    for (const fn of deep ? [...QUICK, ...DEEP] : QUICK) {
      const name = fn.name.replace(/^check/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
      let r;
      try {
        r = await fn({ fix });
      } catch (err) {
        r = bad(name, "error", `The check itself crashed: ${err.message}`, null, { error: err });
      }
      results.push(r);
      if (!mail) continue;

      if (!r.ok) {
        if (r.name !== "digest") failing.add(r.name);
        await sendAlert({
          key: `health:${r.name}${r.fixed ? ":fixed" : ""}`,
          severity: r.severity, title: `Health check: ${r.name}`, message: r.message, details: r.details, error: r.error, fixed: !!r.fixed, hint: HINTS[r.name],
          force: r.name === "digest",
        });
      } else if (failing.has(r.name)) {
        failing.delete(r.name);
        await sendAlert({ key: `health:${r.name}:recovered`, severity: "info", title: `Recovered: ${r.name}`, message: `Health check "${r.name}" is passing again (${r.message}).`, force: true });
      }
    }
  } finally {
    running = false;
  }
  return results;
};

if (process.env.HEALTH_MONITOR !== "off") {
  cron.schedule("*/15 * * * *", () => runHealthChecks().catch((e) => console.error("[Health] quick run failed:", e.message)), { timezone: "Asia/Kolkata" });
  cron.schedule("0 8 * * *", () => runHealthChecks({ deep: true }).catch((e) => console.error("[Health] deep run failed:", e.message)), { timezone: "Asia/Kolkata" });
  if (process.env.HOURLY_DIGEST !== "off") {
    cron.schedule("0 * * * *", () => runHourlyDigest().catch((e) => console.error("[Health] hourly digest failed:", e.message)), { timezone: "Asia/Kolkata" });
  }
  console.log("[Health] monitor scheduled: quick every 15 min, hourly report, deep daily 08:00 IST");
}

module.exports = { runHealthChecks, runHourlyDigest, buildDigestText };
