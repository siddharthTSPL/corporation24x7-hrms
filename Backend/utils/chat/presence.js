// In-memory presence: which people have at least one live socket.
// (Single Node process. If you ever run several instances, swap this and
// callRooms.js for the socket.io Redis adapter + a shared store.)
const sockets = new Map(); // key -> Set(socketId)
const lastSeen = new Map(); // key -> Date

const add = (key, socketId) => {
  let set = sockets.get(key);
  const wasOffline = !set || set.size === 0;
  if (!set) sockets.set(key, (set = new Set()));
  set.add(socketId);
  return wasOffline; // true => this connection flipped them online
};

const remove = (key, socketId) => {
  const set = sockets.get(key);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    sockets.delete(key);
    lastSeen.set(key, new Date());
    return true; // flipped offline
  }
  return false;
};

const isOnline = (key) => (sockets.get(key)?.size || 0) > 0;
const lastSeenAt = (key) => lastSeen.get(key) || null;
const snapshot = (keys) => keys.map((key) => ({ key, online: isOnline(key), lastSeenAt: isOnline(key) ? null : lastSeenAt(key) }));

module.exports = { add, remove, isOnline, lastSeenAt, snapshot };
