const {
  app,
  Tray,
  Menu,
  BrowserWindow,
  nativeImage,
  powerSaveBlocker,
  powerMonitor
} = require("electron");

const axios = require("axios");
const http = require("http");
const fs = require("fs");
const path = require("path");
const Store = require("electron-store");


// ============================================================
// CONFIGURATION
// ============================================================

const IS_DEV = process.env.NODE_ENV === "development";

const API_BASE = IS_DEV
  ? "http://localhost:5001/attendance"
  : "https://torchxsuite.com/talent/api/attendance";

const FRONTEND_URL = IS_DEV
  ? "http://localhost:5173"
  : "https://torchxsuite.com/talent";

const AGENT_PORT = 47821;

const PING_INTERVAL = 60_000;

// Maximum log file size = 5 MB
const MAX_LOG_BYTES = 5 * 1024 * 1024;

// Idle after 30 seconds without keyboard/mouse input
const IDLE_THRESHOLD_SECONDS = 30;


// ============================================================
// ELECTRON STORE
// ============================================================

const store = new Store();


// ============================================================
// SINGLE INSTANCE LOCK
// ============================================================
//
// This is VERY important.
//
// If the user opens the application multiple times,
// only ONE main TorchX Attendance process will be allowed.
//
// This prevents:
//
// listen EADDRINUSE: address already in use
// 127.0.0.1:47821
//
// ============================================================

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  console.log("[Agent] Another TorchX Attendance instance is already running.");
  app.quit();
}


// ============================================================
// AGENT ID
// ============================================================

