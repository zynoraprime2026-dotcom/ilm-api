// Live contract tests. They talk to the deployed API, because the thing most
// likely to break is the API moving under the client, not the client's own logic.
//
//   npm test              keyless tier only (no secrets needed)
//   ILM_API_KEY=ilm_... npm test    keyless + full surface
import test from 'node:test';
import assert from 'node:assert/strict';
import IlmApi from '../index.js';

const KEY = process.env.ILM_API_KEY;
const web = IlmApi.public();
const keyed = KEY ? new IlmApi({ apiKey: KEY }) : null;

test('public tier needs no key', async () => {
  assert.equal(web.tier, 'web');
  const surahs = await web.quran.surahs();
  assert.equal(surahs.length, 114);
  assert.equal(surahs[1].number, 2);
  assert.equal(surahs[1].name_transliteration, 'Al-Baqara');
});

test('web tier paths carry the /web prefix', () => {
  assert.equal(web.path('/quran/2'), '/web/v1/quran/2');
  assert.equal(keyed ? keyed.path('/quran/2') : '/v1/quran/2', '/v1/quran/2');
  assert.match(web.url('/quran/2', { limit: 5 }), /\/web\/v1\/quran\/2\?limit=5$/);
});

test('surah and ayah read correctly', async () => {
  const s = await web.quran.surah(1);
  assert.equal(s.ayahs.length, 7);
  const a = await web.quran.ayah(2, 255);
  assert.equal(a.ayah_number, 255);
  assert.ok(a.text_arabic.length > 100);
});

test('word-by-word carries position and translation', async () => {
  const w = await web.quran.words(1, 1);
  assert.ok(w.words.length >= 4);
  assert.equal(typeof w.words[0].word_position, 'number');
});

test('citation strings are stable', async () => {
  assert.equal((await web.quran.cite(2, 255)).citation, 'Quran 2:255 (Al-Baqara)');
  assert.equal((await web.hadith.cite('bukhari', 1)).citation, 'Sahih al-Bukhari, Hadith 1');
});

test('hadith collection and record read correctly', async () => {
  const cols = await web.hadith.collections();
  assert.ok(cols.length >= 16);
  const h = await web.hadith.get('bukhari', 1);
  assert.equal(h.hadith_number, '1');
  assert.ok(h.text_english);
  const isnad = await web.hadith.isnad('bukhari', 1);
  assert.ok(Array.isArray(isnad.chain));
});

test('hadith audio clip is playable on the same tier it was announced on', async () => {
  const a = await web.hadith.audio('bukhari', 1);
  assert.equal(a.recorded, true);
  assert.ok(a.clip.startsWith('/web/'), `clip was ${a.clip}`);
  const res = await web.media(`/hadith-audio/bukhari/1.mp3`);
  assert.equal(res.headers.get('content-type'), 'audio/mpeg');
  assert.ok(Number(res.headers.get('content-length') || 0) > 1000);
});

test('tafsir sources and entry', async () => {
  const sources = await web.tafsir.sources();
  assert.ok(sources.includes('Ibn Kathir'));
  const t = await web.tafsir.get(2, 255);
  assert.ok(t.tafsir.length >= 1);
});

test('duas: 137 categories, a random one, and a category read', async () => {
  const cats = await web.duas.categories();
  assert.equal(cats.length, 137);
  const r = await web.duas.random();
  assert.ok(r.title);
  // A category answers with the duas themselves, not an envelope.
  const one = await web.duas.category(cats[0].slug, { limit: 2 });
  assert.ok(Array.isArray(one) && one.length >= 1);
  assert.ok(one[0].text_arabic);
});

test('mutoon catalogue: 29 matns and 13 paths', async () => {
  const cat = await web.mutoon.list();
  assert.equal(cat.count, 29);
  const paths = await web.mutoon.paths();
  assert.equal(paths.count, 13);
  const one = await web.mutoon.get('al-ajurrumiyyah');
  assert.equal(one.slug, 'al-ajurrumiyyah');
  assert.equal(one.audio_available, true);
});

test('mutoon audio streams with ranges, and says so when there is no text', async () => {
  const res = await web.media('/mutoon/al-ajurrumiyyah/stream', null, { range: 'bytes=0-1023' });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('content-type'), 'audio/mpeg');
  assert.match(res.headers.get('content-range'), /^bytes 0-1023\//);

  await assert.rejects(
    () => web.mutoon.lines('al-ajurrumiyyah'),
    (e) => e.status === 409 && /not ingested/i.test(e.message)
  );
});

