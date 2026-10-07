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

module.exports = router;
