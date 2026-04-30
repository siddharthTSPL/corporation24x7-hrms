const { app, Tray, Menu, BrowserWindow, nativeImage, powerSaveBlocker } = require("electron");
const { uIOhook } = require("uiohook-napi");
const axios  = require("axios");
const http   = require("http");
const Store  = require("electron-store");

const API_BASE       = "http://localhost:5000/attendance";
const FRONTEND_URL   = "http://localhost:5173";
const AGENT_PORT     = 47821;
const PING_INTERVAL  = 60_000;
const IDLE_THRESHOLD = 120_000;

const store = new Store();

let tray                = null;
let lastActivityAt      = Date.now();
let wasActiveThisMinute = false;
let pingInterval        = null;
let autoCheckoutTimer   = null;
let isTracking          = false;

// ─── Schedule 7 PM auto checkout ─────────────────────────────────────────────
function schedule7PMCheckout() {
  clearTimeout(autoCheckoutTimer);

  const now     = new Date();
  const checkout = new Date();
  checkout.setHours(19, 0, 0, 0); // 7:00 PM today

  // If already past 7 PM, schedule for tomorrow
  if (now >= checkout) {
    checkout.setDate(checkout.getDate() + 1);
  }

  const msUntil7PM = checkout.getTime() - now.getTime();
  console.log(`[Agent] Auto checkout scheduled at 7 PM (in ${Math.round(msUntil7PM / 60000)} minutes)`);

  autoCheckoutTimer = setTimeout(async () => {
    console.log("[Agent] 7 PM — triggering auto checkout");
    await triggerAutoCheckout();
    // Reschedule for tomorrow
    schedule7PMCheckout();
  }, msUntil7PM);
}

async function triggerAutoCheckout() {
  try {
    const token = store.get("token");
    if (!token) return;

    await axios.post(
      `${API_BASE}/checkout`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("[Agent] Auto checkout successful");
    stopTracking();
    updateTray("stopped");

  } catch (err) {
    if (err?.response?.status === 400 || err?.response?.status === 404) {
      // Already checked out or no record — fine
      console.log("[Agent] Already checked out or no record, skipping");
    } else {
      console.error("[Agent] Auto checkout failed:", err.message);
    }
    stopTracking();
  }
}

// ─── OS-Level Activity Hook ───────────────────────────────────────────────────
function startGlobalHook() {
  uIOhook.on("mousemove", onActivity);
  uIOhook.on("mousedown", onActivity);
  uIOhook.on("keydown",   onActivity);
  uIOhook.start();
  console.log("[Agent] Global activity hook started");
}

function stopGlobalHook() {
  try { uIOhook.stop(); } catch (_) {}
  console.log("[Agent] Global activity hook stopped");
}

function onActivity() {
  lastActivityAt      = Date.now();
  wasActiveThisMinute = true;
}

// ─── Ping Backend ─────────────────────────────────────────────────────────────
async function sendPing() {
  const now    = Date.now();
  const isIdle = now - lastActivityAt > IDLE_THRESHOLD;
  const status = wasActiveThisMinute && !isIdle ? "active" : "idle";
  wasActiveThisMinute = false;

  console.log(`[Agent] Sending ping: ${status}`);

  try {
    const token = store.get("token");
    if (!token) return;

    await axios.post(
      `${API_BASE}/activity`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    updateTray(status);
    console.log(`[Agent] Ping sent: ${status} at ${new Date().toLocaleTimeString()}`);

  } catch (err) {
    if (err?.response?.status === 429) {
      console.log("[Agent] Rate limited, skipping");
    } else if (err?.response?.status === 401) {
      console.log("[Agent] Token expired, clearing...");
      store.delete("token");
      stopTracking();
      updateTray("stopped");
    } else if (err?.response?.status === 400) {
      // Already checked out — stop pinging
      console.log("[Agent] Session ended, stopping pings");
      stopTracking();
      updateTray("stopped");
    } else {
      console.error("[Agent] Ping failed:", err.message);
    }
  }
}

// ─── Start / Stop Tracking ────────────────────────────────────────────────────
function startTracking() {
  if (isTracking) return;
  isTracking          = true;
  lastActivityAt      = Date.now();
  wasActiveThisMinute = true;

  startGlobalHook();
  pingInterval = setInterval(sendPing, PING_INTERVAL);
  updateTray("active");
  console.log("[Agent] Tracking started");
}

function stopTracking() {
  if (!isTracking) return;
  isTracking = false;

  clearInterval(pingInterval);
  pingInterval = null;

  stopGlobalHook();
  updateTray("stopped");
  console.log("[Agent] Tracking stopped");
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function updateTray(status) {
  if (!tray) return;

  const labels = {
    active:  "Active — tracking",
    idle:    "Idle",
    stopped: "Not tracking",
  };

  tray.setToolTip(`TorchX Attendance\n${labels[status] ?? status}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: labels[status] ?? status, enabled: false },
    { type: "separator" },
    {
      label: isTracking ? "Stop Tracking" : "Start Tracking",
      click: () => {
        if (isTracking) stopTracking();
        else {
          const token = store.get("token");
          if (token) startTracking();
          else openApp();
        }
      },
    },
    { type: "separator" },
    { label: "Open Dashboard", click: openApp },
    { type: "separator" },
    { label: "Quit Agent", click: () => { stopTracking(); app.quit(); } },
  ]));
}

function openApp() {
  const win = new BrowserWindow({
    width: 430, height: 750,
    title: "TorchX Attendance",
    webPreferences: { nodeIntegration: false },
  });
  win.loadURL(`${FRONTEND_URL}/mark-attendance`);
}

// ─── Local HTTP Server ────────────────────────────────────────────────────────
function startTokenServer() {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/set-token") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        try {
          const { token } = JSON.parse(body);
          if (token) {
            store.set("token", token);
            startTracking();
            // Start 7 PM scheduler when user logs in
            schedule7PMCheckout();
            console.log("[Agent] Token received, tracking started");
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true }));
          } else {
            res.writeHead(400);
            res.end(JSON.stringify({ ok: false }));
          }
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false }));
        }
      });
      return;
    }

    if (req.url === "/clear-token") {
      store.delete("token");
      stopTracking();
      clearTimeout(autoCheckoutTimer);
      console.log("[Agent] Token cleared, tracking stopped");
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.url === "/") {
      res.writeHead(200);
      res.end(JSON.stringify({
        ok: true,
        status: isTracking ? "tracking" : "stopped",
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false }));
  });

  server.listen(AGENT_PORT, "127.0.0.1", () => {
    console.log(`[Agent] Token server listening on port ${AGENT_PORT}`);
  });

  server.on("error", (err) => {
    console.error("[Agent] Server error:", err.message);
  });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  powerSaveBlocker.start("prevent-app-suspension");
  app.setLoginItemSettings({ openAtLogin: true });

  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  updateTray("stopped");

  startTokenServer();

  const savedToken = store.get("token");
  if (savedToken) {
    console.log("[Agent] Saved token found, resuming tracking");
    startTracking();
    schedule7PMCheckout(); // always schedule 7 PM checkout on startup
  } else {
    console.log("[Agent] No token, waiting for login...");
    updateTray("stopped");
  }
});

app.on("window-all-closed", (e) => e.preventDefault());