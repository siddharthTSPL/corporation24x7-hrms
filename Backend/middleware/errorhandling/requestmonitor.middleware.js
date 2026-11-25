const { sendAlert } = require("../../utils/Alertmailer.utils");
const crypto = require("crypto");
const { install: installLogBuffer, als, getRequestLogs } = require("../../utils/Logbuffer.utils");
installLogBuffer();

// Watches every HTTP response. Any 5xx - whether it came through the
// Express error handler OR a controller's own `res.status(500).json({error})`
// - is reported once per distinct problem (method + normalised route +
// message), and a burst of 5xx (default 10 in 5 minutes) raises a "spike"
// alert. 4xx are normal client errors and are ignored.
const SPIKE_LIMIT = Number(process.env.HEALTH_5XX_SPIKE) || 10;
const WINDOW_MS = 5 * 60 * 1000;
const hits = []; // { t, route }
let hourly = { total: 0, routes: {} }; // reset by takeStats() every hour

const normalise = (req) => {
  const base = (req.baseUrl || "") + (req.route?.path && req.route.path !== "/" ? req.route.path : "");
  const p = base || req.path || req.originalUrl || "";
  return p.replace(/[0-9a-f]{24}/gi, ":id").replace(/\/\d+/g, "/:n").split("?")[0];
};

const requestMonitor = (req, res, next) => als.run({ logs: [] }, () => handle(req, res, next));

const handle = (req, res, next) => {
  const startedAt = Date.now();
  const requestLogs = []; // filled at finish from this request's own console output
  let bodyMessage = null;
  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === "object") {
      bodyMessage = body.error || body.message || null;
    }
    return origJson(body);
  };

  res.on("finish", () => {
    if (res.statusCode < 500) return;
    try {
      const route = `${req.method} ${normalise(req)}`;
      const err = res.locals.reportedError || null;
      const message = err?.message || (typeof bodyMessage === "string" ? bodyMessage : JSON.stringify(bodyMessage) || "no message");

      const u = req.user || {};
      const request = {
        route,
        url: (req.method + " " + (req.originalUrl || req.url || "")).slice(0, 300),
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        user: u._id || u.id ? `${u._id || u.id}${u.role ? ` (role: ${u.role})` : ""}${u.organisation_id ? ` org: ${u.organisation_id}` : ""}` : "not logged in / unknown",
        ip: req.ip,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 120),
        params: req.params,
        bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body).slice(0, 30) : [],
      };
      const key = "http500:" + crypto.createHash("sha1").update(`${route}|${message}`).digest("hex").slice(0, 16);
      sendAlert({
        key,
        severity: "error",
        title: `HTTP ${res.statusCode} on ${route}`,
        message,
        error: err,
        context: { request },
        requestLogs: getRequestLogs(),
      });

      const now = Date.now();
      hits.push({ t: now, route });
      hourly.total++;
      hourly.routes[route] = (hourly.routes[route] || 0) + 1;
      while (hits.length && now - hits[0].t > WINDOW_MS) hits.shift();
      if (hits.length >= SPIKE_LIMIT) {
        const top = {};
        hits.forEach((h) => (top[h.route] = (top[h.route] || 0) + 1));
        sendAlert({
          key: "http500:spike",
          severity: "critical",
          title: `5xx spike: ${hits.length} server errors in 5 min`,
          message: "Many requests are failing at once - the API (or its database / a dependency) is probably unhealthy.",
          details: { topRoutes: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 10) },
        });
      }
    } catch (e) {
      console.error("[RequestMonitor]", e.message);
    }
  });
  next();
};

// Returns the 5xx counts since the last call, then starts a fresh window.
requestMonitor.takeStats = () => {
  const out = hourly;
  hourly = { total: 0, routes: {} };
  return out;
};

module.exports = requestMonitor;
