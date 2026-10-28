import { io } from "socket.io-client";

// Same base the axios clients use: "/talent/api" in production (reverse proxy
// strips /talent/api before it reaches Node), "http://localhost:5000/" in dev.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/";

const resolveTarget = () => {
  const url = new URL(API_URL, window.location.origin);
  const basePath = url.pathname.replace(/\/+$/, "");
  return { origin: url.origin, path: `${basePath}/socket.io` };
};

let socket = null;

export const getSocket = () => {
  if (socket) return socket;
  const { origin, path } = resolveTarget();
  socket = io(origin, {
    path,
    withCredentials: true, // sends the same "token" cookie the REST API uses
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnectionDelayMax: 10000,
  });
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected && !s.active) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
