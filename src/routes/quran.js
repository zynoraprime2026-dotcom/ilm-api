const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');
const requireTier = require('../middleware/requireTier');

const { QURAN_TRANSLATIONS, normalizeLanguage } = require('../config/languages');

// Guard numeric path params — a non-numeric :surah/:ayah must 400, never reach the DB as NaN.
const numericParam = (req, res, next, val, name) => {
  if (!/^\d+$/.test(val)) return res.status(400).json({ error: name + " must be a number" });
  next();
};
router.param("surah", (req, res, next, val) => numericParam(req, res, next, val, "Surah"));
router.param("ayah", (req, res, next, val) => numericParam(req, res, next, val, "Ayah"));

// Resolve the effective translation code from ?translation= (explicit) or
// ?language=xx (preferred translation for that language). Returns null for
// language=ar (Arabic only, no translation join).
function resolveQuranTranslation(req) {
  if (req.query.translation) return req.query.translation;
  const lang = normalizeLanguage(req.query.language);
  if (!lang) return 'en.sahih';
  if (lang === 'ar') return null;
  return (QURAN_TRANSLATIONS[lang] || ['en.sahih'])[0];
}

// An unknown ?translation= code used to sail through the join and return a
// surah with zero ayahs under HTTP 200. Validate it against the translations
// table once, then 400 with the fix instead of handing back an empty Quran.
let translationCodeSet = null;
async function knownTranslationCodes() {
  if (translationCodeSet) return translationCodeSet;
  const { rows } = await db.query('SELECT code FROM translations');
  if (rows.length) {
    translationCodeSet = new Set(rows.map(r => r.code));
    const t = setTimeout(() => { translationCodeSet = null; }, 6 * 60 * 60 * 1000);
    if (t.unref) t.unref();
  }
  return translationCodeSet || new Set();
}
router.use(async (req, res, next) => {
  const code = req.query.translation;
  if (!code) return next();
  try {
    const codes = await knownTranslationCodes();
    if (!codes.size || codes.has(String(code))) return next();
    return res.status(400).json({
      error: 'Unknown translation code: ' + code,
      hint: 'Use ?language=fr for that language\'s default translation, or GET /v1/quran/translations for every valid code.',
      translations_url: '/v1/quran/translations',
    });
  } catch (e) {
    next();
  }
});

// GET /v1/quran/translations — list all available translations
// Module index. Calling /v1/quran bare used to answer 404, which reads as "this
// module is not here" when every sub-route works; say what is here instead.
router.get('/', (req, res) => {
  res.json({
    module: 'quran',
    note: 'Start at /surahs for the catalogue, then /:surah/:ayah for a verse. Pass ?language=<code> for a translation.',
    endpoints: [
      '/surahs',
      '/:surah',
      '/:surah/:ayah',
      '/:surah/:ayah/words',
      '/:surah/:ayah/cite',
      '/:surah/:ayah/audio',
      '/translations',
      '/offline',
    ],
  });
});

router.get('/translations', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  const { rows } = await db.query('SELECT code, language, translator_name, is_simplified FROM translations ORDER BY is_simplified DESC, language, translator_name');
  res.json(rows);
});

