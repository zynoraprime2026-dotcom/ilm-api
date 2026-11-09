// GET /v1/status — public, unauthenticated. Answers the only question a
// developer actually asks when something breaks: is the API itself alive, is
// the database behind it alive, and does the data still look like the data.
// Deliberately cheap: table counts are cached in-process for five minutes.
const express = require('express');
const router = express.Router();
const db = require('../config/db');

const CACHE_MS = 5 * 60 * 1000;
let cached = null;
let cachedAt = 0;

async function probe() {
  const out = { db: 'down', db_error: null, counts: {} };
  try {
    await Promise.race([
      db.query('SELECT 1'),
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('probe timeout'), { code: 'ETIMEDOUT' })), 5000)),
    ]);
    out.db = 'up';
  } catch (e) {
    const msg = String(e.message || '');
    out.db_error = /password|SASL|authentication/i.test(msg) ? 'auth_failed'
      : /ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(msg) ? 'dns_failed'
      : /ETIMEDOUT|timeout/i.test(msg) ? 'timeout'
      : /does not exist/i.test(msg) ? 'missing_table'
      : 'unreachable';
    return out;
  }
  for (const [label, sql] of [
    ['surahs', 'SELECT count(*)::int AS c FROM surahs'],
    ['ayahs', 'SELECT count(*)::int AS c FROM ayahs'],
    ['hadiths', 'SELECT count(*)::int AS c FROM hadiths'],
    ['tafsir', 'SELECT count(*)::int AS c FROM tafsir'],
    ['duas', 'SELECT count(*)::int AS c FROM duas'],
  ]) {
    try {
      const { rows } = await db.query(sql);
      out.counts[label] = rows[0].c;
    } catch (e) {
      out.counts[label] = null;
    }
  }
  return out;
}

router.get('/', async (req, res) => {
  const now = Date.now();
  if (!cached || now - cachedAt > CACHE_MS) {
    cached = await probe();
    cachedAt = now;
  }
  const body = {
    service: 'ilm-api',
    version: process.env.API_VERSION || require('../../package.json').version,
    status: cached.db === 'up' ? 'ok' : 'degraded',
    db: cached.db,
    db_error: cached.db_error,
    data: cached.counts,
    checked_at: new Date(cachedAt).toISOString(),
    uptime_seconds: Math.round(process.uptime()),
  };
  const wantsHtml = String(req.headers.accept || '').includes('text/html');
  if (!wantsHtml) {
    res.status(cached.db === 'up' ? 200 : 503).json(body);
    return;
  }
  const ok = cached.db === 'up';
  res.status(ok ? 200 : 503).type('html').send(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>ilm-api status</title>
<style>body{font-family:system-ui,sans-serif;background:#0b1a18;color:#f2ecdb;padding:28px;line-height:1.6}
h1{font-size:20px;margin:0 0 4px}.pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600}
.ok{background:#1d4d38;color:#8fe0b8}.bad{background:#4d1d1d;color:#f0a3a3}
table{border-collapse:collapse;margin-top:14px}td{padding:4px 14px 4px 0;color:#92aaa2}
small{color:#5f7a72}</style></head><body>
<h1>ilm-api</h1>
<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'operational' : 'degraded'}</span>
<p><small>version ${body.version} · uptime ${body.uptime_seconds}s · checked ${body.checked_at}</small></p>
${body.db_error ? `<p><small>database: ${body.db_error}</small></p>` : ''}
<table>${Object.entries(body.data).map(([k, v]) => `<tr><td>${k}</td><td>${v === null ? 'unavailable' : v.toLocaleString()}</td></tr>`).join('')}</table>
</body></html>`);
});

module.exports = router;
