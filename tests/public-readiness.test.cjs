// The two things a stranger could do to a public API before this test existed:
// read another developer's usage report out of the shared edge cache, and take
// over their key by posting their email address. Run with:
// npm run test:public
const assert = require('assert');
const http = require('http');
const path = require('path');
const express = require('express');

// stub the database before anything requires it
const rows = [{ key: 'ilm_' + 'a'.repeat(48), owner_email: 'dev@example.com', tier: 'free', requests_made: 7 }];
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: async (sql, params = []) => {
      const text = String(sql);
      if (/^SELECT \* FROM api_keys WHERE key = \$1/.test(text) || /SELECT key, tier FROM api_keys WHERE owner_email = \$1/.test(text)) {
        const hit = rows.filter((r) => (text.includes('owner_email') ? r.owner_email === params[0] : r.key === params[0]));
        return { rows: hit };
      }
      if (/^UPDATE api_keys SET key = \$1 WHERE key = \$2/.test(text)) {
        const hit = rows.find((r) => r.key === params[1]);
        if (!hit) return { rows: [] };
        hit.key = params[0];
        return { rows: [hit] };
      }
      if (/^DELETE FROM api_keys WHERE key = \$1/.test(text)) {
        const i = rows.findIndex((r) => r.key === params[0]);
        if (i < 0) return { rows: [] };
        const [gone] = rows.splice(i, 1);
        return { rows: [{ owner_email: gone.owner_email }] };
      }
      if (/^INSERT INTO api_keys \(key, owner_email, tier\)/.test(text)) {
        const row = { key: params[0], owner_email: params[1], tier: 'free', requests_made: 0, created_at: '2026-11-09T00:00:00.000Z' };
        rows.push(row);
        return { rows: [row] };
      }
      if (/^UPDATE api_keys SET requests_made/.test(text)) return { rows: [] };
      return { rows: [] };
    },
  },
};

// a mailer stub: records what would be sent, and can be switched off
const sent = [];
let mailOn = true;
const mailerPath = require.resolve('../src/lib/mailer');
require.cache[mailerPath] = {
  id: mailerPath, filename: mailerPath, loaded: true,
  exports: {
    available: () => mailOn,
    send: async (m) => { if (!mailOn) return { sent: false, reason: 'not-configured' }; sent.push(m); return { sent: true }; },
    keyEmail: ({ key, tier }) => ({ subject: 'Your Ilm API key', text: 'key: ' + key, tier }),
    sender: () => ({ name: 'Ilm API', email: 'no-reply@ilm-api.vercel.app' }),
  },
};

const immutableCache = require('../src/middleware/immutableCache');
const developers = require('../src/routes/developers');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}
function post(port, p, headers = {}, body = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      { host: '127.0.0.1', port, path: p, method: 'POST', timeout: 5000,
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), ...headers } },
      (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ status: res.statusCode, body: b ? JSON.parse(b) : null })); }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end(payload);
  });
}

