const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');

// GET /v1/duas/categories
router.get('/categories', async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.*
     FROM dua_categories c
     WHERE EXISTS (
       SELECT 1
       FROM duas d
       WHERE d.category_id = c.id
     )
     ORDER BY c.name`
  );
  res.json(rows);
});

// GET /v1/duas/search?q=patience&category=morning
// Full-text search across all duas (Arabic text, translation, and title).
router.get('/search', async (req, res) => {
  const { q, category, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query param "q" is required' });

  const params = [q];
  let sql = `
    SELECT d.id, d.title, d.text_arabic, d.transliteration, d.translation, d.reference,
           c.name AS category, c.slug AS category_slug
     FROM duas d
     JOIN dua_categories c ON c.id = d.category_id
     WHERE (d.translation ILIKE '%' || $1 || '%'
            OR d.title ILIKE '%' || $1 || '%'
            OR translate(d.text_arabic, 'ـًٌٍَُِّْٰ', '')
               LIKE '%' || translate($1, 'ـًٌٍَُِّْٰ', '') || '%')`;

  if (category) {
    params.push(category);
    sql += ` AND c.slug = $${params.length}`;
  }
  params.push(Math.min(parseInt(limit, 10) || 20, 100));
  sql += ` ORDER BY d.id LIMIT $${params.length}`;

  const { rows } = await db.query(sql, params);
  res.json({ query: q, count: rows.length, results: rows });
});

// GET /v1/duas/random — a random dua (useful for daily-adhkar features)
router.get('/random', async (req, res) => {
  const { rows } = await db.query(
    `SELECT d.id, d.title, d.text_arabic, d.transliteration, d.translation, d.reference,
            c.name AS category, c.slug AS category_slug
     FROM duas d JOIN dua_categories c ON c.id = d.category_id
     ORDER BY RANDOM() LIMIT 1`
  );
  if (rows.length === 0) return res.status(404).json({ error: 'No duas found' });
  res.json(rows[0]);
});

// GET /v1/duas/:category — e.g. 'morning', 'travel', 'before-eating'
router.get('/:category', async (req, res) => {
  const { category } = req.params;
  const cacheKey = `duas:category:${category}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const { rows } = await db.query(
    `SELECT d.title, d.text_arabic, d.transliteration, d.translation, d.reference
     FROM duas d
     JOIN dua_categories c ON c.id = d.category_id
     WHERE c.slug = $1
     ORDER BY d.id`,
    [category]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Category not found or has no duas' });

  await setCached(cacheKey, rows);
  res.json(rows);
});

module.exports = router;
