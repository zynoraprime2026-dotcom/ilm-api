// GET /v1/usage — what a developer needs to pace themselves: this key's tier,
// its per-minute burst allowance and daily budget, what it has spent, and when
// it resets. Without this, a 429 is a mystery.
const express = require('express');
const router = express.Router();
const rateLimit = require('../middleware/rateLimit');

router.get('/', (req, res) => {
  const c = req.apiClient || {};
  const u = rateLimit.usageFor(c.key, c.tier);
  res.json({
    key: c.key ? `${String(c.key).slice(0, 8)}…${String(c.key).slice(-4)}` : null,
    tier: u.tier,
    minute: { limit: u.minuteLimit, used: u.minuteUsed, remaining: u.minuteRemaining, resets_in_seconds: u.minuteResetsIn },
    day: { limit: u.dayLimit, used: u.dayUsed, remaining: u.dayRemaining, resets_at: u.dayResetsAt },
    requests_made_total: c.requests_made == null ? null : Number(c.requests_made),
    upgrade_hint: u.tier === 'free' ? 'Contact the API owner for an academic or pro tier.' : null,
  });
});

module.exports = router;
