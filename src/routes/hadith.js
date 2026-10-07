const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');
const requireTier = require('../middleware/requireTier');
const { LANGUAGES, HADITH_CODES, normalizeLanguage, stripArabicDiacritics } = require('../config/languages');

// GET /v1/hadith/collections — list available collections (Bukhari, Muslim, etc.)
router.get('/collections', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  const { rows } = await db.query('SELECT * FROM hadith_collections ORDER BY name');
  res.json(rows);
});

// GET /v1/hadith/languages — every language this module can serve.
// Arabic and English live on the hadiths table; the rest in hadith_translations.
router.get('/languages', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=3600');
  const base = await db.query(
    `SELECT count(*) FILTER (WHERE text_arabic IS NOT NULL AND text_arabic <> '') AS ar,
            count(*) FILTER (WHERE text_english IS NOT NULL AND text_english <> '') AS en
     FROM hadiths`
  );
  const trans = await db.query(
    'SELECT language, count(*) AS count FROM hadith_translations GROUP BY language'
  );

  const counts = { ar: parseInt(base.rows[0].ar, 10), en: parseInt(base.rows[0].en, 10) };
  trans.rows.forEach((r) => {
    const canon = normalizeLanguage(r.language);
    if (canon) counts[canon] = parseInt(r.count, 10);
  });

  const languages = Object.entries(LANGUAGES)
    .filter(([code]) => counts[code])
    .map(([code, l]) => ({
      code,
      name: l.name,
      native_name: l.native,
      hadith_count: counts[code],
      source: code === 'ar' || code === 'en' ? 'hadiths' : 'hadith_translations',
    }))
    .sort((a, b) => b.hadith_count - a.hadith_count);

  res.json({ languages, total_languages: languages.length });
});

