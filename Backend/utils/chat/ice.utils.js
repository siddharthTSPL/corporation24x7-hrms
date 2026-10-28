const crypto = require("crypto");

// WebRTC needs STUN (find your public address) and, for people behind strict
// firewalls / mobile networks / corporate NAT, a TURN relay. Without TURN,
// roughly 10-20% of calls between offices and homes will fail to connect.
//
// .env options (all optional):
//   STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
//   TURN_URLS=turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp
//   TURN_SECRET=<coturn static-auth-secret>   -> short-lived per-user credentials (recommended)
//   TURN_USERNAME / TURN_CREDENTIAL            -> or one fixed username+password
const csv = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

const CRED_TTL_SEC = 24 * 60 * 60;

const getIceServers = (userKey = "anon") => {
  const stun = csv(process.env.STUN_URLS);
  const servers = [{ urls: stun.length ? stun : ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

  const turnUrls = csv(process.env.TURN_URLS);
  if (turnUrls.length) {
    if (process.env.TURN_SECRET) {
      // coturn "use-auth-secret": username = expiry:label, credential = base64(HMAC-SHA1(secret, username))
      const username = `${Math.floor(Date.now() / 1000) + CRED_TTL_SEC}:${String(userKey).replace(/[^\w:-]/g, "")}`;
      const credential = crypto.createHmac("sha1", process.env.TURN_SECRET).update(username).digest("base64");
      servers.push({ urls: turnUrls, username, credential });
    } else if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      servers.push({ urls: turnUrls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
    }
  }
  return servers;
};

module.exports = { getIceServers, hasTurn: () => csv(process.env.TURN_URLS).length > 0 };
