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

module.exports = router;
