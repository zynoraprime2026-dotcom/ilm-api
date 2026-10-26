const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

function generateApiKey() {
  return 'ilm_' + crypto.randomBytes(24).toString('hex');
}

// POST /v1/developers/signup — { email, tier? } -> { key }
// Self-serve — no approval step. Free tier by default; academic/pro tiers
// would typically be upgraded manually or via a billing flow later.
router.post('/signup', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  try {
    const existing = await db.query('SELECT key, tier FROM api_keys WHERE owner_email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(200).json({
        message: 'An API key already exists for this email.',
        key: existing.rows[0].key,
        tier: existing.rows[0].tier,
      });
    }

    const key = generateApiKey();
    const result = await db.query(
      `INSERT INTO api_keys (key, owner_email, tier) VALUES ($1, $2, 'free') RETURNING key, tier, created_at`,
      [key, email]
    );

    res.status(201).json({
      message: 'API key created. Include it as the x-api-key header on every /v1 request.',
      ...result.rows[0],
    });
  } catch (err) {
    console.error('Developer signup error:', err);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});


// TEMPORARY one-shot rotation of the retired web-app key (removed in the next deploy).
// The unguessable path token is the only authorization; the rotation is a no-op
// once the old key no longer exists.
router.get('/rotate-0b9a22002f0df6a38adb2abf215320bccda818d5340393df', async (req, res) => {
  const OLD_KEY = 'ilm_41cf502bdd0b2b07650bdb302edece3c';
  try {
    const cur = await db.query('SELECT id FROM api_keys WHERE key = $1', [OLD_KEY]);
    if (cur.rows.length === 0) {
      return res.json({ rotated: false, note: 'old key not present — nothing to rotate' });
    }
    const fresh = generateApiKey();
    await db.query('UPDATE api_keys SET key = $1 WHERE key = $2', [fresh, OLD_KEY]);
    const row = await db.query('SELECT key, owner_email, tier, requests_made, created_at FROM api_keys WHERE key = $1', [fresh]);
    res.json({ rotated: true, ...row.rows[0] });
  } catch (err) {
    console.error('Rotation error:', err.message);
    res.status(500).json({ error: 'rotation failed' });
  }
});

module.exports = router;
