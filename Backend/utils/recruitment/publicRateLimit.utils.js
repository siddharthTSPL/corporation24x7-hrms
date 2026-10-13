const hits = new Map();

const WINDOW_MS = 10 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, list] of hits.entries()) {
    const fresh = list.filter((t) => t > cutoff);
    if (fresh.length) hits.set(key, fresh);
    else hits.delete(key);
  }
}, WINDOW_MS).unref();

const publicRateLimit = (max = 40) => (req, res, next) => {
  const key = `${req.ip}:${req.baseUrl}${req.path.replace(/[a-f0-9]{32,}/gi, ":token")}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => t > now - WINDOW_MS);
  if (list.length >= max) {
    return res.status(429).json({ success: false, message: "Too many requests. Please try again in a few minutes" });
  }
  list.push(now);
  hits.set(key, list);
  next();
};

module.exports = publicRateLimit;