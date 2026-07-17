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
