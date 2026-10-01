const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');
const requireTier = require('../middleware/requireTier');

// GET /v1/quran/translations — list all available translations
router.get('/translations', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  const { rows } = await db.query('SELECT code, language, translator_name, is_simplified FROM translations ORDER BY is_simplified DESC, language, translator_name');
  res.json(rows);
});

// GET /v1/quran/surahs — list all 114 surahs
router.get('/surahs', async (req, res) => {
  const cacheKey = 'quran:surahs:all';
  const cached = await getCached(cacheKey);
  res.set('Cache-Control', 'public, max-age=86400'); // this list never changes
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
  const translationCode = req.query.translation || 'en.sahih';
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
    const ayahsResult = await db.query(
      `SELECT a.ayah_number, a.text_arabic, at.text AS translation
       FROM ayahs a
       JOIN translations t ON t.code = $2
       LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
       WHERE a.surah_number = $1
       ORDER BY a.ayah_number
       LIMIT $3 OFFSET $4`,
      [surahNum, translationCode, limit, offset]
    );
    ayahs = ayahsResult.rows;
    pagination = {
      page, limit, total, total_pages: lastPage,
      has_next: page < lastPage, has_prev: page > 1,
      next_page: page < lastPage ? page + 1 : null,
      prev_page: page > 1 ? page - 1 : null,
    };
  } else {
    const ayahsResult = await db.query(
      `SELECT a.ayah_number, a.text_arabic, at.text AS translation
       FROM ayahs a
       JOIN translations t ON t.code = $2
       LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
       WHERE a.surah_number = $1
       ORDER BY a.ayah_number`,
      [surahNum, translationCode]
    );
    ayahs = ayahsResult.rows;
  }

  const payload = {
    surah,
    translation_code: translationCode,
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
  const translationCode = req.query.translation || 'en.sahih';

  const cacheKey = `quran:ayah:${surahNum}:${ayahNum}:${translationCode}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    `SELECT a.surah_number, a.ayah_number, a.text_arabic, a.source_edition, at.text AS translation
     FROM ayahs a
     JOIN translations t ON t.code = $3
     LEFT JOIN ayah_translations at ON at.ayah_id = a.id AND at.translation_id = t.id
     WHERE a.surah_number = $1 AND a.ayah_number = $2`,
    [surahNum, ayahNum, translationCode]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Ayah not found' });
  }

  await setCached(cacheKey, rows[0]);
  res.json(rows[0]);
});

// GET /v1/quran/:surah/:ayah/words — word-by-word breakdown (Arabic + root + grammar)
router.get('/:surah/:ayah/words', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const ayahNum = parseInt(req.params.ayah, 10);

  const cacheKey = `quran:words:${surahNum}:${ayahNum}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    `SELECT aw.word_position, aw.text_arabic, aw.transliteration, aw.translation,
            aw.part_of_speech, r.root_arabic, r.root_transliteration
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
router.get('/:surah/:ayah/audio', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const ayahNum = parseInt(req.params.ayah, 10);
  const reciterSlug = req.query.reciter || 'alafasy';

  const reciterResult = await db.query('SELECT * FROM reciters WHERE slug = $1', [reciterSlug]);
  if (reciterResult.rows.length === 0) {
    return res.status(404).json({ error: `Reciter "${reciterSlug}" not found. See /v1/reciters for available options.` });
  }
  const reciter = reciterResult.rows[0];

  // everyayah.com filename pattern: SSSAAA.mp3 (surah/ayah zero-padded to 3 digits)
  const fileName = `${String(surahNum).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;
  const audioUrl = `${reciter.audio_base_url}${fileName}`;

  res.json({ surah: surahNum, ayah: ayahNum, reciter: reciter.name, audio_url: audioUrl });
});

module.exports = router;
