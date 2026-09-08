const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
  max: 2000,
  ttl: 60_000,
  updateAgeOnGet: false,
});

module.exports = cache;