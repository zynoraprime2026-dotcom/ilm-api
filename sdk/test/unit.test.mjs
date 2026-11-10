// Offline tests: no network. They pin the client's own behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import IlmApi, { IlmApiError, WEB_TIER_ROUTES } from '../index.js';

const ok = (body, headers = {}) => ({
  ok: true,
  status: 200,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  text: async () => JSON.stringify(body),
});

test('default tier follows the apiKey', () => {
  assert.equal(new IlmApi({ apiKey: 'k' }).tier, 'v1');
  assert.equal(new IlmApi().tier, 'web');
  assert.equal(IlmApi.public().tier, 'web');
});

test('baseUrl trailing slashes are normalised', () => {
  assert.equal(new IlmApi({ baseUrl: 'https://x.dev///', apiKey: 'k' }).baseUrl, 'https://x.dev');
});

test('query params drop undefined and null but keep zero', () => {
  const c = new IlmApi({ apiKey: 'k', baseUrl: 'https://x.dev' });
  const u = c.url('/quran/2', { translation: undefined, language: null, page: 0 });
  assert.equal(u, 'https://x.dev/v1/quran/2?page=0');
});

test('the key travels in x-api-key, never in the URL', async () => {
  let seen;
  const c = new IlmApi({
    apiKey: 'secret-key',
    baseUrl: 'https://x.dev',
    fetch: async (url, init) => {
      seen = { url, headers: init.headers };
      return ok([1]);
    },
  });
  await c.quran.surahs();
  assert.equal(seen.headers['x-api-key'], 'secret-key');
  assert.ok(!seen.url.includes('secret-key'));
});

test('keyless refusal happens before any request is made', async () => {
  let called = false;
  const c = new IlmApi({ fetch: async () => { called = true; return ok({}); } });
  await assert.rejects(() => c.usage(), (e) => e.code === 'KEY_REQUIRED');
  assert.equal(called, false);
  assert.deepEqual(WEB_TIER_ROUTES.includes('quran'), true);
});

test('timeouts abort and surface as TIMEOUT', async () => {
  const c = new IlmApi({
    apiKey: 'k',
    timeout: 10,
    retries: 0,
    fetch: (url, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      }),
  });
  await assert.rejects(() => c.status(), (e) => e.code === 'TIMEOUT');
});

test('5xx and 429 retry, then succeed', async () => {
  let n = 0;
  const c = new IlmApi({
    apiKey: 'k',
    retries: 2,
    fetch: async () => {
      n++;
      if (n === 1) return { ok: false, status: 503, headers: { get: () => null }, text: async () => '{"error":"busy"}' };
      if (n === 2) return { ok: false, status: 429, headers: { get: (k) => (k === 'retry-after' ? '0' : null) }, text: async () => '{}' };
      return ok({ status: 'ok' });
    },
  });
  const r = await c.status();
  assert.equal(r.status, 'ok');
  assert.equal(n, 3);
});

test('4xx does not retry', async () => {
  let n = 0;
  const c = new IlmApi({
    apiKey: 'k',
    retries: 3,
    fetch: async () => {
      n++;
      return { ok: false, status: 400, headers: { get: () => null }, text: async () => '{"error":"bad param","hint":"use ?language="}' };
    },
  });
  await assert.rejects(() => c.quran.surah(2), (e) => e.status === 400 && e.hint === 'use ?language=');
  assert.equal(n, 1);
});

test('a write is never retried', async () => {
  let n = 0;
  const c = new IlmApi({
    apiKey: 'k',
    retries: 3,
    fetch: async () => {
      n++;
      return { ok: false, status: 503, headers: { get: () => null }, text: async () => '{"error":"busy"}' };
    },
  });
  await assert.rejects(() => c.alarm.subscribe({ endpoint: 'e', p256dh: 'p', auth: 'a' }));
  assert.equal(n, 1);
});

test('rate limit headers are captured', async () => {
  const c = new IlmApi({
    apiKey: 'k',
    fetch: async () =>
      ok({}, { 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '59', 'x-ratelimit-reset': '30', 'x-ratelimit-daily-limit': '1000', 'x-ratelimit-daily-remaining': '900' }),
  });
  await c.status();
  assert.deepEqual(c.lastRateLimit, { limit: 60, remaining: 59, reset: 30, dailyLimit: 1000, dailyRemaining: 900 });
});

test('non-JSON error bodies do not crash the parser', async () => {
  const c = new IlmApi({
    apiKey: 'k',
    retries: 0,
    fetch: async () => ({ ok: false, status: 502, headers: { get: () => null }, text: async () => '<html>bad gateway</html>' }),
  });
  await assert.rejects(() => c.status(), (e) => e instanceof IlmApiError && e.status === 502 && /bad gateway/.test(e.body));
});

test('media follows redirects and keeps ranges', async () => {
  let init;
  const c = new IlmApi({
    apiKey: 'k',
    fetch: async (url, i) => {
      init = i;
      return { ok: true, status: 206, headers: { get: () => null }, body: null };
    },
  });
  await c.media('/mutoon/al-ajurrumiyyah/stream', null, { range: 'bytes=0-99' });
  assert.equal(init.redirect, 'follow');
  assert.equal(init.headers.range, 'bytes=0-99');
});

test('media URL builders encode and pick the right query', () => {
  const w = IlmApi.public('https://x.dev');
  assert.equal(w.quran.audioUrl(2, 255, { reciter: 'ar.alafasy' }), 'https://x.dev/web/v1/quran/2/255/audio?reciter=ar.alafasy&stream=1');
  assert.match(w.quran.audioUrl(2, 255, { reciter: 'ar.alafasy', download: true }), /download=1$/);
  assert.equal(w.mutoon.pdfUrl('al-jazariyyah'), 'https://x.dev/web/v1/mutoon/al-jazariyyah/pdf');
  assert.equal(w.mutoon.streamUrl('al-ajurrumiyyah', { download: true }), 'https://x.dev/web/v1/mutoon/al-ajurrumiyyah/stream?download=1');
  assert.equal(w.hadith.audioUrl('bukhari', 1), 'https://x.dev/web/v1/hadith-audio/bukhari/1.mp3');
  assert.match(w.dictionary.audioUrl('كتاب'), /word=%D9%83/);
});
