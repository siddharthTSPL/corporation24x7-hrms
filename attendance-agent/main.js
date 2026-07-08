const { app, Tray, Menu, BrowserWindow, nativeImage, powerSaveBlocker } = require("electron");
const { uIOhook } = require("uiohook-napi");
const axios  = require("axios");
const http   = require("http");
const fs     = require("fs");
const path   = require("path");
const Store  = require("electron-store");

const IS_DEV = process.env.NODE_ENV === "development";

const API_BASE    = IS_DEV
  ? "http://localhost:5001/attendance"
  : "https://torchxsuite.com/talent/api/attendance";

const FRONTEND_URL = IS_DEV
  ? "http://localhost:5173"
  : "https://torchxsuite.com/talent";

const AGENT_PORT     = 47821;
const PING_INTERVAL  = 60_000;
const MAX_LOG_BYTES  = 5 * 1024 * 1024;

const store = new Store();

const logDir  = path.join(app.getPath("userData"), "logs");
const logFile = path.join(logDir, "main.log");

function ensureLogFile() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_LOG_BYTES) {
      fs.renameSync(logFile, path.join(logDir, `main.${Date.now()}.log`));
    }
  } catch (err) {
    console.error("[Agent] Failed to prepare log file:", err.message);
  }
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(line);
  try {
    fs.appendFileSync(logFile, line + "\n");
  } catch (err) {
    console.error("[Agent] Failed to write log:", err.message);
  }
}

let tray                = null;
let wasActiveThisMinute = false;
let pingInterval        = null;
let isTracking          = false;

function startGlobalHook() {
  uIOhook.on("mousemove", onActivity);
  uIOhook.on("mousedown", onActivity);
  uIOhook.on("keydown",   onActivity);
  uIOhook.start();
  log("[Agent] Global activity hook started");
}

function stopGlobalHook() {
  try { uIOhook.stop(); } catch (_) {}
  log("[Agent] Global activity hook stopped");
}

function onActivity() {
  wasActiveThisMinute = true;
}

async function sendPing() {
  const status = wasActiveThisMinute ? "active" : "idle";
  wasActiveThisMinute = false;

  log(`[Agent] Sending ping: ${status}`);

  try {
    const token = store.get("token");
    if (!token) return;

    await axios.post(
      `${API_BASE}/activity`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    updateTray(status);
    log(`[Agent] Ping sent: ${status} at ${new Date().toLocaleTimeString()}`);

  } catch (err) {
    if (err?.response?.status === 401) {
      log("[Agent] Token expired, clearing...");
      store.delete("token");
      stopTracking();
      updateTray("stopped");
    } else if (err?.response?.status === 400) {
      log("[Agent] Session ended, stopping pings");
      stopTracking();
      updateTray("stopped");
    } else {
      log("[Agent] Ping failed:", err.message);
    }
  }
}

function startTracking() {
  if (isTracking) return;
  isTracking          = true;
  wasActiveThisMinute = true;

  startGlobalHook();
  pingInterval = setInterval(sendPing, PING_INTERVAL);
  updateTray("active");
  log("[Agent] Tracking started");
}

function stopTracking() {
  if (!isTracking) return;
  isTracking = false;

  clearInterval(pingInterval);
  pingInterval = null;

  stopGlobalHook();
  updateTray("stopped");
  log("[Agent] Tracking stopped");
}

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
            log("[Agent] Token received, tracking started");
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
      log("[Agent] Token cleared, tracking stopped");
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
    log(`[Agent] Token server listening on port ${AGENT_PORT}`);
  });

  server.on("error", (err) => {
    log("[Agent] Server error:", err.message);
  });
}

app.whenReady().then(() => {
  ensureLogFile();
  log(`[Agent] Started - version ${app.getVersion()}`);

  powerSaveBlocker.start("prevent-app-suspension");
  app.setLoginItemSettings({ openAtLogin: true });

  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  updateTray("stopped");

  startTokenServer();

  const savedToken = store.get("token");
  if (savedToken) {
    log("[Agent] Saved token found, resuming tracking");
    startTracking();
  } else {
    log("[Agent] No token, waiting for login...");
    updateTray("stopped");
  }
});

app.on("window-all-closed", (e) => e.preventDefault());