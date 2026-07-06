const { app, Tray, Menu, BrowserWindow, nativeImage, powerSaveBlocker } = require("electron");
const { uIOhook } = require("uiohook-napi");
const axios  = require("axios");
const http   = require("http");
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

// Fallback only used if /my-shift can't be reached (network blip, server down, etc.)
const FALLBACK_CHECKOUT_HOUR   = 19;
const FALLBACK_CHECKOUT_MINUTE = 0;

const store = new Store();

let tray                = null;
let wasActiveThisMinute = false;
let pingInterval        = null;
let autoCheckoutTimer   = null;
let isTracking          = false;

function computeNextCheckoutDate(hour, minute) {
  const now      = new Date();
  const checkout = new Date();
  checkout.setHours(hour, minute, 0, 0);

  if (now >= checkout) {
    checkout.setDate(checkout.getDate() + 1);
  }

  return checkout;
}

async function scheduleShiftCheckout() {
  clearTimeout(autoCheckoutTimer);

  const token = store.get("token");
  if (!token) return;

  let hour = FALLBACK_CHECKOUT_HOUR;
  let minute = FALLBACK_CHECKOUT_MINUTE;
  let source = "fallback (7 PM)";

  try {
    const res = await axios.get(`${API_BASE}/my-shift`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { endTime } = res.data.shift; // "HH:mm" e.g. "19:00"
    const [h, m] = endTime.split(":").map(Number);
    hour = h;
    minute = m;
    source = `shift end (${endTime})`;
  } catch (err) {
    console.error("[Agent] Failed to fetch shift, using fallback checkout time:", err.message);
  }

  const checkout = computeNextCheckoutDate(hour, minute);
  const msUntilCheckout = checkout.getTime() - Date.now();

  console.log(`[Agent] Auto checkout scheduled at ${source} (in ${Math.round(msUntilCheckout / 60000)} minutes)`);

  autoCheckoutTimer = setTimeout(async () => {
    console.log(`[Agent] ${source} reached — triggering auto checkout`);
    await triggerAutoCheckout();
    scheduleShiftCheckout();
  }, msUntilCheckout);
}

async function triggerAutoCheckout() {
  try {
    const token = store.get("token");
    if (!token) return;

    const res = await axios.post(
      `${API_BASE}/checkout`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { status, checkoutRemark, overtimeMinutes } = res.data;
    console.log(
      `[Agent] Auto checkout successful — status: ${status}, remark: ${checkoutRemark}` +
      (overtimeMinutes ? `, overtime: ${overtimeMinutes}m` : "")
    );
    stopTracking();
    updateTray("stopped");

  } catch (err) {
    if (err?.response?.status === 400 || err?.response?.status === 404) {
      console.log("[Agent] Already checked out or no record, skipping");
    } else {
      console.error("[Agent] Auto checkout failed:", err.message);
    }
    stopTracking();
  }
}

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
  wasActiveThisMinute = true;
}

async function sendPing() {
  const status = wasActiveThisMinute ? "active" : "idle";
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
    if (err?.response?.status === 401) {
      console.log("[Agent] Token expired, clearing...");
      store.delete("token");
      stopTracking();
      updateTray("stopped");
    } else if (err?.response?.status === 400) {
      console.log("[Agent] Session ended, stopping pings");
      stopTracking();
      updateTray("stopped");
    } else {
      console.error("[Agent] Ping failed:", err.message);
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
            scheduleShiftCheckout();
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
    scheduleShiftCheckout();
  } else {
    console.log("[Agent] No token, waiting for login...");
    updateTray("stopped");
  }
});

app.on("window-all-closed", (e) => e.preventDefault());