(async () => {
  const checks = [];
  const ok = (name, cond, detail) => { checks.push([name, cond, detail]); };

  // 1. edge cache: usage is per-key, everything else stays cacheable
  const app = express();
  app.use(express.json());
  app.use('/v1', immutableCache);
  app.get('/v1/usage', (req, res) => res.json({ tier: 'free' }));
  app.get('/v1/quran/:s', (req, res) => res.json({ ok: true }));
  app.use('/v1/developers', developers);
  const { server, port } = await listen(app);
  const get = (p) => new Promise((res, rej) => http.get({ host: '127.0.0.1', port, path: p }, (r) => { r.resume(); r.on('end', () => res({ status: r.statusCode, cc: r.headers['cache-control'] })); }).on('error', rej));

  const usage = await get('/v1/usage');
  ok('usage is never edge-cached', /no-store/.test(usage.cc || ''), usage.cc);
  const quran = await get('/v1/quran/1');
  ok('content stays CDN-cacheable', /s-maxage=86400/.test(quran.cc || ''), quran.cc);

  // 2. signup must not hand a stranger an existing key
  const dup = await post(port, '/v1/developers/signup', {}, { email: 'dev@example.com' });
  ok('existing-key signup returns no key', dup.body && dup.body.key === null, JSON.stringify(dup.body));
  ok('existing-key signup still hints which key', /ilm_[0-9a-f]{4}…/.test((dup.body && dup.body.key_hint) || ''), dup.body && dup.body.key_hint);

  // 3. rotation needs the key, and kills the old one
  const bad = await post(port, '/v1/developers/keys/rotate');
  ok('rotation refuses a keyless caller', bad.status === 401, bad.status);
  const current = rows[0].key;
  const rot = await post(port, '/v1/developers/keys/rotate', { 'x-api-key': current });
  ok('rotation returns a new key', rot.status === 200 && /^ilm_[0-9a-f]{48}$/.test(rot.body.key), rot.status);
  ok('old key no longer resolves', rows[0].key === rot.body.key && rows[0].key !== current, 'row updated');
  const stale = await post(port, '/v1/developers/keys/rotate', { 'x-api-key': current });
  ok('rotated-away key is refused', stale.status === 403, stale.status);

  // 4. revoke deletes it
  const rev = await post(port, '/v1/developers/keys/revoke', { 'x-api-key': rot.body.key });
  ok('revoke deletes the key', rev.status === 200 && rows.length === 0, rev.status);

  // 5. signup delivers the key by email, and withholds it from the caller
  const fresh = await post(port, '/v1/developers/signup', {}, { email: 'new@example.com' });
  ok('mailer on: signup returns no key', fresh.status === 201 && fresh.body.key === null && fresh.body.emailed === true, JSON.stringify(fresh.body));
  const mailed = sent.find((m) => m.to === 'new@example.com');
  ok('mailer on: the key is sent instead', Boolean(mailed) && /^key: ilm_[0-9a-f]{48}$/.test(mailed.text), mailed && mailed.text);

  mailOn = false;
  const noMail = await post(port, '/v1/developers/signup', {}, { email: 'nomail@example.com' });
  ok('no mailer: key still returned so the API works', noMail.status === 201 && /^ilm_[0-9a-f]{48}$/.test(noMail.body.key || ''), JSON.stringify(noMail.body));
  const recoverOff = await post(port, '/v1/developers/keys/recover', {}, { email: 'owner@example.com' });
  ok('no mailer: recovery says so instead of pretending', recoverOff.status === 503, recoverOff.status);
  mailOn = true;

  // 6. recovery answers identically for known and unknown addresses.
  // A durable account, because the earlier checks revoked the other one.
  rows.push({ key: 'ilm_' + 'c'.repeat(48), owner_email: 'owner@example.com', tier: 'free', requests_made: 3 });
  const before = sent.length;
  const unknown = await post(port, '/v1/developers/keys/recover', {}, { email: 'ghost@example.com' });
  const known = await post(port, '/v1/developers/keys/recover', {}, { email: 'owner@example.com' });
  ok('recovery replies the same either way', unknown.status === 200 && known.status === 200 && unknown.body.message === known.body.message, JSON.stringify([unknown.body, known.body]));
  ok('recovery only mails the address on file', sent.length - before === 1 && sent[sent.length - 1].to === 'owner@example.com', sent.length - before);
  const keyNow = rows.find((r) => r.owner_email === 'owner@example.com').key;
  ok('recovery mails the real key', sent[sent.length - 1].text.includes(keyNow), 'key mismatch');
  const again = await post(port, '/v1/developers/keys/recover', {}, { email: 'owner@example.com' });
  ok('a second recovery inside the cooldown sends nothing', again.status === 200 && sent.length === before + 1, sent.length - before);
  const badEmail = await post(port, '/v1/developers/keys/recover', {}, { email: 'not-an-email' });
  ok('recovery validates the address', badEmail.status === 400, badEmail.status);

  server.close();
  let failed = 0;
  for (const [name, cond, detail] of checks) {
    console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  -> ' + detail));
    if (!cond) failed++;
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
