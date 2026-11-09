// Self-healing for columns the code depends on but an older database may lack.
// Found in production: api_keys had no "tier" column, so every signup failed with
// 42703 and the tier-aware rate limiter had nothing to read. Each statement is
// idempotent and additive (IF NOT EXISTS), so running it on every cold start is
// safe and never drops or rewrites data.
const db = require('../config/db');

const STATEMENTS = [
  "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free'",
  "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS owner_email TEXT",
  "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS requests_made INTEGER DEFAULT 0",
  "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
  "UPDATE api_keys SET tier = 'free' WHERE tier IS NULL",
];

let ready = null;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      for (const sql of STATEMENTS) {
        try { await db.query(sql); }
        catch (e) { console.error('ensureSchema skipped:', sql.slice(0, 60), '|', e.code || e.message); }
      }
    })();
  }
  return ready;
}

// Express middleware: the first request waits for the repair, the rest do not.
function schemaGuard(req, res, next) {
  ensureSchema().then(() => next(), () => next());
}

module.exports = { ensureSchema, schemaGuard };
