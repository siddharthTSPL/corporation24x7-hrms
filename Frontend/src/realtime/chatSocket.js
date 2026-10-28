import { getSocket } from "./socket";

// Promise wrapper for the backend's ack protocol:
//   server answers { ok: true, ...data }  or  { ok: false, error, code? }
// Resolves with the data, rejects with an Error that carries .code
// (e.g. WAITING_FOR_HOST, TOO_EARLY, SHARE_IN_USE, CALL_ENDED).
export const emitAck = (event, payload = {}, timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket.connected) {
      reject(Object.assign(new Error("You're offline. Reconnecting..."), { code: "OFFLINE" }));
      return;
    }
    socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) return reject(Object.assign(new Error("The server took too long to respond."), { code: "TIMEOUT" }));
      if (!res || res.ok === false) {
        return reject(Object.assign(new Error(res?.error || "Request failed."), { code: res?.code }));
      }
      resolve(res);
    });
  });

// Fire-and-forget (typing indicators etc.) - never throws.
export const emitQuiet = (event, payload = {}) => {
  try {
    const socket = getSocket();
    if (socket.connected) socket.emit(event, payload);
  } catch {
    /* ignore */
  }
};
