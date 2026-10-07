const { Pool } = require('pg');

// TLS is required by hosted Postgres (Neon, Supabase pooler), but must stay off
// for local sockets / localhost. Parse the host out of the URL and decide.
let sslOpt = false;
try {
  const u = new URL(process.env.DATABASE_URL);
  const h = u.hostname;
  if (h && h !== 'localhost' && h !== '127.0.0.1' && h !== '::1' && h !== '[::1]') {
    sslOpt = { rejectUnauthorized: false };
  }
} catch (e) { /* no DATABASE_URL or a socket-style URL: default to no TLS */ }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PG_POOL_MAX, 10) || 20, // tune upward behind a connection pooler (e.g. PgBouncer) at scale
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: sslOpt,
});

// Serverless Postgres (Neon) suspends compute and drops idle sockets; the pool
// replaces the dead client on its own. Never crash the whole server over one
// dropped connection.
pool.on('error', (err) => {
  console.error('Idle Postgres client error (pool will recover):', err.message);
});

// Retry once on connection-level failures (stale socket after a Neon suspend).
const RETRYABLE = ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED', 'Connection terminated', 'connection ended'];
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (e) {
    const sig = String(e.code || '') + ' ' + String(e.message || '');
    if (RETRYABLE.some((r) => sig.includes(r))) {
      return await pool.query(text, params);
    }
    throw e;
  }
}

module.exports = {
  query,
  pool,
};
