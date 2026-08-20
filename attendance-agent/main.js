const {
  app,
  Tray,
  Menu,
  BrowserWindow,
  nativeImage,
  powerSaveBlocker,
  powerMonitor,
} = require("electron");

const axios = require("axios");
const http = require("http");
const fs = require("fs");
const path = require("path");
const Store = require("electron-store");

const IS_DEV = process.env.NODE_ENV === "development";

const API_BASE = IS_DEV
  ? "http://localhost:5001/attendance"
  : "https://torchxsuite.com/talent/api/attendance";

const FRONTEND_URL = IS_DEV
  ? "http://localhost:5173"
  : "https://torchxsuite.com/talent";

const AGENT_PORT = 47821;
const PING_INTERVAL = 60_000;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

// Same idle threshold used by browser attendance tracker
const IDLE_THRESHOLD_SECONDS = 30;

const store = new Store();

/**
 * ============================================================
 * SINGLE INSTANCE LOCK
 * ============================================================
 *
 * This is very important.
 *
 * Without this, every time Chrome opens:
 *
 * torchx-attendance://...
 *
 * Windows can start another TorchX Attendance process.
 *
 * Every process then tries to use port 47821 and causes:
 *
 * EADDRINUSE: address already in use 127.0.0.1:47821
 *
 * Only ONE Electron instance is now allowed.
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

/**
 * ============================================================
 * LOGGING
 * ============================================================
 */

const logDir = path.join(app.getPath("userData"), "logs");
const logFile = path.join(logDir, "main.log");

function ensureLogFile() {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    if (
      fs.existsSync(logFile) &&
      fs.statSync(logFile).size > MAX_LOG_BYTES
    ) {
      fs.renameSync(
        logFile,
        path.join(logDir, `main.${Date.now()}.log`)
      );
    }
  } catch (err) {
    console.error(
      "[Agent] Failed to prepare log file:",
      err.message
    );
  }
}

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;

  console.log(line);

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(logFile, line + "\n");
  } catch (err) {
    console.error(
      "[Agent] Failed to write log:",
      err.message
    );
  }
}

/**
 * ============================================================
 * AGENT ID
 * ============================================================
 *
 * Each installation gets a unique agent ID.
 */

