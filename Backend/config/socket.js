const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const allowedOrigins = require("./allowedOrigins");

require("dotenv").config();

// Same role -> account-model mapping as middleware/auth/Anyrole.middleware.js,
// so a socket is authenticated exactly like a normal REST request.
const ROLE_CONFIG = {
  employee: { model: "../Models/user.model", recipientModel: "User" },
  manager: { model: "../Models/manager.model", recipientModel: "Manager" },
  senior_manager: { model: "../Models/manager.model", recipientModel: "Manager" },
  official: { model: "../Models/manager.model", recipientModel: "Manager" },
  admin: { model: "../Models/Admin.model", recipientModel: "Admin" },
  senior_admin: { model: "../Models/Admin.model", recipientModel: "Admin" },
  super_admin: { model: "../Models/superadmin.model", recipientModel: "SuperAdmin" },
};

let io = null;

// One room per person ("a person" = model + id), one room per organisation.
const personRoom = (recipientModel, id) => `person:${recipientModel}:${String(id)}`;
const orgRoom = (orgId) => `org:${String(orgId)}`;

const readCookie = (header, name) => {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
};

// Every rejection is logged with its reason, so "why is nobody connecting?"
// can be answered from the server log alone.
const reject = (socket, next, reason) => {
  console.log(`[socket] rejected (${reason}) from ${socket.handshake.address}`);
  return next(new Error(reason));
};

const authenticate = async (socket, next) => {
  try {
    // Browser: the same httpOnly "token" cookie the REST API uses.
    // Fallback: explicit token (e.g. mobile app) via socket.handshake.auth.token.
    // The tab's own token (socket.handshake.auth.token) wins over the shared cookie,
    // so two accounts in one browser each get their own socket identity.
    let token = socket.handshake.auth?.token || null;
    if (!token) token = readCookie(socket.handshake.headers.cookie, "token");
    if (!token) {
      const h = socket.handshake.headers.authorization;
      if (h?.startsWith("Bearer ")) token = h.slice(7);
    }
    if (!token) return reject(socket, next, "no_token_cookie");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const cfg = ROLE_CONFIG[decoded.role];
    if (!cfg) return reject(socket, next, "unknown_role");

    const rawId =
      decoded._id ||
      decoded.id ||
      decoded.userId ||
      decoded.adminid ||
      decoded.managerid ||
      decoded.superadminid ||
      null;
    if (!rawId) return reject(socket, next, "invalid_token_payload");

    const Model = require(cfg.model);
    let account;
    try {
      account = await Model.findById(rawId).select("_id organisation_id working_status").lean();
    } catch (dbErr) {
      // Transient DB problem: NOT the user's fault, so mark it retryable. The
      // client keeps retrying instead of staying dead until a page refresh.
      console.error("[socket] auth DB lookup failed:", dbErr.message);
      const e = new Error("server_busy");
      e.data = { retry: true };
      return next(e);
    }
    if (!account) return reject(socket, next, "account_not_found");
    if (account.working_status && account.working_status !== "working") {
      return reject(socket, next, "inactive");
    }

    socket.data.recipientModel = cfg.recipientModel;
    socket.data.id = String(account._id);
    socket.data.organisation_id =
      cfg.recipientModel === "SuperAdmin" ? String(account._id) : account.organisation_id ? String(account.organisation_id) : null;
    return next();
  } catch (err) {
    return reject(socket, next, `jwt_${err.name || "error"}`);
  }
};

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    // Works behind the /talent/api reverse proxy: proxy rewrites
    // /talent/api/socket.io -> /socket.io on this server.
    path: "/socket.io",
    cors: { origin: allowedOrigins, credentials: true },
    // websocket first, long-polling as a fallback (IIS/proxies without WS support).
    transports: ["polling", "websocket"],
    pingInterval: 25000,
    pingTimeout: 20000,
    // IIS / ARR / nginx buffer or re-compress long-poll responses, which makes
    // live events show up late ("only after refresh"). Keep payloads untouched.
    httpCompression: false,
    perMessageDeflate: false,
  });

  // Tell every proxy in front of Node: never buffer or cache socket.io traffic.
  io.engine.on("headers", (headers) => {
    headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
    headers["X-Accel-Buffering"] = "no"; // nginx
    headers["Pragma"] = "no-cache";
  });

  io.use(authenticate);

  io.on("connection", (socket) => {
    const { recipientModel, id, organisation_id } = socket.data;
    socket.join(personRoom(recipientModel, id));
    if (organisation_id) socket.join(orgRoom(organisation_id));
    console.log(`[socket] connected ${recipientModel}:${id} via ${socket.conn.transport.name} (total: ${io.engine.clientsCount})`);
    socket.emit("socket:ready", { recipientModel, id, key: `${recipientModel}:${id}` });

    // chat / presence / calls. Required lazily: chatSocket needs this module's
    // emit helpers, which only exist once this file has finished loading.
    try {
      require("./chatSocket").registerChatSocket(io, socket);
    } catch (err) {
      console.error("[socket] chat handlers failed to attach:", err.message);
    }
  });

  console.log("Socket.IO initialised");
  return io;
};

// --- emit helpers: never throw, so they can't break the REST action that calls them ---

const emitToRecipient = (recipientModel, recipientId, event, payload) => {
  try {
    if (!io || !recipientModel || !recipientId) return;
    io.to(personRoom(recipientModel, recipientId)).emit(event, payload);
  } catch (err) {
    console.error("[socket] emitToRecipient failed:", err.message);
  }
};

const emitToOrganisation = (orgId, event, payload) => {
  try {
    if (!io || !orgId) return;
    io.to(orgRoom(orgId)).emit(event, payload);
  } catch (err) {
    console.error("[socket] emitToOrganisation failed:", err.message);
  }
};

module.exports = { initSocket, emitToRecipient, emitToOrganisation, getIO: () => io };