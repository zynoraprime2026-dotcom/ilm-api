const Redis = require('ioredis');

let redis = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't keep retrying if Redis is down
  });
  redis.on('error', (err) => {
    console.warn('Redis unavailable, falling back to no-cache mode:', err.message);
    redis = null;
  });
}

const DEFAULT_TTL = 60 * 60 * 24; // 24h — Quran/Hadith text never changes

async function getCached(key) {
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

async function setCached(key, value, ttl = DEFAULT_TTL) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // fail silently — cache is an optimization, not a dependency
  }
}

module.exports = { getCached, setCached };