// GET /v1/quran/offline?translation=en.sahih — the whole Quran (all 114 surahs,
// every ayah with Arabic text + translation) in one response, for PWA offline packs.
// Registered BEFORE /:surah so "offline" is not parsed as a surah number.
router.get('/offline', async (req, res) => {
  const translationCode = resolveQuranTranslation(req);
  const cacheKey = `quran:offline:${translationCode}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const surahsResult = await db.query('SELECT number, name_arabic, name_english, name_transliteration, revelation_place, ayah_count FROM surahs ORDER BY number');
  const ayahsResult = await db.query(
    `SELECT a.surah_number, a.ayah_number, a.text_arabic, at.text AS translation
     FROM ayahs a
     LEFT JOIN translations t ON t.code = $1
     LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
     ORDER BY a.surah_number, a.ayah_number`,
    [translationCode]
  );

  // group ayahs by surah, compacted to [n, arabic, translation] triplets
  const bySurah = new Map();
  for (const row of ayahsResult.rows) {
    if (!bySurah.has(row.surah_number)) bySurah.set(row.surah_number, []);
    bySurah.get(row.surah_number).push([row.ayah_number, row.text_arabic, row.translation || '']);
  }

  const surahs = surahsResult.rows.map(s => ({
    number: s.number,
    name_arabic: s.name_arabic,
    name_english: s.name_english,
    name_transliteration: s.name_transliteration,
    revelation_place: s.revelation_place,
    ayah_count: s.ayah_count,
    ayahs: bySurah.get(s.number) || []
  }));

  const payload = {
    generated: new Date().toISOString(),
    translation_code: translationCode,
    surah_count: surahs.length,
    ayah_count: ayahsResult.rows.length,
    surahs
  };
  await setCached(cacheKey, payload);
  res.set('Cache-Control', 'private, max-age=86400');
  res.json(payload);
});

// GET /v1/quran/surahs — list all 114 surahs
router.get('/surahs', async (req, res) => {
  const cacheKey = 'quran:surahs:all';
  const cached = await getCached(cacheKey);
  res.set('Cache-Control', 'private, max-age=86400'); // this list never changes (private: edge cache must not bypass the API key gate)
  if (cached) return res.json(cached);

  const { rows } = await db.query('SELECT * FROM surahs ORDER BY number');
  await setCached(cacheKey, rows);
  res.json(rows);
});

// GET /v1/quran/export?translation=en.sahih — full Quran text + translation,
// for researchers who need the whole dataset rather than one ayah at a time.
// Gated to academic/pro tiers since this is a much heavier query.
// NOTE: this must be registered BEFORE the /:surah route below, or Express
// will try to parse "export" as a surah number and 400 before this ever runs.
router.get('/export', requireTier('academic', 'pro'), async (req, res) => {
  const translationCode = req.query.translation || 'en.sahih';

  const { rows } = await db.query(
    `SELECT a.surah_number, a.ayah_number, a.text_arabic, at.text AS translation
     FROM ayahs a
     LEFT JOIN ayah_translations at ON at.ayah_id = a.id
     LEFT JOIN translations t ON t.id = at.translation_id AND t.code = $1
     ORDER BY a.surah_number, a.ayah_number`,
    [translationCode]
  );

  res.json({ translation_code: translationCode, count: rows.length, ayahs: rows });
});

// GET /v1/quran/:surah?translation=en.sahih — full surah with translation
router.get('/:surah', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const translationCode = resolveQuranTranslation(req);
  // Optional pagination for long surahs: /:surah?page=2&limit=20 browses ayahs
  const page = req.query.page ? Math.max(parseInt(req.query.page, 10), 1) : null;
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 20, 100) : null;

  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    return res.status(400).json({ error: 'Surah number must be between 1 and 114' });
  }

  const cacheKey = `quran:surah:${surahNum}:${translationCode}:${page || 'all'}:${limit || 'all'}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const surahResult = await db.query('SELECT * FROM surahs WHERE number = $1', [surahNum]);
  if (surahResult.rows.length === 0) {
    return res.status(404).json({ error: 'Surah not found' });
  }

  const surah = surahResult.rows[0];
  let ayahs, pagination = null;

  if (page && limit) {
    const offset = (page - 1) * limit;
    const total = surah.ayah_count;
    const lastPage = Math.max(Math.ceil(total / limit), 1);
    let ayahsResult;
    if (translationCode) {
      ayahsResult = await db.query(
        `SELECT a.ayah_number, a.text_arabic, at.text AS translation
         FROM ayahs a
         JOIN translations t ON t.code = $2
         LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
         WHERE a.surah_number = $1
         ORDER BY a.ayah_number
         LIMIT $3 OFFSET $4`,
        [surahNum, translationCode, limit, offset]
      );
    } else {
      ayahsResult = await db.query(
        `SELECT a.ayah_number, a.text_arabic
         FROM ayahs a
         WHERE a.surah_number = $1
         ORDER BY a.ayah_number
         LIMIT $2 OFFSET $3`,
        [surahNum, limit, offset]
      );
    }
    ayahs = ayahsResult.rows;
    pagination = {
      page, limit, total, total_pages: lastPage,
      has_next: page < lastPage, has_prev: page > 1,
      next_page: page < lastPage ? page + 1 : null,
      prev_page: page > 1 ? page - 1 : null,
    };
  } else {
    let ayahsResult;
    if (translationCode) {
      ayahsResult = await db.query(
        `SELECT a.ayah_number, a.text_arabic, at.text AS translation
         FROM ayahs a
         JOIN translations t ON t.code = $2
         LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
         WHERE a.surah_number = $1
         ORDER BY a.ayah_number`,
        [surahNum, translationCode]
      );
    } else {
      ayahsResult = await db.query(
        `SELECT a.ayah_number, a.text_arabic
         FROM ayahs a
         WHERE a.surah_number = $1
         ORDER BY a.ayah_number`,
        [surahNum]
      );
    }
    ayahs = ayahsResult.rows;
  }

  const payload = {
    surah,
    translation_code: translationCode,
    language: normalizeLanguage(req.query.language) || 'en',
    pagination,
    ayahs,
  };

  await setCached(cacheKey, payload);
  res.json(payload);
});

