const db = require('../config/db');

// Simple API key check — expects header: x-api-key
// Public endpoints (docs, health) should skip this middleware.
async function apiKeyAuth(req, res, next) {
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
    console.error('API key auth error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

module.exports = apiKeyAuth;
