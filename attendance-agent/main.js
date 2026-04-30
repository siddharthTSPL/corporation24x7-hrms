const { app, Tray, Menu, BrowserWindow, nativeImage, powerSaveBlocker } = require("electron");
const { uIOhook } = require("uiohook-napi");
const axios  = require("axios");
const http   = require("http");
const Store  = require("electron-store");

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE        = "http://localhost:5000/attendance"; // your backend
const FRONTEND_URL    = "http://localhost:5173";            // your React app
const AGENT_PORT      = 47821;                             // local port for token exchange
const PING_INTERVAL   = 60_000;   // ping every 60 seconds
const IDLE_THRESHOLD  = 120_000;  // 2 min no activity = idle

// ─── Store (persists token between restarts) ──────────────────────────────────
const store = new Store();

// ─── State ────────────────────────────────────────────────────────────────────
let tray                = null;
let lastActivityAt      = Date.now();
let wasActiveThisMinute = false;
let pingInterval        = null;
let isTracking          = false;

// ─── OS-Level Activity Hook ───────────────────────────────────────────────────
// This fires for ANY app — VS Code, Excel, Chrome, Terminal, etc.
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
  wasActiveThisMinute = false; // reset for next 60s window

  console.log(`[Agent] Sending ping: ${status}`);

  try {
    const token = store.get("token");
    if (!token) {
      console.log("[Agent] No token found, skipping ping");
      return;
    }

    await axios.post(
      `${API_BASE}/activity`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    updateTray(status);
    console.log(`[Agent] ✓ Ping sent: ${status} at ${new Date().toLocaleTimeString()}`);

  } catch (err) {
    if (err?.response?.status === 429) {
      console.log("[Agent] Rate limited (expected), skipping");
    } else if (err?.response?.status === 401) {
      console.log("[Agent] Token expired, stopping tracking");
      store.delete("token");
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

// ─── Tray Icon ────────────────────────────────────────────────────────────────
function updateTray(status) {
  if (!tray) return;

  const labels = {
    active:  "🟢 Active — tracking",
    idle:    "🟡 Idle",
    stopped: "🔴 Not tracking",
  };

  tray.setToolTip(`TorchX Attendance\n${labels[status] ?? status}`);

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: labels[status] ?? status,
      enabled: false,
    },
    { type: "separator" },
    {
      label: isTracking ? "⏹  Stop Tracking" : "▶  Start Tracking",
      click: () => {
        if (isTracking) {
          stopTracking();
        } else {
          const token = store.get("token");
          if (token) {
            startTracking();
          } else {
            openApp(); // need to login first
          }
        }
      },
    },
    { type: "separator" },
    {
      label: "📊 Open Dashboard",
      click: openApp,
    },
    { type: "separator" },
    {
      label: "Quit Agent",
      click: () => {
        stopTracking();
        app.quit();
      },
    },
  ]));
}

function openApp() {
  const win = new BrowserWindow({
    width:  430,
    height: 750,
    title:  "TorchX Attendance",
    webPreferences: { nodeIntegration: false },
  });
  win.loadURL(`${FRONTEND_URL}/mark-attendance`);
}

// ─── Local HTTP Server (receives token from browser after login) ──────────────
// Browser calls http://localhost:47821/set-token after login
// Browser calls http://localhost:47821/clear-token on logout
function startTokenServer() {
  const server = http.createServer((req, res) => {
    // Allow browser to call this
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // POST /set-token — called after login
    if (req.method === "POST" && req.url === "/set-token") {
      let body = "";
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        try {
          const { token } = JSON.parse(body);
          if (token) {
            store.set("token", token);
            startTracking();
            console.log("[Agent] ✓ Token received, tracking started");
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, message: "Tracking started" }));
          } else {
            res.writeHead(400);
            res.end(JSON.stringify({ ok: false, message: "No token provided" }));
          }
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false }));
        }
      });
      return;
    }

    // GET /clear-token — called on logout
    if (req.url === "/clear-token") {
      store.delete("token");
      stopTracking();
      console.log("[Agent] Token cleared, tracking stopped");
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, message: "Tracking stopped" }));
      return;
    }

    // GET / — health check
    if (req.url === "/") {
      res.writeHead(200);
      res.end(JSON.stringify({ 
        ok: true, 
        status: isTracking ? "tracking" : "idle",
        message: "TorchX Agent is running" 
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
  // Keep running even when screen is locked or suspended
  powerSaveBlocker.start("prevent-app-suspension");

  // Auto-start agent when Windows boots
  app.setLoginItemSettings({ openAtLogin: true });

  // Create tray
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  updateTray("stopped");

  // Start local server to receive tokens
  startTokenServer();

  // If already logged in before (token saved), start tracking immediately
  const savedToken = store.get("token");
  if (savedToken) {
    console.log("[Agent] Saved token found, starting tracking");
    startTracking();
  } else {
    console.log("[Agent] No token, waiting for login...");
    updateTray("stopped");
  }
});

// Stay alive in tray even when all windows are closed
app.on("window-all-closed", (e) => {
  e.preventDefault();
});