// GET /v1/quran/:surah/:ayah — single ayah
router.get('/:surah/:ayah', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const ayahNum = parseInt(req.params.ayah, 10);
  const translationCode = resolveQuranTranslation(req);

  const cacheKey = `quran:ayah:${surahNum}:${ayahNum}:${translationCode}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  let rows;
  if (translationCode) {
    const r = await db.query(
      `SELECT a.surah_number, a.ayah_number, a.text_arabic, a.source_edition, at.text AS translation
       FROM ayahs a
       JOIN translations t ON t.code = $3
       LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
       WHERE a.surah_number = $1 AND a.ayah_number = $2`,
      [surahNum, ayahNum, translationCode]
    );
    rows = r.rows;
  } else {
    // language=ar — Arabic text only
    const r = await db.query(
      `SELECT a.surah_number, a.ayah_number, a.text_arabic, a.source_edition
       FROM ayahs a
       WHERE a.surah_number = $1 AND a.ayah_number = $2`,
      [surahNum, ayahNum]
    );
    rows = r.rows;
  }

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Ayah not found' });
  }

  rows[0].language = normalizeLanguage(req.query.language) || 'en';
  if (translationCode) rows[0].translation_code = translationCode;

  await setCached(cacheKey, rows[0]);
  res.json(rows[0]);
});

// GET /v1/quran/:surah/:ayah/words — word-by-word breakdown (Arabic + root + grammar)
router.get('/:surah/:ayah/words', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const ayahNum = parseInt(req.params.ayah, 10);

  const cacheKey = `quran:words:v2:${surahNum}:${ayahNum}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    `SELECT aw.word_position, aw.text_arabic, aw.transliteration, aw.translation,
            aw.part_of_speech, aw.audio_url, r.root_arabic, r.root_transliteration
     FROM ayah_words aw
     JOIN ayahs a ON a.id = aw.ayah_id
     LEFT JOIN quranic_roots r ON r.id = aw.root_id
     WHERE a.surah_number = $1 AND a.ayah_number = $2
     ORDER BY aw.word_position`,
    [surahNum, ayahNum]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No word-level data found for this ayah' });
  }

  const payload = { surah: surahNum, ayah: ayahNum, words: rows };
  await setCached(cacheKey, payload);
  res.json(payload);
});

