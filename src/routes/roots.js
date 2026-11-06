const express = require('express');
const router = express.Router();
const requireTier = require('../middleware/requireTier');
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');
const { pagination, pageMeta, shapeRows } = require('../lib/shape');

// GET /v1/roots — list all roots with occurrence counts
router.get('/', async (req, res) => {
  // 1,651 roots used to arrive as one 480KB array. Clients that ask for
  // limit/offset now get an envelope; plain requests keep the array shape but
  // are capped, with X-Total-Count telling them how much is left.
  const { limit, offset } = pagination(req.query, { defaultLimit: 500, maxLimit: 1000 });
  const wantsEnvelope = req.query.limit !== undefined || req.query.offset !== undefined || req.query.format === 'json';
  const totalRes = await db.query('SELECT COUNT(*)::int AS n FROM quranic_roots');
  const total = totalRes.rows[0] ? totalRes.rows[0].n : null;
  const { rows } = await db.query(
    'SELECT id, root_arabic, root_transliteration, meaning, occurrence_count FROM quranic_roots ORDER BY occurrence_count DESC, id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  const { rows: roots } = shapeRows(rows, req.query);
  if (wantsEnvelope) {
    return res.json({ ...pageMeta({ limit, offset, returned: roots.length, total }), roots });
  }
  if (typeof total === 'number') res.set('X-Total-Count', String(total));
  if (typeof total === 'number' && offset + roots.length < total) res.set('X-Result-Truncated', 'true');
  res.json(roots);
});

// GET /v1/roots/:root/occurrences — every ayah where a root appears
// :root should be the Arabic root, URL-encoded, e.g. %D8%B5%D8%A8%D8%B1
router.get('/:root/occurrences', async (req, res) => {
  const rootArabic = decodeURIComponent(req.params.root);
  const cacheKey = `root:${rootArabic}:occ2`;
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

  const meta = await db.query('SELECT meaning FROM quranic_roots WHERE root_arabic = $1', [rootArabic]);
  const payload = { root: rootArabic, meaning: meta.rows[0] ? meta.rows[0].meaning : null, count: rows.length, occurrences: rows };
  await setCached(cacheKey, payload);
  res.json(payload);
});

module.exports = router;