test('mutoon PDF downloads as a real PDF', async () => {
  const res = await web.media('/mutoon/al-jazariyyah/pdf');
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  const head = new Uint8Array(await res.arrayBuffer()).slice(0, 5);
  assert.equal(Buffer.from(head).toString('latin1'), '%PDF-');
});

test('quran audio: metadata is JSON, stream is audio with ranges', async () => {
  const meta = await web.quran.audio(2, 255, { reciter: 'ar.alafasy' });
  assert.equal(meta.surah, 2);
  const res = await web.media('/quran/2/255/audio', { reciter: 'ar.alafasy', stream: 1 }, { range: 'bytes=0-1023' });
  assert.equal(res.headers.get('content-type'), 'audio/mpeg');
  assert.match(res.headers.get('content-range'), /^bytes 0-1023\//);
});

test('dictionary: search, root and word', async () => {
  const s = await web.dictionary.search('كتب');
  assert.ok(s.count >= 1);
  const w = await web.dictionary.word('كتب');
  assert.ok(w.word);
});

test('roots list and occurrences', async () => {
  const all = await web.roots.list();
  assert.ok(Array.isArray(all) && all.length > 100);
  const page = await web.roots.list({ limit: 5 });
  assert.equal(page.roots.length, 5);
  const occ = await web.roots.occurrences(page.roots[0].root_arabic, { limit: 2 });
  assert.ok(occ.root);
});

test('keyless clients get a clear refusal, not a 404, for key-only routes', async () => {
  await assert.rejects(() => web.status(), (e) => e.code === 'KEY_REQUIRED' && e.status === 401);
  await assert.rejects(() => web.fiqh.books(), (e) => e.code === 'KEY_REQUIRED');
  await assert.rejects(() => web.search('patience'), (e) => e.code === 'KEY_REQUIRED');
});

test('errors carry status, hint and body', async () => {
  await assert.rejects(
    () => web.quran.surah(2, { translation: 'zz' }),
    (e) => e.name === 'IlmApiError' && e.status === 400 && Boolean(e.body)
  );
});

if (keyed) {
  test('keyed: service status and usage', async () => {
    const st = await keyed.status();
    assert.equal(st.status, 'ok');
    assert.equal(st.db, 'up');
    const u = await keyed.usage();
    assert.ok(u.tier);
    assert.ok(keyed.lastRateLimit, 'rate limit headers should be recorded');
  });

  test('keyed: fiqh registry', async () => {
    const books = await keyed.fiqh.books({ madhab: 'hanafi' });
    assert.ok(books.count >= 1);
    const scholars = await keyed.fiqh.scholars();
    assert.ok(scholars.count >= 1);
    // fiqh search insists on a scope: a topic, a madhab or a chapter.
    const search = await keyed.fiqh.search('wudu', { madhab: 'hanafi', limit: 2 });
    assert.ok(search.count >= 1);
  });

  test('keyed: cross-corpus search resolves a citation', async () => {
    const r = await keyed.search('2:255');
    assert.ok(r.sections.reference.count >= 1);
  });

  test('keyed: reciters, narrators, topics, stories', async () => {
    const reciters = await keyed.reciters.list();
    assert.equal(reciters.length, 13);
    const narrators = await keyed.narrators.search('Hurairah');
    assert.ok(narrators.count >= 1);
    const allNarr = await keyed.narrators.list({ limit: 2 });
    assert.ok(allNarr.count > 1000);
    const topics = await keyed.topics.list();
    assert.ok(topics.length >= 3);
    const daily = await keyed.stories.daily();
    assert.ok(daily.story);
  });

  test('keyed: prayer times for Accra', async () => {
    const p = await keyed.prayerTimes({ city: 'Accra' });
    assert.equal(p.city, 'Accra');
    assert.ok(p.times && p.times.fajr && p.times.isha);
  });

  test('keyed: alarm vapid key is served', async () => {
    const v = await keyed.alarm.vapid();
    assert.ok(v.publicKey.length > 20);
  });
} else {
  test('keyed surface skipped (no ILM_API_KEY)', { skip: true }, () => {});
}
