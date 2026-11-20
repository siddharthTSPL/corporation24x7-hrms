// In-memory presence: which people have at least one live socket.
// (Single Node process. If you ever run several instances, swap this and
// callRooms.js for the socket.io Redis adapter + a shared store.)
//
// "Last seen" is also saved to the DB (ChatPresence) so it survives restarts, and each
// person's privacy choices (hide online / typing indicator) are cached here so every
// place that shows presence goes through publicState() and respects them.
const rooms = require("./callRooms");
const ChatPresence = require("../../Models/chatpresence.model");
const ChatSettings = require("../../Models/chatsettings.model");

const sockets = new Map(); // key -> Set(socketId)
const lastSeen = new Map(); // key -> Date
const privacy = new Map(); // key -> { hideOnline, typingIndicator }  (absent => defaults)
const privacyLoaded = new Set();

const isGuestKey = (key) => String(key).startsWith("Guest:");

const persist = (key, at) => {
  if (isGuestKey(key)) return;
  ChatPresence.updateOne({ key }, { $set: { lastSeenAt: at } }, { upsert: true }).catch((err) =>
    console.error("[presence] saving last seen failed:", err.message)
  );
};

const add = (key, socketId) => {
  let set = sockets.get(key);
  const wasOffline = !set || set.size === 0;
  if (!set) sockets.set(key, (set = new Set()));
  set.add(socketId);
  // make sure a last-seen row exists for everyone who connects, so even after a crash / restart
  // (when the disconnect never got saved) they show "Last seen ..." instead of a bare "Offline".
  // $setOnInsert never overwrites a real last-seen time.
  if (wasOffline && !isGuestKey(key)) {
    ChatPresence.updateOne({ key }, { $setOnInsert: { lastSeenAt: new Date() } }, { upsert: true }).catch(() => {});
  }
  return wasOffline; // true => this connection flipped them online
};

const remove = (key, socketId) => {
  const set = sockets.get(key);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    sockets.delete(key);
    const now = new Date();
    lastSeen.set(key, now);
    persist(key, now); // fire-and-forget: a DB hiccup must never break a disconnect
    return true; // flipped offline
  }
  return false;
};

const isOnline = (key) => (sockets.get(key)?.size || 0) > 0; // real state (message delivery, calls)
const lastSeenAt = (key) => lastSeen.get(key) || null;
const isInCall = (key) => isOnline(key) && rooms.isInCall(key);

// ----- privacy cache -----
const setPrivacy = (key, p) => {
  privacy.set(key, { hideOnline: !!p.hideOnline, typingIndicator: p.typingIndicator !== false });
  privacyLoaded.add(key);
};
const isHidden = (key) => !!privacy.get(key)?.hideOnline;
const typingEnabled = (key) => privacy.get(key)?.typingIndicator !== false;

const loadPrivacy = async (keys) => {
  const missing = [...new Set(keys)].filter((k) => !privacyLoaded.has(k) && !isGuestKey(k));
  if (!missing.length) return;
  try {
    const rows = await ChatSettings.find({ key: { $in: missing } }).select("key privacy").lean();
    for (const r of rows) setPrivacy(r.key, r.privacy || {});
    for (const k of missing) privacyLoaded.add(k); // no row => defaults
  } catch (err) {
    console.error("[presence] loading privacy failed:", err.message);
  }
};

// Loads last-seen times (from DB, e.g. after a restart) and privacy choices for these people.
const hydrate = async (keys) => {
  const list = [...new Set(keys)];
  await loadPrivacy(list);
  const missing = list.filter((k) => !isOnline(k) && !lastSeen.has(k) && !isGuestKey(k));
  if (!missing.length) return;
  try {
    const rows = await ChatPresence.find({ key: { $in: missing } }).select("key lastSeenAt").lean();
    for (const r of rows) if (!lastSeen.has(r.key)) lastSeen.set(r.key, r.lastSeenAt);
  } catch (err) {
    console.error("[presence] loading last seen failed:", err.message);
  }
};

// What OTHER people are allowed to see about `key`. `viewerKey === key` always sees the truth.
const publicState = (key, viewerKey = null) => {
  if (isHidden(key) && viewerKey !== key) return { online: false, inCall: false, lastSeenAt: null };
  const online = isOnline(key);
  return { online, inCall: isInCall(key), lastSeenAt: online ? null : lastSeenAt(key) };
};

const snapshot = (keys, viewerKey = null) => keys.map((key) => ({ key, ...publicState(key, viewerKey) }));

module.exports = {
  add, remove, isOnline, isInCall, lastSeenAt,
  snapshot, hydrate, publicState,
  setPrivacy, isHidden, typingEnabled, loadPrivacy,
};
