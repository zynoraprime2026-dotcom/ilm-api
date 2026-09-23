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
