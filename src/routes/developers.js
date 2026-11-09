const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { classify } = require('../lib/guards');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const mailer = require('../lib/mailer');

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
    // Never return an existing key to an unauthenticated caller: knowing a
    // developer's email would otherwise be enough to take over their key, their
    // quota and any tier they paid for. The masked hint is enough to tell them
    // which key they are looking for.
    const existing = await db.query('SELECT key, tier FROM api_keys WHERE owner_email = $1', [email]);
    if (existing.rows.length > 0) {
      const k = String(existing.rows[0].key);
      return res.status(200).json({
        message: 'An API key already exists for this email. Use the key you saved; if it is lost, rotate it with POST /v1/developers/keys/rotate from a key-holder or contact the API owner.',
        key_hint: `${k.slice(0, 8)}…${k.slice(-4)}`,
        key: null,
        tier: existing.rows[0].tier,
      });
    }

    const key = generateApiKey();
    const result = await db.query(
      `INSERT INTO api_keys (key, owner_email, tier) VALUES ($1, $2, 'free') RETURNING key, tier, created_at`,
      [key, email]
    );

    const created = result.rows[0];
    // With a mailer configured the key goes to the address, not to whoever made
    // the request: otherwise signing up with somebody else's email would hand
    // the caller that person's key. Without one, the key is returned directly so
    // the API still works out of the box.
    if (mailer.available()) {
      const mail = await mailer.send({ to: email, ...mailer.keyEmail({ key: created.key, tier: created.tier }) });
      if (mail.sent) {
        return res.status(201).json({
          message: `Key created and emailed to ${email}. Include it as the x-api-key header on every /v1 request.`,
          key: null,
          emailed: true,
          tier: created.tier,
          created_at: created.created_at,
        });
      }
      console.error('Signup mail failed:', mail.reason);
      return res.status(201).json({
        message: 'Key created but the email did not send. Use the key in this response and keep it safe, or call POST /v1/developers/keys/recover to have it sent again.',
        key: created.key,
        emailed: false,
        tier: created.tier,
        created_at: created.created_at,
      });
    }

    res.status(201).json({
      message: 'API key created. Include it as the x-api-key header on every /v1 request. Save it: email delivery is not configured, so this is the only time it is shown.',
      ...created,
      emailed: false,
    });
  } catch (err) {
    console.error('Developer signup error:', err && (err.code || err.message));
    const c = classify(err);
    res.status(c.status === 500 ? 500 : c.status).json({ error: 'Internal server error during signup', db_error: c.db_error, pg_code: (err && err.code) || null, hint: String((err && err.message) || '').replace(/postgres(ql)?:\/\/\S+/gi, '[redacted]').slice(0, 140) });
  }
});



// POST /v1/developers/keys/recover — { email } -> generic 200.
// Someone who loses a key should not have to write to the owner. The reply is
// identical whether or not the address is known, so this cannot be used to test
// who has an account, and the key only ever goes to the address on file.
const COOLDOWN_MS = Number(process.env.ILM_RECOVER_COOLDOWN_MS || 10 * 60 * 1000);
const recentRecoveries = new Map();

router.post('/keys/recover', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!mailer.available()) {
    return res.status(503).json({ error: 'Email delivery is not configured on this API, so keys cannot be recovered automatically. Contact the API owner.' });
  }

  const generic = { message: 'If that address has a key, it has been emailed to it. Check the inbox and the spam folder.' };
  const now = Date.now();
  const last = recentRecoveries.get(email) || 0;
  if (now - last < COOLDOWN_MS) return res.json(generic);

  try {
    const { rows } = await db.query('SELECT key, tier FROM api_keys WHERE owner_email = $1', [email]);
    if (rows.length > 0) {
      recentRecoveries.set(email, now);
      const mail = await mailer.send({ to: email, ...mailer.keyEmail({ key: rows[0].key, tier: rows[0].tier }) });
      if (!mail.sent) console.error('Recovery mail failed:', mail.reason);
    }
    res.json(generic);
  } catch (err) {
    console.error('Key recovery error:', err && (err.code || err.message));
    // Still generic: a database problem must not become an account oracle.
    res.json(generic);
  }
});

// POST /v1/developers/keys/rotate — authenticated by the key itself.
// A leaked key needs a self-serve way out: rotating invalidates the old value
// immediately while keeping the same row, tier and usage history.
router.post('/keys/rotate', apiKeyAuth, async (req, res) => {
  const oldKey = req.header('x-api-key');
  try {
    const key = generateApiKey();
    const { rows } = await db.query(
      `UPDATE api_keys SET key = $1 WHERE key = $2 RETURNING key, tier, created_at`,
      [key, oldKey]
    );
    if (rows.length === 0) return res.status(403).json({ error: 'Invalid API key' });
    res.json({
      message: 'Key rotated. The previous key no longer works anywhere — update your clients.',
      ...rows[0],
    });
  } catch (err) {
    console.error('Key rotation error:', err && (err.code || err.message));
    const c = classify(err);
    res.status(500).json({ error: 'Internal server error during rotation', db_error: c.db_error });
  }
});

// POST /v1/developers/keys/revoke — authenticated by the key itself.
// Deletes the key outright, for when it is compromised or the developer is done.
router.post('/keys/revoke', apiKeyAuth, async (req, res) => {
  const key = req.header('x-api-key');
  try {
    const { rows } = await db.query('DELETE FROM api_keys WHERE key = $1 RETURNING owner_email', [key]);
    if (rows.length === 0) return res.status(403).json({ error: 'Invalid API key' });
    res.json({ message: 'Key revoked and deleted. Sign up again at POST /v1/developers/signup for a new one.' });
  } catch (err) {
    console.error('Key revoke error:', err && (err.code || err.message));
    const c = classify(err);
    res.status(500).json({ error: 'Internal server error during revoke', db_error: c.db_error });
  }
});

module.exports = router;