// GET /v1/quran/:surah/:ayah/cite?format=bibtex|apa — citation for academic use
router.get('/:surah/:ayah/cite', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const ayahNum = parseInt(req.params.ayah, 10);
  const format = (req.query.format || 'apa').toLowerCase();

  const surahResult = await db.query('SELECT * FROM surahs WHERE number = $1', [surahNum]);
  if (surahResult.rows.length === 0) return res.status(404).json({ error: 'Surah not found' });
  const surah = surahResult.rows[0];

  if (format === 'bibtex') {
    const key = `Quran${surahNum}_${ayahNum}`;
    const bibtex = `@misc{${key},\n  title = {The Quran, ${surah.name_transliteration} ${surahNum}:${ayahNum}},\n  note = {Ayah ${ayahNum} of Surah ${surah.name_english}},\n  howpublished = {Ilm API}\n}`;
    return res.type('text/plain').send(bibtex);
  }

  // default: APA-style in-text citation
  res.json({ citation: `Quran ${surahNum}:${ayahNum} (${surah.name_transliteration})` });
});

// GET /v1/quran/:surah/:ayah/audio?reciter=alafasy — recitation audio URL
// Reciters are addressed by slug, but callers arrive with "ar.alafasy", a display
// name, or a capitalised variant, and a 404 there reads as "this recitation does
// not exist". Resolve loosely instead of refusing.
async function resolveReciter(input) {
  const raw = String(input || 'alafasy').trim();
  const tries = [raw, raw.split('.').pop()];
  for (const t of tries) {
    const r = await db.query('SELECT * FROM reciters WHERE slug = $1', [String(t).toLowerCase()]);
    if (r.rows.length) return r.rows[0];
  }
  const all = await db.query('SELECT * FROM reciters');
  const n = (x) => String(x).toLowerCase().replace(/[^a-z]/g, '');
  const want = n(raw);
  return (
    all.rows.find((r) => n(r.slug) === want) ||
    all.rows.find((r) => n(r.name).includes(want)) ||
    all.rows.find((r) => want.includes(n(r.slug))) ||
    null
  );
}

// Recitation audio. Without a flag this answers with the source URL, which is what
// existing clients expect. With ?stream=1 it proxies the bytes, and with
// ?download=1 it proves them as an attachment named after the ayah: browsers
// ignore a download attribute on a cross-origin clip, so a client that never
// leaves this API is the only way saving actually works.
router.get('/:surah/:ayah/audio', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const ayahNum = parseInt(req.params.ayah, 10);
  const reciter = await resolveReciter(req.query.reciter);
  if (!reciter) {
    return res.status(404).json({
      error: `Reciter "${req.query.reciter || 'alafasy'}" not found. See /v1/reciters for available options.`,
    });
  }

  // everyayah.com filename pattern: SSSAAA.mp3 (surah/ayah zero-padded to 3 digits)
  const fileName = `${String(surahNum).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;
  const audioUrl = `${reciter.audio_base_url}${fileName}`;
  const wantsBytes = req.query.stream === '1' || req.query.download === '1';

  if (!wantsBytes) {
    return res.json({ surah: surahNum, ayah: ayahNum, reciter: reciter.name, audio_url: audioUrl });
  }

  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const headers = {};
      if (req.headers.range) headers.Range = req.headers.range;
      const up = await fetch(audioUrl, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (!up.ok && up.status !== 206) {
        lastErr = new Error('upstream ' + up.status);
        if (attempt === 0) continue;
        return res.status(502).json({ error: 'Recitation host unavailable', upstream_status: up.status });
      }
      res.status(up.status === 206 ? 206 : 200);
      res.set('Content-Type', up.headers.get('content-type') || 'audio/mpeg');
      for (const h of ['content-length', 'content-range']) {
        const v = up.headers.get(h);
        if (v) res.set(h, v);
      }
      res.set('Accept-Ranges', 'bytes');
      const disp = req.query.download === '1' ? 'attachment' : 'inline';
      res.set('Content-Disposition', `${disp}; filename="${surahNum}-${ayahNum}-${reciter.slug}.mp3"`);
      res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
      if (!up.body) return res.end();
      const { Readable } = require('stream');
      Readable.fromWeb(up.body).on('error', () => res.end()).pipe(res);
      return;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
    }
  }
  res.status(502).json({ error: 'Recitation fetch failed', detail: String(lastErr && lastErr.message || '') });
});

module.exports = router;
