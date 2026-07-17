const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');
const requireTier = require('../middleware/requireTier');

// GET /v1/hadith/collections — list available collections (Bukhari, Muslim, etc.)
router.get('/collections', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  const { rows } = await db.query('SELECT * FROM hadith_collections ORDER BY name');
  res.json(rows);
});

// GET /v1/hadith/search?q=patience&collection=bukhari
router.get('/search', async (req, res) => {
  const { q, collection, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" is required' });

  const params = [q];
  let sql = `
    SELECT h.id, h.hadith_number, h.narrator, h.text_english, h.grade, c.slug AS collection
    FROM hadiths h
    JOIN hadith_collections c ON c.id = h.collection_id
    WHERE to_tsvector('english', h.text_english) @@ plainto_tsquery('english', $1)`;

  if (collection) {
    params.push(collection);
    sql += ` AND c.slug = $${params.length}`;
  }
  params.push(Math.min(parseInt(limit, 10) || 20, 100));
  sql += ` LIMIT $${params.length}`;

  const { rows } = await db.query(sql, params);
  res.json({ query: q, count: rows.length, results: rows });
});

// GET /v1/hadith/:collection/:number
router.get('/:collection/:number', async (req, res) => {
  const { collection, number } = req.params;
  const cacheKey = `hadith:${collection}:${number}`;
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

  await setCached(cacheKey, rows[0]);
  res.json(rows[0]);
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

// GET /v1/hadith/:collection/:number/cite?format=bibtex|apa
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

// GET /v1/hadith/export?collection=bukhari — full collection text, for
// researchers who need the whole dataset. Gated to academic/pro tiers.
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

module.exports = router;
