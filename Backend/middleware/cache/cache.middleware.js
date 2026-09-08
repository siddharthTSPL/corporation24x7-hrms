const cache = require('../../utils/Cache');

/**
 * Wraps a GET route with a short-lived, per-key in-memory (LRU) cache.
 *
 * WHY: some endpoints (analytics aggregations, list views, dashboards) run
 * expensive Mongo queries that return the *same* result for many requests
 * in a row — same org, same filters, hit repeatedly as users switch tabs,
 * refresh, or as TanStack Query refetches on window focus. Caching those
 * for a few seconds/minutes in server memory means those repeat requests
 * never touch Mongo at all, which is the fastest possible response short
 * of the browser not asking at all.
 *
 * SAFETY RULES — read before adding this to a new route:
 *  1. Only put this in front of GET routes. It no-ops for every other verb.
 *  2. Only use it for data that's safe to be `ttlMs` stale. Don't use it on
 *     anything that must reflect a write immediately after that write
 *     (e.g. "did my check-in just register") unless you also invalidate.
 *  3. The cache key MUST capture everything that changes the response —
 *     organisation_id plus the full querystring, by default. If two
 *     different requests can produce different data but land on the same
 *     key, that's a cross-tenant data leak. When in doubt, pass a custom
 *     keyFn.
 *
 * @param {number} ttlMs - how long a cached entry stays fresh (ms)
 * @param {(req: import('express').Request) => string} [keyFn] - builds the
 *   cache key. Defaults to `${organisation_id}:${originalUrl}`, which covers
 *   query params automatically since they're part of originalUrl.
 */
const cacheRoute = (ttlMs = 30_000, keyFn) => {
  const buildKey =
    keyFn ||
    ((req) => {
      const orgId =
        req.admin?.organisation_id ||
        req.superAdmin?._id ||
        req.manager?.organisation_id ||
        req.user?.organisation_id ||
        'anon';
      return `${orgId}:${req.originalUrl}`;
    });

  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = buildKey(req);
    const cached = cache.get(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.status(cached.status).json(cached.body);
    }

    // Intercept res.json so a normal `res.json(data)` in the controller
    // keeps working unchanged — the controller has no idea caching exists.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, { status: res.statusCode, body }, { ttl: ttlMs });
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

/**
 * Call from a write (POST/PUT/PATCH/DELETE) handler after it changes data
 * that a cacheRoute()'d GET depends on, so the next read isn't served a
 * stale cached copy for the rest of its TTL. Since keys are always
 * `${orgId}:${url}`, this clears every cached GET for that one organisation
 * (never touches other orgs' entries).
 *
 * @param {string} orgId
 */
const invalidateOrgCache = (orgId) => {
  if (!orgId) return;
  const prefix = `${orgId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

/**
 * Same as invalidateOrgCache, but for entries keyed by an individual
 * user/actor id rather than an organisation — use this for "my own data"
 * endpoints (getme/profile) where two people in the same org must never
 * share a cache entry.
 *
 * @param {string} userId
 */
const invalidateUserCache = (userId) => {
  if (!userId) return;
  const prefix = `user:${userId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

module.exports = { cacheRoute, invalidateOrgCache, invalidateUserCache };