const express = require('express');
const router = express.Router();
const requireTier = require('../middleware/requireTier');
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');

// GET /v1/roots — list all roots with occurrence counts
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, root_arabic, root_transliteration, meaning, occurrence_count FROM quranic_roots ORDER BY occurrence_count DESC'
  );
  res.json(rows);
});

// GET /v1/roots/:root/occurrences — every ayah where a root appears
// :root should be the Arabic root, URL-encoded, e.g. %D8%B5%D8%A8%D8%B1
router.get('/:root/occurrences', async (req, res) => {
  const rootArabic = decodeURIComponent(req.params.root);
  const cacheKey = `root:${rootArabic}:occurrences`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    `SELECT a.surah_number, a.ayah_number, aw.text_arabic AS word, aw.part_of_speech
     FROM ayah_words aw
     JOIN quranic_roots r ON r.id = aw.root_id
     JOIN ayahs a ON a.id = aw.ayah_id
     WHERE r.root_arabic = $1
     ORDER BY a.surah_number, a.ayah_number`,
    [rootArabic]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Root not found or has no tagged occurrences' });
  }

  const payload = { root: rootArabic, count: rows.length, occurrences: rows };
  await setCached(cacheKey, payload);
  res.json(payload);
});

// TEMP admin endpoint: seed classical root meanings (remove after use)
router.post('/admin/meanings', requireTier('pro'), async (req, res) => {
  try {
    const updates = (req.body && req.body.updates) || [];
    if (!Array.isArray(updates) || updates.length === 0 || updates.length > 500) {
      return res.status(400).json({ error: 'Send updates: [{root, meaning}] (max 500 per request)' });
    }
    let updated = 0;
    for (const u of updates) {
      const r = await db.query('UPDATE quranic_roots SET meaning = $2 WHERE root_arabic = $1', [u.root, String(u.meaning || '').slice(0, 3000)]);
      updated += r.rowCount;
    }
    res.json({ ok: true, received: updates.length, updated });
  } catch (e) {
    res.status(500).json({ error: 'Meanings seed failed: ' + e.message });
  }
});

module.exports = router;
