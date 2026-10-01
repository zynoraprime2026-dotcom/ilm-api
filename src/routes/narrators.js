const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');

// GET /v1/narrators — list all narrators with their isnad counts
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  const { rows } = await db.query(
    `SELECT n.id, n.name_english, n.name_arabic, n.kunya, n.generation,
            n.birth_year_hijri, n.death_year_hijri, n.reliability_grade,
            COUNT(ic.id) AS isnad_appearances
     FROM narrators n
     LEFT JOIN isnad_chains ic ON ic.narrator_id = n.id
     GROUP BY n.id
     ORDER BY n.generation, n.name_english`
  );
  res.json({ count: rows.length, narrators: rows });
});

// GET /v1/narrators/search?q=umar — search narrators by name, kunya, or grade
router.get('/search', async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" is required' });

  const params = [q, Math.min(parseInt(limit, 10) || 20, 100)];
  const { rows } = await db.query(
    `SELECT n.id, n.name_english, n.name_arabic, n.kunya, n.generation,
            n.birth_year_hijri, n.death_year_hijri, n.reliability_grade, n.bio,
            COUNT(ic.id) AS isnad_appearances
     FROM narrators n
     LEFT JOIN isnad_chains ic ON ic.narrator_id = n.id
     WHERE (n.name_english ILIKE '%' || $1 || '%'
            OR COALESCE(n.name_arabic, '') LIKE '%' || $1 || '%'
            OR COALESCE(n.kunya, '') ILIKE '%' || $1 || '%')
     GROUP BY n.id
     ORDER BY COUNT(ic.id) DESC, n.name_english
     LIMIT $2`,
    params
  );
  res.json({ query: q, count: rows.length, results: rows });
});

// GET /v1/narrators/:id — full narrator profile
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `narrator:${id}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query('SELECT * FROM narrators WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Narrator not found' });

  await setCached(cacheKey, rows[0]);
  res.json(rows[0]);
});

// GET /v1/narrators/:id/isnads — every isnad chain this narrator appears in
router.get('/:id/isnads', async (req, res) => {
  const { id } = req.params;

  const narratorRows = await db.query('SELECT id, name_english FROM narrators WHERE id = $1', [id]);
  if (narratorRows.length === 0) return res.status(404).json({ error: 'Narrator not found' });

  const { rows } = await db.query(
    `SELECT h.id AS hadith_id, h.hadith_number, h.narrator AS hadith_narrator,
            h.text_english, c.name AS collection_name, c.slug AS collection_slug,
            ic.chain_position
     FROM isnad_chains ic
     JOIN narrators n ON n.id = ic.narrator_id
     JOIN hadiths h ON h.id = ic.hadith_id
     JOIN hadith_collections c ON c.id = h.collection_id
     WHERE n.id = $1
     ORDER BY h.id, ic.chain_position`,
    [id]
  );
  res.json({
    narrator: narratorRows.rows[0],
    isnad_count: rows.length,
    hadiths: rows,
  });
});

module.exports = router;
