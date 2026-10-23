const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');
const { stripArabicDiacritics } = require('../config/languages');

// GET /v1/dictionary/search?q=حلال&limit=20
// Look up vocabulary by Arabic word (diacritics-insensitive) or by English
// meaning. ?language= is accepted globally; glosses are English today and the
// response says which language it served.
router.get('/search', async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" is required' });

  const isArabic = /[\u0600-\u06FF]/.test(q);
  const capped = Math.min(parseInt(limit, 10) || 20, 100);
  const params = [];
  let sql;

  if (isArabic) {
    params.push(stripArabicDiacritics(q).replace(/-/g, ''));
    sql = `SELECT word, root, pos, gloss_en, source
           FROM dictionary_words
           WHERE word_plain = $1`;
    // Also allow prefix matches (e.g. حلب finds حليب? no — but حلا matches حلاب...)
    params.push(stripArabicDiacritics(q).replace(/-/g, '') + '%');
    sql += ` OR word_plain LIKE $2`;
  } else {
    params.push(q);
    sql = `SELECT word, root, pos, gloss_en, source
           FROM dictionary_words
           WHERE to_tsvector('english', gloss_en) @@ plainto_tsquery('english', $1)`;
  }
  params.push(capped);
  sql += ` LIMIT $${params.length}`;

  const { rows } = await db.query(sql, params);
  res.json({
    query: q,
    language: 'en',
    note: isArabic ? undefined : 'English gloss search; pass an Arabic word to look up its dictionary entry',
    count: rows.length,
    results: rows,
  });
});

// GET /v1/dictionary/roots — every root with dictionary coverage, joined with
// Quran occurrence counts where the root also appears in quranic_roots.
router.get('/roots', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  const { rows } = await db.query(
    `SELECT d.root, count(*) AS entry_count,
            max(r.occurrence_count) AS quran_occurrences
     FROM dictionary_words d
     LEFT JOIN quranic_roots r ON REPLACE(r.root_arabic, 'ـ', '') = REPLACE(REPLACE(d.root, '-', ''), 'ـ', '')
     WHERE d.root IS NOT NULL
     GROUP BY d.root
     ORDER BY entry_count DESC, d.root`
  );
  res.json({ count: rows.length, roots: rows });
});

// GET /v1/dictionary/root/:root — everything the dictionary knows about a root:
// glossed words derived from it, plus its Quranic occurrence count.
router.get('/root/:root', async (req, res) => {
  const raw = decodeURIComponent(req.params.root);
  // Accept both "ح-ل-ل" and "حلل" and fully-diacritized forms.
  const rootKey = stripArabicDiacritics(raw).replace(/[-\s]/g, '').split('').join('-');

  const cacheKey = `dict:root:${rootKey}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    `SELECT word, pos, gloss_en, source
     FROM dictionary_words
     WHERE root = $1
     ORDER BY pos, word`,
    [rootKey]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No dictionary entries for this root', root: rootKey });
  }

  // Cross-reference Quran occurrence data (roots are stored unhyphenated there)
  const bare = rootKey.replace(/-/g, '');
  const qr = await db.query(
    `SELECT root_arabic, root_transliteration, meaning, occurrence_count
     FROM quranic_roots WHERE root_arabic = $1`,
    [bare]
  );

  const payload = {
    root: rootKey,
    root_plain: bare,
    quranic: qr.rows[0] || null,
    language: 'en',
    entry_count: rows.length,
    entries: rows,
  };
  await setCached(cacheKey, payload);
  res.json(payload);
});

// GET /v1/dictionary/word/:word — all dictionary entries for one word form.
router.get('/word/:word', async (req, res) => {
  const raw = decodeURIComponent(req.params.word);
  const plain = stripArabicDiacritics(raw).replace(/-/g, '');

  const { rows } = await db.query(
    `SELECT word, root, pos, gloss_en, source
     FROM dictionary_words
     WHERE word_plain = $1
     ORDER BY pos`,
    [plain]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Word not found in dictionary', word: raw });
  }

  // If any entry has a root, also report where that root occurs in the Quran.
  const rootVal = rows.find((r) => r.root)?.root;
  let quranOccurrences = null;
  if (rootVal) {
    const bare = rootVal.replace(/-/g, '');
    const occ = await db.query(
      `SELECT count(*) AS occurrences
       FROM ayah_words aw
       JOIN quranic_roots r ON r.id = aw.root_id
       WHERE r.root_arabic = $1`,
      [bare]
    );
    quranOccurrences = parseInt(occ.rows[0].occurrences, 10);
  }

  res.json({
    word: raw,
    language: 'en',
    quran_occurrences_of_root: quranOccurrences,
    entries: rows,
  });
});


// GET /v1/dictionary/audio?word=عِلْم — spoken pronunciation (MP3) for a
// dictionary word. Proxies a public Arabic TTS, caches buffers in memory so
// repeat listens are instant, and sets long-lived browser caching headers.
const AUDIO_CACHE = new Map(); // word -> Buffer, capped below
const AUDIO_CACHE_MAX = 500;

router.get('/audio', async (req, res) => {
  const word = String(req.query.word || '').trim().slice(0, 200);
  if (!word || !/[\u0600-\u06FFa-zA-Z]/.test(word)) {
    return res.status(400).json({ error: 'Query param "word" is required' });
  }
  const key = word.replace(/\s+/g, ' ');

  if (AUDIO_CACHE.has(key)) {
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=2592000');
    return res.send(AUDIO_CACHE.get(key));
  }

  try {
    const tts = await fetch(
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&ttsspeed=0.8&q=' + encodeURIComponent(key),
      { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' } }
    );
    if (!tts.ok) throw new Error('TTS upstream returned ' + tts.status);
    const buf = Buffer.from(await tts.arrayBuffer());
    if (!buf || buf.length < 200) throw new Error('TTS upstream returned empty audio');

    if (AUDIO_CACHE.size >= AUDIO_CACHE_MAX) {
      AUDIO_CACHE.delete(AUDIO_CACHE.keys().next().value); // simple FIFO eviction
    }
    AUDIO_CACHE.set(key, buf);

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=2592000');
    return res.send(buf);
  } catch (err) {
    return res.status(502).json({ error: 'Audio unavailable: ' + err.message });
  }
});


// GET /v1/dictionary/words?letter=ك&limit=50&offset=0
// Alif-to-yaa browsing: dictionary words starting with a given Arabic
// letter, paginated. Hamza-on-alif forms (أ إ آ) group under plain alif.
router.get('/words', async (req, res) => {
  const letter = String(req.query.letter || '').trim().slice(0, 2);
  if (!/[\u0600-\u06FF]/.test(letter)) {
    return res.status(400).json({ error: 'Query param "letter" (a single Arabic letter) is required' });
  }
  const capped = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const chars = letter === '\u0627' ? '\u0627\u0623\u0625\u0622\u0671' : letter;
  const regex = '^[' + chars + ']';

  const { rows } = await db.query(
    `SELECT word, root, pos, gloss_en FROM dictionary_words
     WHERE word_plain ~ $1
     ORDER BY word_plain, word
     LIMIT $2 OFFSET $3`,
    [regex, capped, offset]
  );
  const cnt = await db.query(
    'SELECT count(*) AS total FROM dictionary_words WHERE word_plain ~ $1',
    [regex]
  );
  res.json({
    letter,
    offset,
    count: rows.length,
    total: parseInt(cnt.rows[0].total, 10),
    words: rows,
  });
});

module.exports = router;
