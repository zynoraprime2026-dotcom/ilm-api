const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');

// GET /v1/tafsir/sources — list available tafsir sources
router.get('/sources', async (req, res) => {
  const { rows } = await db.query('SELECT DISTINCT source FROM tafsir ORDER BY source');
  res.json(rows.map((r) => r.source));
});

// GET /v1/tafsir/:surah/:ayah?source=Ibn%20Kathir
// GET /v1/tafsir/search?q=patience — search tafsir text across sources
router.get('/search', async (req, res) => {
  const { q, source, surah, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" is required' });

  const params = [q];
  let sqlText = `
    SELECT t.id, t.source, t.text, a.surah_number, a.ayah_number,
            s.name_english AS surah_name
     FROM tafsir t
     JOIN ayahs a ON a.id = t.ayah_id
     JOIN surahs s ON s.number = a.surah_number
     WHERE to_tsvector('english', t.text) @@ plainto_tsquery('english', $1)`;

  if (source) {
    params.push(source);
    sqlText += ` AND t.source = $${params.length}`;
  }
  if (surah) {
    params.push(parseInt(surah, 10) || 1);
    sqlText += ` AND a.surah_number = $${params.length}`;
  }
  params.push(Math.min(parseInt(limit, 10) || 20, 100));
  sqlText += ` ORDER BY a.surah_number, a.ayah_number LIMIT $${params.length}`;

  const { rows } = await db.query(sqlText, params);
  res.json({ query: q, count: rows.length, results: rows });
});

router.get('/:surah/:ayah', async (req, res) => {
  const surahNum = parseInt(req.params.surah, 10);
  const ayahNum = parseInt(req.params.ayah, 10);
  const source = req.query.source;

  const cacheKey = `tafsir:${surahNum}:${ayahNum}:${source || 'all'}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const params = [surahNum, ayahNum];
  let sql = `
    SELECT t.source, t.text, t.publisher, t.source_edition
    FROM tafsir t
    JOIN ayahs a ON a.id = t.ayah_id
    WHERE a.surah_number = $1 AND a.ayah_number = $2`;

  if (source) {
    params.push(source);
    sql += ` AND t.source = $${params.length}`;
  }

  const { rows } = await db.query(sql, params);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'No tafsir found for this ayah/source combination' });
  }

  const payload = { surah: surahNum, ayah: ayahNum, tafsir: rows };
  await setCached(cacheKey, payload);
  res.json(payload);
});

module.exports = router;