function getAgentId() {
  let id = store.get("agentId");

  if (!id) {
    id = `agent_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    store.set("agentId", id);

    log("[Agent] New agent ID created:", id);
  }

  return id;
}

/**
 * ============================================================
 * VARIABLES
 * ============================================================
 */

let tray = null;
let pingInterval = null;
let isTracking = false;

/**
 * ============================================================
 * SYSTEM IDLE STATUS
 * ============================================================
 *
 * Electron powerMonitor tells us how long the system has
 * been idle based on keyboard/mouse activity.
 */

function getStatus() {
  const idleSeconds = powerMonitor.getSystemIdleTime();

  return idleSeconds < IDLE_THRESHOLD_SECONDS
    ? "active"
    : "idle";
}

/**
 * ============================================================
 * SEND ATTENDANCE PING
 * ============================================================
 */

async function sendPing() {
  const status = getStatus();

  log(`[Agent] Sending ping: ${status}`);

  try {
    const token = store.get("token");

    if (!token) {
      log("[Agent] No token available. Ping skipped.");
      return;
    }

    const agentId = getAgentId();

    await axios.post(
      `${API_BASE}/activity`,
      {
        status,
        clientId: agentId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 15_000,
      }
    );

    updateTray(status);

    log(
      `[Agent] Ping sent: ${status} at ${new Date().toLocaleTimeString()}`
    );
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
      log(
        "[Agent] Ping failed:",
        err?.message || "Unknown error"
      );
    }
  }
}

/**
 * ============================================================
 * START TRACKING
 * ============================================================
 */

function startTracking() {
  if (isTracking) {
    log("[Agent] Tracking already running");
    return;
  }

  const token = store.get("token");

  if (!token) {
    log("[Agent] Cannot start tracking: no token");
    return;
  }

  isTracking = true;

  log("[Agent] Tracking started");

  // First ping immediately
  sendPing();

  // Then every 60 seconds
  pingInterval = setInterval(() => {
    sendPing();
  }, PING_INTERVAL);

  updateTray("active");
}

/**
 * ============================================================
 * STOP TRACKING
 * ============================================================
 */

function stopTracking() {
  if (!isTracking) {
    return;
  }

  isTracking = false;

  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  updateTray("stopped");

  log("[Agent] Tracking stopped");
}

/**
 * ============================================================
 * TRAY
 * ============================================================
 */

function updateTray(status) {
  if (!tray) {
    return;
  }

  const labels = {
    active: "Active — tracking",
    idle: "Idle",
    stopped: "Not tracking",
  };

  tray.setToolTip(
    `TorchX Attendance\n${labels[status] ?? status}`
  );

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: labels[status] ?? status,
        enabled: false,
      },

      {
        type: "separator",
      },

      {
        label: isTracking
          ? "Stop Tracking"
          : "Start Tracking",

        click: () => {
          if (isTracking) {
            stopTracking();
          } else {
            const token = store.get("token");

            if (token) {
              startTracking();
            } else {
              openApp();
            }
          }
        },
      },

      {
        type: "separator",
      },

      {
        label: "Open Dashboard",
        click: openApp,
      },

      {
        type: "separator",
      },

      {
        label: "Quit Agent",

        click: () => {
          stopTracking();
          app.quit();
        },
      },
    ])
  );
}

/**
 * ============================================================
 * OPEN ATTENDANCE DASHBOARD
 * ============================================================
 */

function openApp() {
  const win = new BrowserWindow({
    width: 430,
    height: 750,

    title: "TorchX Attendance",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(`${FRONTEND_URL}/mark-attendance`);
}

/**
 * ============================================================
 * HANDLE TORCHX ATTENDANCE PROTOCOL
 * ============================================================
 *
 * Example:
 *
 * torchx-attendance://login?token=XXXXX
 *
 * The actual URL can vary. We look for a "token" query
 * parameter.
 */

function handleProtocolUrl(url) {
  if (!url) {
    return;
  }

  log("[Agent] Protocol URL received");

  try {
    const parsed = new URL(url);

    log("[Agent] Protocol:", parsed.protocol);
    log("[Agent] Protocol host:", parsed.hostname);
    log("[Agent] Protocol path:", parsed.pathname);

    const token = parsed.searchParams.get("token");

    if (!token) {
      log("[Agent] No token found in protocol URL");
      return;
    }

    log("[Agent] Token received via protocol");

    store.set("token", token);

    log("[Agent] Token saved successfully");

    startTracking();

    updateTray("active");

    log("[Agent] Tracking started from protocol");
  } catch (err) {
    log(
      "[Agent] Failed to process protocol URL:",
      err.message
    );
  }
}

/**
 * ============================================================
 * TOKEN SERVER
 * ============================================================
 *
 * Local server:
 *
 * http://127.0.0.1:47821
 *
 * POST:
 *
 * /set-token
 *
 * /clear-token
 *
 */

function startTokenServer() {
  const server = http.createServer((req, res) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, GET, OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    /**
     * ========================================================
     * SET TOKEN
     * ========================================================
     */

    if (
      req.method === "POST" &&
      req.url === "/set-token"
    ) {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        try {
          const data = JSON.parse(body);

          const token = data?.token;

          if (!token) {
            log(
              "[Agent] /set-token called without token"
            );

            res.writeHead(400, {
              "Content-Type": "application/json",
            });

            res.end(
              JSON.stringify({
                ok: false,
                message: "Token is required",
              })
            );

            return;
          }

          store.set("token", token);

          log(
            "[Agent] Token received through local server"
          );

          startTracking();

          res.writeHead(200, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              ok: true,
            })
          );
        } catch (err) {
          log(
            "[Agent] Invalid /set-token request:",
            err.message
          );

          res.writeHead(400, {
            "Content-Type": "application/json",
          });

          res.end(
            JSON.stringify({
              ok: false,
              message: "Invalid JSON",
            })
          );
        }
      });

      return;
    }

    /**
     * ========================================================
     * CLEAR TOKEN
     * ========================================================
     */

    if (
      req.method === "POST" &&
      req.url === "/clear-token"
    ) {
      store.delete("token");

      stopTracking();

      log(
        "[Agent] Token cleared, tracking stopped"
      );

      res.writeHead(200, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          ok: true,
        })
      );

      return;
    }

    /**
     * ========================================================
     * STATUS
     * ========================================================
     */

    if (
      req.method === "GET" &&
      req.url === "/"
    ) {
      res.writeHead(200, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          ok: true,
          status: isTracking
            ? "tracking"
            : "stopped",
          version: app.getVersion(),
          port: AGENT_PORT,
        })
      );

      return;
    }

    /**
     * ========================================================
     * 404
     * ========================================================
     */

    res.writeHead(404, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        ok: false,
        message: "Not found",
      })
    );
  });

  /**
   * ==========================================================
   * SERVER LISTEN
   * ==========================================================
   */

  server.listen(
    AGENT_PORT,
    "127.0.0.1",
    () => {
      log(
        `[Agent] Token server listening on port ${AGENT_PORT}`
      );
    }
  );

  /**
   * ==========================================================
   * SERVER ERROR
   * ==========================================================
   */

  server.on("error", (err) => {
    log(
      "[Agent] Server error:",
      err.message
    );

    if (err.code === "EADDRINUSE") {
      log(
        `[Agent] Port ${AGENT_PORT} is already in use.`
      );

      log(
        "[Agent] This should not happen because single-instance lock is enabled."
      );
    }
  });
}

/**
 * ============================================================
 * ELECTRON READY
 * ============================================================
 */

if (gotTheLock) {
  app.whenReady().then(() => {
    /**
     * Initialize log file
     */
    ensureLogFile();

    log(
      `[Agent] Started - version ${app.getVersion()}`
    );

    /**
     * Prevent Windows from suspending the application
     */
    powerSaveBlocker.start(
      "prevent-app-suspension"
    );

    /**
     * Start app automatically with Windows
     */
    app.setLoginItemSettings({
      openAtLogin: true,
    });

    /**
     * ========================================================
     * TRAY
     * ========================================================
     */

    const icon = nativeImage.createEmpty();

    tray = new Tray(icon);

    updateTray("stopped");

    /**
     * ========================================================
     * TOKEN SERVER
     * ========================================================
     */

    startTokenServer();

    /**
     * ========================================================
     * CHECK INITIAL PROTOCOL URL
     * ========================================================
     *
     * This handles:
     *
     * TorchX Attendance.exe "torchx-attendance://..."
     */

    const protocolUrl = process.argv.find((arg) =>
      arg.startsWith("torchx-attendance://")
    );

    if (protocolUrl) {
      log(
        "[Agent] Initial protocol URL detected"
      );

      handleProtocolUrl(protocolUrl);
    }

    /**
     * ========================================================
     * SAVED TOKEN
     * ========================================================
     */

    const savedToken = store.get("token");

    if (savedToken) {
      log(
        "[Agent] Saved token found, resuming tracking"
      );

      startTracking();
    } else {
      log(
        "[Agent] No token, waiting for login..."
      );

      updateTray("stopped");
    }
  });
}

/**
 * ============================================================
 * SECOND INSTANCE
 * ============================================================
 *
 * If Chrome or another process tries to launch:
 *
 * TorchX Attendance.exe "torchx-attendance://..."
 *
 * Windows does NOT create another running agent.
 *
 * Instead, this event is fired on the existing instance.
 */

if (gotTheLock) {
  app.on(
    "second-instance",
    (event, commandLine, workingDirectory) => {
      log(
        "[Agent] Second instance launch detected"
      );

      /**
       * Find protocol URL from command line
       */
      const protocolUrl = commandLine.find((arg) =>
        arg.startsWith("torchx-attendance://")
      );

      if (protocolUrl) {
        log(
          "[Agent] Protocol URL received from second instance"
        );

        handleProtocolUrl(protocolUrl);
      } else {
        log(
          "[Agent] Second instance had no protocol URL"
        );
      }
    }
  );
}

/**
 * ============================================================
 * WINDOWS PROTOCOL HANDLER
 * ============================================================
 *
 * On Windows, protocol URLs can sometimes arrive through
 * the "open-url" event depending on how the application
 * is launched.
 */

app.on("open-url", (event, url) => {
  event.preventDefault();

  log(
    "[Agent] open-url event received"
  );

  handleProtocolUrl(url);
});

/**
 * ============================================================
 * ALL WINDOWS CLOSED
 * ============================================================
 *
 * Keep tray/background agent running.
 */

app.on(
  "window-all-closed",
  (event) => {
    event.preventDefault();
  }
);

/**
 * ============================================================
 * BEFORE QUIT
 * ============================================================
 */

app.on("before-quit", () => {
  log("[Agent] Application quitting");

  stopTracking();
});