function getAgentId() {
  let id = store.get("agentId");

  if (!id) {
    id = `agent_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    store.set("agentId", id);
  }

  return id;
}


// ============================================================
// LOGGING
// ============================================================

const logDir = path.join(app.getPath("userData"), "logs");
const logFile = path.join(logDir, "main.log");


function ensureLogFile() {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, {
        recursive: true
      });
    }

    if (
      fs.existsSync(logFile) &&
      fs.statSync(logFile).size > MAX_LOG_BYTES
    ) {
      const rotatedLog = path.join(
        logDir,
        `main.${Date.now()}.log`
      );

      fs.renameSync(logFile, rotatedLog);
    }
  } catch (err) {
    console.error(
      "[Agent] Failed to prepare log file:",
      err.message
    );
  }
}


function log(...args) {
  const line =
    `[${new Date().toISOString()}] ` +
    args
      .map((value) => {
        if (typeof value === "object") {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }

        return String(value);
      })
      .join(" ");

  console.log(line);

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, {
        recursive: true
      });
    }

    fs.appendFileSync(
      logFile,
      line + "\n",
      "utf8"
    );
  } catch (err) {
    console.error(
      "[Agent] Failed to write log:",
      err.message
    );
  }
}


// ============================================================
// GLOBAL STATE
// ============================================================

let tray = null;

let pingInterval = null;

let isTracking = false;

let tokenServer = null;

let isQuitting = false;


// ============================================================
// SYSTEM IDLE STATUS
// ============================================================

function getStatus() {
  try {
    const idleSeconds =
      powerMonitor.getSystemIdleTime();

    return idleSeconds < IDLE_THRESHOLD_SECONDS
      ? "active"
      : "idle";

  } catch (err) {
    log(
      "[Agent] Failed to get system idle time:",
      err.message
    );

    // If we cannot determine idle time,
    // consider user active rather than incorrectly idle.
    return "active";
  }
}


// ============================================================
// SEND ACTIVITY PING
// ============================================================

async function sendPing() {
  const status = getStatus();

  log(
    `[Agent] Sending ping: ${status}`
  );

  try {
    const token = store.get("token");

    if (!token) {
      log(
        "[Agent] No token available, skipping ping"
      );

      return;
    }

    const agentId = getAgentId();

    log(
      `[Agent] Agent ID: ${agentId}`
    );

    await axios.post(
      `${API_BASE}/activity`,
      {
        status,
        clientId: agentId
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        },

        timeout: 15_000
      }
    );

    updateTray(status);

    log(
      `[Agent] Ping sent successfully: ${status}`
    );

  } catch (err) {

    if (err?.response?.status === 401) {

      log(
        "[Agent] Token expired. Clearing token."
      );

      store.delete("token");

      stopTracking();

      updateTray("stopped");

      return;
    }


    if (err?.response?.status === 400) {

      log(
        "[Agent] Session ended. Stopping tracking."
      );

      stopTracking();

      updateTray("stopped");

      return;
    }


    if (err?.response) {

      log(
        `[Agent] Ping failed: HTTP ${err.response.status}`
      );

      log(
        `[Agent] Server response:`,
        err.response.data
      );

    } else {

      log(
        "[Agent] Ping failed:",
        err.message
      );

    }
  }
}


// ============================================================
// START TRACKING
// ============================================================

function startTracking() {

  if (isTracking) {
    log(
      "[Agent] Tracking already running."
    );

    return;
  }

  const token = store.get("token");

  if (!token) {

    log(
      "[Agent] Cannot start tracking: no token."
    );

    return;
  }

  isTracking = true;


  pingInterval = setInterval(
    sendPing,
    PING_INTERVAL
  );


  // Send immediately
  sendPing();


  updateTray("active");


  log(
    "[Agent] Tracking started."
  );

  log(
    `[Agent] Ping interval: ${PING_INTERVAL} ms`
  );

  log(
    `[Agent] Idle threshold: ${IDLE_THRESHOLD_SECONDS} seconds`
  );
}


// ============================================================
// STOP TRACKING
// ============================================================

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


  log(
    "[Agent] Tracking stopped."
  );
}


// ============================================================
// TRAY
// ============================================================

function updateTray(status) {

  if (!tray) {
    return;
  }


  const labels = {

    active:
      "Active — tracking",

    idle:
      "Idle",

    stopped:
      "Not tracking"
  };


  const currentLabel =
    labels[status] || status;


  tray.setToolTip(
    `TorchX Attendance\n${currentLabel}`
  );


  tray.setContextMenu(
    Menu.buildFromTemplate([

      {
        label: currentLabel,
        enabled: false
      },


      {
        type: "separator"
      },


      {
        label: isTracking
          ? "Stop Tracking"
          : "Start Tracking",

        click: () => {

          if (isTracking) {

            stopTracking();

          } else {

            const token =
              store.get("token");

            if (token) {

              startTracking();

            } else {

              openApp();
            }
          }
        }
      },


      {
        type: "separator"
      },


      {
        label: "Open Dashboard",

        click: openApp
      },


      {
        type: "separator"
      },


      {
        label: "Quit Agent",

        click: () => {

          isQuitting = true;

          stopTracking();

          closeTokenServer();

          app.quit();
        }
      }
    ])
  );
}


// ============================================================
// OPEN DASHBOARD
// ============================================================

function openApp() {

  try {

    const win = new BrowserWindow({

      width: 430,

      height: 750,

      title: "TorchX Attendance",

      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });


    win.loadURL(
      `${FRONTEND_URL}/mark-attendance`
    );


    win.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription) => {

        log(
          `[Agent] Dashboard failed to load: ${errorCode} ${errorDescription}`
        );
      }
    );


  } catch (err) {

    log(
      "[Agent] Failed to open dashboard:",
      err.message
    );
  }
}


// ============================================================
// TOKEN SERVER
// ============================================================

function startTokenServer() {

  if (tokenServer) {

    log(
      "[Agent] Token server already exists."
    );

    return;
  }


  tokenServer = http.createServer(
    (req, res) => {

      // ------------------------------------------------------
      // CORS
      // ------------------------------------------------------

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

      res.setHeader(
        "Content-Type",
        "application/json"
      );


      // ------------------------------------------------------
      // OPTIONS
      // ------------------------------------------------------

      if (req.method === "OPTIONS") {

        res.writeHead(200);

        res.end(
          JSON.stringify({
            ok: true
          })
        );

        return;
      }


      // ------------------------------------------------------
      // HEALTH CHECK
      // ------------------------------------------------------

      if (
        req.method === "GET" &&
        req.url === "/"
      ) {

        res.writeHead(200);

        res.end(
          JSON.stringify({

            ok: true,

            status:
              isTracking
                ? "tracking"
                : "stopped",

            version:
              app.getVersion(),

            pid:
              process.pid,

            port:
              AGENT_PORT
          })
        );

        return;
      }


      // ------------------------------------------------------
      // SET TOKEN
      // ------------------------------------------------------

      if (
        req.method === "POST" &&
        req.url === "/set-token"
      ) {

        let body = "";


        req.on(
          "data",
          (chunk) => {

            body += chunk;

            // Prevent extremely large request body
            if (body.length > 1_000_000) {

              req.destroy();
            }
          }
        );


        req.on(
          "end",
          () => {

            try {

              const data =
                JSON.parse(body);


              const token =
                data?.token;


              if (!token) {

                log(
                  "[Agent] /set-token called without token."
                );


                res.writeHead(400);

                res.end(
                  JSON.stringify({
                    ok: false,
                    message:
                      "Token is required"
                  })
                );

                return;
              }


              store.set(
                "token",
                token
              );


              log(
                "[Agent] Token received and saved."
              );


              startTracking();


              log(
                "[Agent] Tracking started after token."
              );


              res.writeHead(200);

              res.end(
                JSON.stringify({
                  ok: true
                })
              );


            } catch (err) {

              log(
                "[Agent] Invalid /set-token request:",
                err.message
              );


              res.writeHead(400);

              res.end(
                JSON.stringify({
                  ok: false,
                  message:
                    "Invalid JSON"
                })
              );
            }
          }
        );


        return;
      }


      // ------------------------------------------------------
      // CLEAR TOKEN
      // ------------------------------------------------------

      if (
        req.method === "POST" &&
        req.url === "/clear-token"
      ) {

        store.delete("token");

        stopTracking();


        log(
          "[Agent] Token cleared. Tracking stopped."
        );


        res.writeHead(200);

        res.end(
          JSON.stringify({
            ok: true
          })
        );


        return;
      }


      // ------------------------------------------------------
      // 404
      // ------------------------------------------------------

      res.writeHead(404);

      res.end(
        JSON.stringify({
          ok: false,
          message: "Not found"
        })
      );
    }
  );


  // ==========================================================
  // SERVER LISTEN
  // ==========================================================

  tokenServer.listen(
    AGENT_PORT,
    "127.0.0.1",
    () => {

      log(
        `[Agent] Token server listening on 127.0.0.1:${AGENT_PORT}`
      );

      log(
        `[Agent] Process PID: ${process.pid}`
      );

      log(
        `[Agent] Agent ID: ${getAgentId()}`
      );
    }
  );


  // ==========================================================
  // SERVER ERROR
  // ==========================================================

  tokenServer.on(
    "error",
    (err) => {

      if (err.code === "EADDRINUSE") {

        log(
          `[Agent] ERROR: Port ${AGENT_PORT} is already in use.`
        );

        log(
          "[Agent] This usually means another TorchX Attendance instance is running."
        );

        log(
          `[Agent] Current process PID: ${process.pid}`
        );

      } else {

        log(
          "[Agent] Token server error:",
          err.message
        );
      }
    }
  );
}


// ============================================================
// CLOSE TOKEN SERVER
// ============================================================

function closeTokenServer() {

  if (!tokenServer) {
    return;
  }


  try {

    tokenServer.close(
      () => {

        log(
          "[Agent] Token server closed."
        );
      }
    );

  } catch (err) {

    log(
      "[Agent] Error closing token server:",
      err.message
    );
  }


  tokenServer = null;
}


// ============================================================
// ELECTRON READY
// ============================================================

if (gotSingleInstanceLock) {

  app.whenReady().then(() => {

    // --------------------------------------------------------
    // LOG
    // --------------------------------------------------------

    ensureLogFile();


    log(
      "=================================================="
    );

    log(
      `[Agent] Started - version ${app.getVersion()}`
    );

    log(
      `[Agent] PID: ${process.pid}`
    );

    log(
      `[Agent] Platform: ${process.platform}`
    );

    log(
      `[Agent] Electron: ${process.versions.electron}`
    );

    log(
      `[Agent] Node: ${process.versions.node}`
    );

    log(
      "=================================================="
    );


    // --------------------------------------------------------
    // PREVENT SYSTEM SUSPENSION
    // --------------------------------------------------------

    try {

      const blockerId =
        powerSaveBlocker.start(
          "prevent-app-suspension"
        );


      log(
        `[Agent] Power save blocker started: ${blockerId}`
      );

    } catch (err) {

      log(
        "[Agent] Power save blocker error:",
        err.message
      );
    }


    // --------------------------------------------------------
    // START WITH WINDOWS
    // --------------------------------------------------------

    try {

      app.setLoginItemSettings({
        openAtLogin: true
      });


      log(
        "[Agent] Windows startup enabled."
      );

    } catch (err) {

      log(
        "[Agent] Failed to configure startup:",
        err.message
      );
    }


    // --------------------------------------------------------
    // TRAY
    // --------------------------------------------------------

    try {

      const icon =
        nativeImage.createEmpty();


      tray = new Tray(icon);


      updateTray("stopped");


      log(
        "[Agent] Tray initialized."
      );

    } catch (err) {

      log(
        "[Agent] Tray initialization failed:",
        err.message
      );
    }


    // --------------------------------------------------------
    // TOKEN SERVER
    // --------------------------------------------------------

    startTokenServer();


    // --------------------------------------------------------
    // SAVED TOKEN
    // --------------------------------------------------------

    const savedToken =
      store.get("token");


    if (savedToken) {

      log(
        "[Agent] Saved token found."
      );

      log(
        "[Agent] Resuming tracking."
      );


      startTracking();

    } else {

      log(
        "[Agent] No token, waiting for login..."
      );


      updateTray("stopped");
    }


    log(
      "[Agent] Initialization completed."
    );
  });


  // ==========================================================
  // SECOND INSTANCE
  // ==========================================================

  app.on(
    "second-instance",
    () => {

      log(
        "[Agent] Second launch detected."
      );

      log(
        "[Agent] Existing instance will continue running."
      );


      // Open dashboard when user tries
      // to launch the EXE again.
      openApp();
    }
  );


  // ==========================================================
  // WINDOW ALL CLOSED
  // ==========================================================

  app.on(
    "window-all-closed",
    (event) => {

      // Keep tray application running.
      event.preventDefault();
    }
  );


  // ==========================================================
  // BEFORE QUIT
  // ==========================================================

  app.on(
    "before-quit",
    () => {

      if (isQuitting) {
        return;
      }


      isQuitting = true;


      log(
        "[Agent] Application shutting down..."
      );


      stopTracking();

      closeTokenServer();
    }
  );


  // ==========================================================
  // WILL QUIT
  // ==========================================================

  app.on(
    "will-quit",
    () => {

      log(
        "[Agent] Application quit."
      );
    }
  );
}