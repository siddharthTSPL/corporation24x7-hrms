import { getSocket } from "./socket";

// Promise wrapper for the backend's ack protocol:
//   server answers { ok: true, ...data }  or  { ok: false, error, code? }
// Resolves with the data, rejects with an Error that carries .code
// (e.g. WAITING_FOR_HOST, TOO_EARLY, SHARE_IN_USE, CALL_ENDED).
export const emitAck = (event, payload = {}, timeoutMs = 10000, waitForConnectMs = 6000) =>
  new Promise((resolve, reject) => {
    const socket = getSocket();

    const send = () => {
      socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
        if (err) return reject(Object.assign(new Error("The server took too long to respond."), { code: "TIMEOUT" }));
        if (!res || res.ok === false) {
          return reject(Object.assign(new Error(res?.error || "Request failed."), { code: res?.code }));
        }
        resolve(res);
      });
    };

    if (socket.connected) return send();

    // Behind a proxy without WebSocket the socket reconnects over long-polling every
    // now and then. Wait a few seconds for it instead of failing the action instantly.
    if (!waitForConnectMs) {
      return reject(Object.assign(new Error("You're offline. Reconnecting..."), { code: "OFFLINE" }));
    }
    let done = false;
    const onConnect = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      send();
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      socket.off("connect", onConnect);
      reject(Object.assign(new Error("You're offline. Reconnecting..."), { code: "OFFLINE" }));
    }, waitForConnectMs);
    socket.once("connect", onConnect);
    if (!socket.active) socket.connect();
  });

// Same as emitAck, but for calls: longer timeout, and ONE retry if the server's answer
// was lost/late (call:start / call:join are idempotent per socket, so a retry is safe).
export const emitAckRetry = async (event, payload = {}, timeoutMs = 20000) => {
  try {
    return await emitAck(event, payload, timeoutMs, 8000);
  } catch (err) {
    if (err.code !== "TIMEOUT" && err.code !== "OFFLINE") throw err;
    return emitAck(event, payload, timeoutMs, 8000);
  }
};

// Fire-and-forget (typing indicators etc.) - never throws.
export const emitQuiet = (event, payload = {}) => {
  try {
    const socket = getSocket();
    if (socket.connected) socket.emit(event, payload);
  } catch {
    /* ignore */
  }
};