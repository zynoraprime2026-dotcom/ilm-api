const db = require('../config/db');
const { classify } = require('../lib/guards');

// Simple API key check — expects header: x-api-key
// Public endpoints (docs, health) should skip this middleware.
async function apiKeyAuth(req, res, next) {
  // Web-gated clients (/web/v1, origin-checked at the gate) act on the app's
  // behalf with no key — skip the key lookup for them.
  if (req.apiClient && req.apiClient.source === 'web') return next();
  const key = req.header('x-api-key');

  if (!key) {
    return res.status(401).json({ error: 'Missing API key. Include it as the x-api-key header.' });
  }

  try {
    const { rows } = await db.query('SELECT * FROM api_keys WHERE key = $1', [key]);
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    // fire-and-forget usage counter (don't block the request on this)
    db.query('UPDATE api_keys SET requests_made = requests_made + 1 WHERE key = $1', [key]).catch(() => {});

    req.apiClient = rows[0];
    next();
  } catch (err) {
    console.error('API key auth error:', err && (err.code || err.message));
    const c = classify(err);
    res.status(c.status).json({ error: 'Internal server error during authentication', db_error: c.db_error });
  }
}

module.exports = apiKeyAuth;
