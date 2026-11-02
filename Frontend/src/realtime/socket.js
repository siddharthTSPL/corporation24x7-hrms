import { io } from "socket.io-client";
import { useChatStore } from "../auth/store/chat/chatStore";
import { getTabToken } from "../lib/Tabsession";

// Same base the axios clients use: "/talent/api" in production (reverse proxy
// strips /talent/api before it reaches Node), "http://localhost:5000/" in dev.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/";

const resolveTarget = () => {
  const url = new URL(API_URL, window.location.origin);
  const basePath = url.pathname.replace(/\/+$/, "");
  return { origin: url.origin, path: `${basePath}/socket.io` };
};

// ONE socket for the whole app, and it is NEVER replaced. Every hook keeps a
// reference to this same object, so a logout/login can't leave some listeners
// attached to a dead socket (the old code set `socket = null` on disconnect,
// which silently orphaned chat/call listeners).
// Outsiders (meeting guests) connect with a short-lived guest token instead of a login.
let guestToken = null;
export const setGuestToken = (t) => {
  guestToken = t || null;
};

let socket = null;
let wantConnected = false;
let retryTimer = null;
let retryCount = 0;
let listenersBound = false;

const clearRetry = () => {
  clearTimeout(retryTimer);
  retryTimer = null;
};

// socket.io does NOT retry by itself when the server middleware rejects the
// handshake (auth hiccup, DB blip, cookie not there yet). That left the socket
// dead until a page refresh. We retry ourselves with a capped back-off.
const scheduleRetry = () => {
  if (!wantConnected || !socket || socket.connected || retryTimer) return;
  retryCount += 1;
  const delay = Math.min(30000, 1500 * 2 ** Math.min(retryCount, 5));
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (wantConnected && socket && !socket.connected) socket.connect();
  }, delay);
};

// Tab came back / network came back / user focused the window: reconnect now.
const nudge = () => {
  if (!wantConnected || !socket || socket.connected) return;
  clearRetry();
  retryCount = 0;
  socket.connect();
};

const bindGlobalListeners = () => {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  window.addEventListener("online", nudge);
  window.addEventListener("focus", nudge);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") nudge();
  });
};

export const getSocket = () => {
  if (socket) return socket;
  const { origin, path } = resolveTarget();
  socket = io(origin, {
    path,
    withCredentials: true, // sends the same "token" cookie the REST API uses
    // This tab's own login token (re-read on every (re)connect). Falls back to the cookie when absent.
    auth: (cb) => cb(guestToken ? { guestToken } : { token: getTabToken() || undefined }),
    autoConnect: false,
    // Default order (long-polling first, then upgrade to WebSocket). Works
    // through ANY proxy (IIS/ARR, nginx, Cloudflare); if WebSocket is blocked
    // it simply stays on long-polling instead of failing to connect.
    tryAllTransports: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on("socket:ready", ({ recipientModel, id, key }) => {
    const mine = key || (recipientModel && id ? `${recipientModel}:${id}` : null);
    if (mine && useChatStore.getState().myKey !== mine) useChatStore.getState().setMyKey(mine);
  });

  socket.on("connect", () => {
    retryCount = 0;
    clearRetry();
    console.info("[socket] connected via", socket.io.engine.transport.name, "| id:", socket.id);
  });
  socket.on("connect_error", (err) => {
    console.warn("[socket] connect_error:", err.message, "| url:", origin + path);
    // Auto-reconnect only covers network errors; handshake rejections need our retry.
    if (!socket.active) scheduleRetry();
  });
  socket.on("disconnect", (reason) => {
    console.info("[socket] disconnected:", reason);
    // "io server disconnect" = server kicked us; socket.io will NOT reconnect on its own.
    if (reason === "io server disconnect") scheduleRetry();
  });

  if (typeof window !== "undefined") window.__hrmsSocket = socket; // debugging: __hrmsSocket.connected
  bindGlobalListeners();
  return socket;
};

export const connectSocket = () => {
  wantConnected = true;
  const s = getSocket();
  if (!s.connected && !s.active) s.connect();
  return s;
};

// Logout: close the connection but KEEP the same socket object (and its listeners).
export const disconnectSocket = () => {
  wantConnected = false;
  clearRetry();
  retryCount = 0;
  if (socket) socket.disconnect();
};