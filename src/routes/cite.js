const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { normalizeLanguage } = require('../config/languages');

const BASE = 'https://ilm-api.vercel.app';

function buildAyahCitation(row, lang) {
  const refEnglish = `Qur'an ${row.surah_number}:${row.ayah_number}`;
  return {
    type: 'ayah',
    reference: refEnglish,
    reference_arabic: `${row.name_arabic} ${row.ayah_number}`,
    surah: {
      number: row.surah_number,
      name_english: row.name_english,
      name_transliteration: row.name_transliteration,
      name_arabic: row.name_arabic,
    },
    ayah: row.ayah_number,
    text_arabic: row.text_arabic,
    translation: row.translation_code ? { code: row.translation_code, text: row.translation } : null,
    language: lang,
    citation: `${refEnglish} (Surah ${row.name_transliteration}, ayah ${row.ayah_number})`,
    url: `${BASE}/v1/quran/${row.surah_number}/${row.ayah_number}`,
  };
}

function buildHadithCitation(row) {
  const collectionName = row.collection_name || row.collection;
  return {
    type: 'hadith',
    reference: `${collectionName} ${row.hadith_number}`,
    reference_arabic: row.collection_name_arabic ? `${row.collection_name_arabic} ${row.hadith_number}` : null,
    collection: row.collection,
    collection_name: collectionName,
    hadith_number: row.hadith_number,
    book: row.book_number != null ? { number: row.book_number, name: row.book_name } : null,
    narrator: row.narrator || null,
    grade: row.grade || null,
    text_arabic: row.text_arabic,
    text_english: row.text_english,
    citation: `${collectionName}, hadith ${row.hadith_number}${row.book_name ? ` (Book: ${row.book_name})` : ''}${row.narrator ? `, narrated by ${row.narrator}` : ''}`,
    url: `${BASE}/v1/hadith/${row.collection}?book=${row.book_number || ''}`.replace(/\?book=$/, ''),
  };
}

// GET /v1/cite?type=ayah&surah=2&ayah=255&language=en
// GET /v1/cite?type=hadith&collection=bukhari&number=1469
// One canonical, citable record with source edition, so callers stop
// assembling references by hand (and stop inventing them).
router.get('/', async (req, res) => {
  const type = String(req.query.type || '').toLowerCase();
  const wantsAyah = type === 'ayah' || (!type && req.query.surah);
  const wantsHadith = type === 'hadith' || (!type && req.query.collection);

  try {
    if (wantsAyah) {
      const surahNum = parseInt(req.query.surah, 10);
      const ayahNum = parseInt(req.query.ayah, 10);
      if (!Number.isFinite(surahNum) || !Number.isFinite(ayahNum)) {
        return res.status(400).json({ error: 'Provide surah and ayah as numbers (e.g. ?type=ayah&surah=2&ayah=255)' });
      }
      const lang = normalizeLanguage(req.query.language) || 'en';
      const { rows } = await db.query(
        `SELECT s.number AS surah_number, s.name_arabic, s.name_english, s.name_transliteration,
                a.ayah_number, a.text_arabic, a.source_edition,
                t.code AS translation_code, at.text AS translation
         FROM ayahs a
         JOIN surahs s ON s.number = a.surah_number
         LEFT JOIN translations t ON t.code = $3
         LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
         WHERE a.surah_number = $1 AND a.ayah_number = $2`,
        [surahNum, ayahNum, lang]
      );
      if (!rows.length) return res.status(404).json({ error: 'Ayah not found' });
      const payload = buildAyahCitation(rows[0], lang);
      payload.source_edition = rows[0].source_edition || null;
      res.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.json(payload);
    }

    if (wantsHadith) {
      const collection = String(req.query.collection || '').toLowerCase();
      const number = parseInt(req.query.number || req.query.hadith, 10);
      if (!collection || !Number.isFinite(number)) {
        return res.status(400).json({ error: 'Provide collection and number (e.g. ?type=hadith&collection=bukhari&number=1469)' });
      }
      const { rows } = await db.query(
        `SELECT c.slug AS collection, c.name AS collection_name, COALESCE(c.name_arabic, '') AS collection_name_arabic,
                h.hadith_number, h.book_number, h.book_name, h.narrator, h.grade,
                h.text_arabic, h.text_english
         FROM hadiths h
         JOIN hadith_collections c ON c.id = h.collection_id
         WHERE c.slug = $1 AND h.hadith_number = $2
         LIMIT 1`,
        [collection, number]
      ).catch(async () => {
        // name_arabic is added lazily elsewhere; retry without it
        return db.query(
          `SELECT c.slug AS collection, c.name AS collection_name, '' AS collection_name_arabic,
                  h.hadith_number, h.book_number, h.book_name, h.narrator, h.grade,
                  h.text_arabic, h.text_english
           FROM hadiths h
           JOIN hadith_collections c ON c.id = h.collection_id
           WHERE c.slug = $1 AND h.hadith_number = $2
           LIMIT 1`,
          [collection, number]
        );
      });
      if (!rows.length) return res.status(404).json({ error: 'Hadith not found for that collection and number' });
      res.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.json(buildHadithCitation(rows[0]));
    }

    return res.status(400).json({
      error: 'Provide either type=ayah with surah/ayah, or type=hadith with collection/number',
    });
  } catch (e) {
    console.error('cite error:', e);
    return res.status(500).json({ error: 'Could not build citation' });
  }
});

module.exports = router;
