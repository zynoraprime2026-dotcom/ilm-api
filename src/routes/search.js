const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { normalizeLanguage } = require('../config/languages');
const { pagination, pageMeta } = require('../lib/shape');
const { parseReference } = require('../lib/reference');

const ARABIC = /[\u0600-\u06FF]/;
const HARAQAT = '\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0670\u0640';
const LETTER_FOLD = '\u0671\u0623\u0625\u0622\u0649\u0629'; // ٱ أ إ آ ى ة
const LETTER_PLAIN = '\u0627\u0627\u0627\u0627\u064A\u0647'; // ا ا ا ا ي ه
const BASE = 'https://ilm-api.vercel.app';

// GET /v1/search?q=mercy&limit=5&language=en
// One call across Quran, hadith, duas and fiqh. Every section is independent:
// if one store is unavailable the others still answer.
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Query param "q" is required' });

  const lang = normalizeLanguage(req.query.language) || 'en';
  const { limit } = pagination(req.query, { defaultLimit: 5, maxLimit: 25 });
  const arabicQuery = ARABIC.test(q);
  const only = req.query.only ? String(req.query.only).split(',').map(s => s.trim()) : null;
  const want = (name) => !only || only.includes(name);

  // "2:255", "Al-Baqarah 255" and "Bukhari 1" are citations, not text. Resolve
  // them straight to the verse or hadith instead of returning an empty search,
  // because a reader who types a reference wants that record and nothing else.
  const ref = parseReference(q);
  const reference = (async () => {
    if (!ref) return;
    try {
      if (ref.type === 'ayah') {
        const { rows } = await db.query(
          `SELECT a.surah_number, a.ayah_number, s.name_english, s.name_transliteration,
                  a.text_arabic, at.text AS translation
             FROM ayahs a
             JOIN surahs s ON s.number = a.surah_number
             LEFT JOIN translations t ON t.code = 'en.sahih'
             LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
            WHERE a.surah_number = $1 AND a.ayah_number = $2
            LIMIT 1`,
          [ref.surah, ref.ayah]
        );
        const r = rows[0];
        sections.reference = {
          count: r ? 1 : 0,
          matched: ref,
          results: r ? [{
            reference: `${r.surah_number}:${r.ayah_number}`,
            surah: r.name_english,
            surah_transliteration: r.name_transliteration,
            text_arabic: r.text_arabic,
            translation: r.translation,
            url: `${BASE}/v1/quran/${r.surah_number}/${r.ayah_number}`,
          }] : [],
        };
      } else {
        const { rows } = await db.query(
          `SELECT h.hadith_number, h.narrator, h.text_english, h.text_arabic, c.slug
             FROM hadiths h
             JOIN hadith_collections c ON c.id = h.collection_id
            WHERE c.slug = $1 AND h.hadith_number = $2
            LIMIT 1`,
          [ref.collection, ref.number]
        );
        const r = rows[0];
        sections.reference = {
          count: r ? 1 : 0,
          matched: ref,
          results: r ? [{
            reference: `${r.slug} ${r.hadith_number}`,
            collection: r.slug,
            number: r.hadith_number,
            narrator: r.narrator,
            text_english: r.text_english,
            text_arabic: r.text_arabic,
            url: `${BASE}/v1/hadith/${r.slug}/${r.hadith_number}`,
          }] : [],
        };
      }
    } catch (e) {
      sections.reference = { count: 0, error: 'reference lookup unavailable' };
    }
  })();

  const sections = {};

  const quran = (async () => {
    if (!want('quran')) return;
    try {
      if (arabicQuery) {
        const { rows } = await db.query(
          `SELECT a.surah_number, a.ayah_number, s.name_english, s.name_transliteration, a.text_arabic
           FROM ayahs a JOIN surahs s ON s.number = a.surah_number
           WHERE translate(translate(a.text_arabic, $1, ''), $4, $5)
                 LIKE '%' || translate(translate($2, $1, ''), $4, $5) || '%'
           ORDER BY a.surah_number, a.ayah_number
           LIMIT $3`,
          [HARAQAT, q, limit, LETTER_FOLD, LETTER_PLAIN]
        );
        sections.quran = {
          count: rows.length,
          results: rows.map(r => ({
            reference: `${r.surah_number}:${r.ayah_number}`,
            surah: r.name_english,
            text_arabic: r.text_arabic,
            url: `${BASE}/v1/quran/${r.surah_number}/${r.ayah_number}`
          }))
        };
      } else {
        // Translations are keyed like "en.clearquran", not bare "en", so pick the
        // first translation for the requested language.
        const { rows } = await db.query(
          `SELECT a.surah_number, a.ayah_number, s.name_english, s.name_transliteration, at.text AS translation
           FROM ayah_translations at
           JOIN translations t ON t.id = at.translation_id
           JOIN ayahs a ON a.id = at.ayah_id
           JOIN surahs s ON s.number = a.surah_number
           WHERE t.language = $2 AND at.text ILIKE '%' || $1 || '%'
           ORDER BY a.surah_number, a.ayah_number
           LIMIT $3`,
          [q, lang, limit]
        );
        sections.quran = {
          count: rows.length,
          results: rows.map(r => ({
            reference: `${r.surah_number}:${r.ayah_number}`,
            surah: r.name_english,
            translation: r.translation,
            url: `${BASE}/v1/quran/${r.surah_number}/${r.ayah_number}`
          }))
        };
      }
    } catch (e) { sections.quran = { count: 0, error: 'search unavailable' }; }
  })();

  const hadith = (async () => {
    if (!want('hadith')) return;
    try {
      let rows;
      if (arabicQuery) {
        rows = (await db.query(
          `SELECT c.slug AS collection, h.hadith_number, h.narrator, h.text_arabic
           FROM hadiths h JOIN hadith_collections c ON c.id = h.collection_id
           WHERE translate(translate(h.text_arabic, $1, ''), $4, $5)
                 LIKE '%' || translate(translate($2, $1, ''), $4, $5) || '%'
           ORDER BY length(h.text_arabic) ASC
           LIMIT $3`,
          [HARAQAT, q, limit, LETTER_FOLD, LETTER_PLAIN]
        )).rows;
        sections.hadith = {
          count: rows.length,
          results: rows.map(r => ({
            reference: `${r.collection} ${r.hadith_number}`,
            narrator: r.narrator,
            text_arabic: r.text_arabic.slice(0, 400),
            url: `${BASE}/v1/cite?type=hadith&collection=${r.collection}&number=${r.hadith_number}`
          }))
        };
      } else {
        rows = (await db.query(
          `SELECT c.slug AS collection, h.hadith_number, h.narrator, h.grade, h.text_english
           FROM hadiths h JOIN hadith_collections c ON c.id = h.collection_id
           WHERE to_tsvector('english', h.text_english) @@ plainto_tsquery('english', $1)
           ORDER BY ts_rank(to_tsvector('english', h.text_english), plainto_tsquery('english', $1), 3) DESC, h.id ASC
           LIMIT $2`,
          [q, limit]
        )).rows;
        sections.hadith = {
          count: rows.length,
          // Deliberately trimmed text: /v1/cite has the full record.
          results: rows.map(r => ({
            reference: `${r.collection} ${r.hadith_number}`,
            narrator: r.narrator,
            grade: r.grade,
            text_english: r.text_english.slice(0, 400),
            url: `${BASE}/v1/cite?type=hadith&collection=${r.collection}&number=${r.hadith_number}`
          }))
        };
      }
    } catch (e) { sections.hadith = { count: 0, error: 'search unavailable' }; }
  })();

  const duas = (async () => {
    if (!want('duas')) return;
    try {
      const { rows } = await db.query(
        `SELECT d.id, d.title, d.translation, d.reference, c.slug AS category
         FROM duas d JOIN dua_categories c ON c.id = d.category_id
         WHERE d.translation ILIKE '%' || $1 || '%' OR d.title ILIKE '%' || $1 || '%'
         ORDER BY d.id LIMIT $2`,
        [q, limit]
      );
      sections.duas = {
        count: rows.length,
        results: rows.map(r => ({
          title: r.title, category: r.category, translation: (r.translation || '').slice(0, 300),
          reference: r.reference, url: `${BASE}/v1/duas/${r.category}`
        }))
      };
    } catch (e) { sections.duas = { count: 0, error: 'search unavailable' }; }
  })();

  const fiqh = (async () => {
    if (!want('fiqh')) return;
    try {
      const { rows } = await db.query(
        `SELECT id, topic, madhab, ruling FROM fiqh_rulings
         WHERE topic ILIKE '%' || $1 || '%' OR question ILIKE '%' || $1 || '%'
         ORDER BY topic, madhab LIMIT $2`,
        [q, limit]
      );
      sections.fiqh = {
        count: rows.length,
        results: rows.map(r => ({
          id: r.id, topic: r.topic, madhab: r.madhab, ruling: (r.ruling || '').slice(0, 300),
          url: `${BASE}/v1/fiqh/${r.id}`
        }))
      };
    } catch (e) { sections.fiqh = { count: 0, error: 'search unavailable' }; }
  })();

  await Promise.all([quran, hadith, duas, fiqh, reference]);

  const total = Object.values(sections).reduce((sum, s) => sum + (s.count || 0), 0);
  res.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=120');
  res.json({ query: q, language: lang, ...pageMeta({ limit, offset: 0, returned: total }), sections });
});

module.exports = router;