// GET /v1/hadith/search?q=patience&collection=bukhari&language=ur
// Default searches English full-text. language=ar searches the Arabic text
// (diacritics-insensitive ILIKE). Any other supported language searches the
// hadith_translations table for that language.
router.get('/search', async (req, res) => {
  const { q, collection, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" is required' });

  const requested = normalizeLanguage(req.query.language);
  if (req.query.language && !requested) {
    return res.status(400).json({ error: `Unsupported language "${req.query.language}"`, supported: Object.keys(LANGUAGES) });
  }
  const lang = requested || 'en';

  const params = [q];
  let sql;
  let extraSelect = '';

  if (lang === 'en') {
    sql = `
      SELECT h.id, h.hadith_number, h.arabic_number, h.narrator, h.text_english, h.text_arabic,
             h.grade, h.book_number, h.book_name, c.slug AS collection
      FROM hadiths h
      JOIN hadith_collections c ON c.id = h.collection_id
      WHERE to_tsvector('english', h.text_english) @@ plainto_tsquery('english', $1)`;
  } else if (lang === 'ar') {
    // Strip harakat on both sides so undiacritized queries still match.
    sql = `
      SELECT h.id, h.hadith_number, h.arabic_number, h.narrator, h.text_english, h.text_arabic,
             h.grade, h.book_number, h.book_name, c.slug AS collection
      FROM hadiths h
      JOIN hadith_collections c ON c.id = h.collection_id
      WHERE translate(h.text_arabic, '${'\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0670\u0640'}', '') ILIKE '%' || translate($1, '${'\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0670\u0640'}', '') || '%'`;
  } else {
    const code = HADITH_CODES[lang];
    if (!code) {
      return res.status(400).json({ error: `Hadith search not available in "${lang}"`, supported: Object.keys(LANGUAGES) });
    }
    extraSelect = `, ht.text AS text_in_language`;
    sql = `
      SELECT h.id, h.hadith_number, h.arabic_number, h.narrator, h.text_english, h.text_arabic,
             h.grade, h.book_number, h.book_name, c.slug AS collection${extraSelect}
      FROM hadiths h
      JOIN hadith_collections c ON c.id = h.collection_id
      JOIN hadith_translations ht ON ht.hadith_id = h.id AND ht.language = '${code}'
      WHERE to_tsvector('simple', ht.text) @@ plainto_tsquery('simple', $1)`;
  }

  if (collection) {
    params.push(collection);
    sql += ` AND c.slug = $${params.length}`;
  }
  params.push(Math.min(parseInt(limit, 10) || 20, 100));
  sql += ` LIMIT $${params.length}`;

  const { rows } = await db.query(sql, params);
  res.json({ query: q, language: lang, count: rows.length, results: rows });
});

// GET /v1/hadith/export?collection=bukhari — full collection text, for
// researchers who need the whole dataset. Gated to academic/pro tiers.
// Registered before the /:collection routes so it is reachable.
router.get('/export', requireTier('academic', 'pro'), async (req, res) => {
  const { collection } = req.query;
  if (!collection) return res.status(400).json({ error: 'Query param "collection" is required' });

  const { rows } = await db.query(
    `SELECT h.hadith_number, h.narrator, h.text_english, h.grade
     FROM hadiths h
     JOIN hadith_collections c ON c.id = h.collection_id
     WHERE c.slug = $1
     ORDER BY h.id`,
    [collection]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Collection not found or empty' });
  res.json({ collection, count: rows.length, hadith: rows });
});

// GET /v1/hadith/:collection?page=1&limit=20&book=8&language=fr
// Browse a collection page by page — bilingual (Arabic + English) with
// pagination metadata so clients can build next/prev navigation.
// ?language=<code> adds a translation column for that language when available.
router.get('/:collection', async (req, res) => {
  const { collection } = req.params;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const book = req.query.book ? parseInt(req.query.book, 10) : null;
  const offset = (page - 1) * limit;

  const requested = normalizeLanguage(req.query.language);
  if (req.query.language && !requested) {
    return res.status(400).json({ error: `Unsupported language "${req.query.language}"`, supported: Object.keys(LANGUAGES) });
  }
  const lang = requested || 'en';

  const collRows = await db.query('SELECT id, name, slug FROM hadith_collections WHERE slug = $1', [collection]);
  if (collRows.rows.length === 0) return res.status(404).json({ error: 'Collection not found' });
  const coll = collRows.rows[0];

  const params = [coll.id];
  let where = 'h.collection_id = $1';
  if (book != null && !isNaN(book)) {
    params.push(book);
    where += ` AND h.book_number = $${params.length}`;
  }

  let join = '';
  let selectExtra = '';
  if (lang !== 'en' && lang !== 'ar') {
    const code = HADITH_CODES[lang];
    if (code) {
      join = `LEFT JOIN hadith_translations ht ON ht.hadith_id = h.id AND ht.language = '${code}'`;
      selectExtra = `, ht.text AS translation`;
    }
  }

  const totalRows = await db.query(`SELECT COUNT(*) FROM hadiths h WHERE ${where}`, params);
  const total = parseInt(totalRows.rows[0].count, 10);

  params.push(limit);
  params.push(offset);
  const { rows } = await db.query(
    `SELECT h.hadith_number, h.arabic_number, h.book_number, h.book_name, h.grade, h.narrator,
            h.text_arabic, h.text_english${selectExtra}
     FROM hadiths h
     ${join}
     WHERE ${where}
     ORDER BY h.id
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const lastPage = Math.max(Math.ceil(total / limit), 1);
  res.json({
    collection: coll,
    language: lang,
    page, limit, total, total_pages: lastPage,
    has_next: page < lastPage,
    has_prev: page > 1,
    next_page: page < lastPage ? page + 1 : null,
    prev_page: page > 1 ? page - 1 : null,
    hadiths: rows,
  });
});

// GET /v1/hadith/:collection/:number?language=ur (or ?translations=1 for all)
// Bilingual by default; ?language=<code> swaps in that language's translation
// (English/Arabic still included); ?translations=1 attaches every available
// translation under a translations object.
router.get('/:collection/:number', async (req, res) => {
  const { collection, number } = req.params;

  const requested = normalizeLanguage(req.query.language);
  if (req.query.language && !requested) {
    return res.status(400).json({ error: `Unsupported language "${req.query.language}"`, supported: Object.keys(LANGUAGES) });
  }
  const lang = requested || 'en';

  const cacheKey = `hadith:${collection}:${number}:${lang}:${req.query.translations ? 'all' : 'one'}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    `SELECT h.hadith_number, h.narrator, h.text_arabic, h.text_english, h.grade, h.source_edition,
            c.name AS collection_name, b.name_english AS book_name
     FROM hadiths h
     JOIN hadith_collections c ON c.id = h.collection_id
     LEFT JOIN hadith_books b ON b.id = h.book_id
     WHERE c.slug = $1 AND h.hadith_number = $2`,
    [collection, number]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Hadith not found' });
  const hadith = rows[0];

  if (req.query.translations) {
    const tr = await db.query(
      `SELECT language, text FROM hadith_translations ht
       JOIN hadiths h ON h.id = ht.hadith_id
       JOIN hadith_collections c ON c.id = h.collection_id
       WHERE c.slug = $1 AND h.hadith_number = $2`,
      [collection, number]
    );
    hadith.translations = {};
    tr.rows.forEach((r) => {
      const canon = normalizeLanguage(r.language);
      if (canon) hadith.translations[canon] = r.text;
    });
  }

  if (lang !== 'en') {
    if (lang === 'ar') {
      hadith.language = 'ar';
    } else {
      const code = HADITH_CODES[lang];
      const tr = code ? await db.query(
        `SELECT ht.text FROM hadith_translations ht
         JOIN hadiths h ON h.id = ht.hadith_id
         JOIN hadith_collections c ON c.id = h.collection_id
         WHERE c.slug = $1 AND h.hadith_number = $2 AND ht.language = $3`,
        [collection, number, code]
      ) : { rows: [] };
      if (tr.rows.length > 0) {
        hadith.text_in_language = tr.rows[0].text;
        hadith.language = lang;
      } else {
        hadith.language = 'en';
        hadith.language_fallback = true; // requested language not available for this hadith
      }
    }
  } else {
    hadith.language = 'en';
  }

  await setCached(cacheKey, hadith);
  res.json(hadith);
});

// GET /v1/hadith/:collection/:number/isnad — chain of narrators for a hadith
router.get('/:collection/:number/isnad', async (req, res) => {
  const { collection, number } = req.params;

  const { rows } = await db.query(
    `SELECT ic.chain_position, n.name_english, n.name_arabic, n.kunya,
            n.generation, n.reliability_grade, n.bio
     FROM isnad_chains ic
     JOIN narrators n ON n.id = ic.narrator_id
     JOIN hadiths h ON h.id = ic.hadith_id
     JOIN hadith_collections c ON c.id = h.collection_id
     WHERE c.slug = $1 AND h.hadith_number = $2
     ORDER BY ic.chain_position`,
    [collection, number]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'No isnad chain recorded for this hadith yet' });
  }

  res.json({ collection, hadith_number: number, chain: rows });
});

// GET /v1/hadith/:collection/:number/cite?format=apa|bibtex
router.get('/:collection/:number/cite', async (req, res) => {
  const { collection, number } = req.params;
  const format = (req.query.format || 'apa').toLowerCase();

  const { rows } = await db.query(
    `SELECT h.hadith_number, c.name AS collection_name
     FROM hadiths h JOIN hadith_collections c ON c.id = h.collection_id
     WHERE c.slug = $1 AND h.hadith_number = $2`,
    [collection, number]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Hadith not found' });
  const h = rows[0];

  if (format === 'bibtex') {
    const key = `Hadith_${collection}_${number}`;
    const bibtex = `@misc{${key},\n  title = {${h.collection_name}, Hadith ${h.hadith_number}},\n  howpublished = {Ilm API}\n}`;
    return res.type('text/plain').send(bibtex);
  }

  res.json({ citation: `${h.collection_name}, Hadith ${h.hadith_number}` });
});

module.exports = router;
