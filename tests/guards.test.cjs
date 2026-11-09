// Failure-mode tests for src/lib/guards.js — the three things that used to make
// this API hang instead of answering. Run with: npm run test:guards
const assert = require('assert');
const http = require('http');
const express = require('express');
const { wrapAsyncHandlers, responseTimeout, errorHandler, classify } = require('../src/lib/guards');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}
function get(port, path) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const req = http.get({ host: '127.0.0.1', port, path, timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body, ms: Date.now() - started }));
    });
    req.on('timeout', () => { req.destroy(new Error('client timeout')); });
    req.on('error', reject);
  });
}

function buildApp() {
  const app = express();
  app.use(responseTimeout(400));
  app.get('/rejects', async () => {
    const e = new Error('relation "surahs" does not exist');
    e.code = '42P01';
    throw e;
  });
  app.get('/hangs', () => new Promise(() => {})); // never resolves
  app.get('/ok', async (req, res) => res.json({ ok: true }));
  wrapAsyncHandlers(app);
  app.use(errorHandler);
  return app;
}

(async () => {
  const { server, port } = await listen(buildApp());
  try {
    const ok = await get(port, '/ok');
    assert.strictEqual(ok.status, 200, 'healthy route still answers');
    assert.strictEqual(ok.body, '{"ok":true}');

    const rejected = await get(port, '/rejects');
    assert.strictEqual(rejected.status, 503, 'missing table is a 503, not a hang');
    assert.strictEqual(JSON.parse(rejected.body).db_error, 'missing_table');
    assert.ok(rejected.ms < 1000, 'rejection answered immediately, took ' + rejected.ms + 'ms');

    const hang = await get(port, '/hangs');
    assert.strictEqual(hang.status, 504, 'a promise that never settles becomes a 504');
    assert.ok(hang.ms < 2000, 'timeout fired at the configured 400ms, took ' + hang.ms + 'ms');
    assert.ok(/timed out/i.test(JSON.parse(hang.body).error));

    assert.deepStrictEqual(classify(Object.assign(new Error('boom'), {})).status, 500);
    assert.strictEqual(classify(Object.assign(new Error('password authentication failed'), {})).db_error, 'auth_failed');
    assert.strictEqual(classify(Object.assign(new Error('canceling statement due to statement timeout'), {})).db_error, 'statement_timeout');
    console.log('guards: 7 checks passed (no hang, no silence, classified errors)');
  } finally {
    server.close();
  }
})().catch((e) => {
  console.error('guards test FAILED:', e.message);
  process.exit(1);
});
