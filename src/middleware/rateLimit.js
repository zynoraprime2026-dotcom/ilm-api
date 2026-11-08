// Per-key request limiting. /v1/developers/signup is self-serve, so anybody can
// mint a free key and lean on the database. Limit in a fixed one-minute window
// per key, by tier, with the standard X-RateLimit headers so a client can back
// off properly. In-memory: each instance counts its own traffic, which is fine
// for abuse protection and needs no schema change.
const WINDOWS = {
  free: { limit: Number(process.env.RATE_LIMIT_FREE_PER_MIN || 60), windowMs: 60 * 1000 },
  pro: { limit: Number(process.env.RATE_LIMIT_PRO_PER_MIN || 600), windowMs: 60 * 1000 },
  academic: { limit: Number(process.env.RATE_LIMIT_ACADEMIC_PER_MIN || 600), windowMs: 60 * 1000 },
};

const buckets = new Map(); // key -> { count, resetAt }

function sweep(now) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}

function rateLimit(req, res, next) {
  const client = req.apiClient;
  if (!client || !client.key) return next();
  const cfg = WINDOWS[client.tier] || WINDOWS.free;
  const now = Date.now();
  let b = buckets.get(client.key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + cfg.windowMs };
    buckets.set(client.key, b);
    sweep(now);
  }
  b.count++;
  const remaining = Math.max(0, cfg.limit - b.count);
  const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  res.set('X-RateLimit-Limit', String(cfg.limit));
  res.set('X-RateLimit-Remaining', String(remaining));
  res.set('X-RateLimit-Reset', String(Math.ceil(b.resetAt / 1000)));
  if (b.count > cfg.limit) {
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Rate limit exceeded',
      tier: client.tier || 'free',
      limit: cfg.limit,
      window_seconds: Math.round(cfg.windowMs / 1000),
      retry_after_seconds: retryAfter,
    });
  }
  next();
}

module.exports = rateLimit;
module.exports.WINDOWS = WINDOWS;
