const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /v1/fiqh/search?topic=fasting — rulings across madhabs for a topic
router.get('/search', async (req, res) => {
  const { topic } = req.query;
  if (!topic) return res.status(400).json({ error: 'Query param "topic" is required' });

  const { rows } = await db.query(
    `SELECT id, topic, madhab, question, ruling, reference
     FROM fiqh_rulings
     WHERE topic ILIKE $1
     ORDER BY madhab`,
    [`%${topic}%`]
  );

  res.json({ topic, count: rows.length, rulings: rows });
});

// GET /v1/fiqh/:id — single ruling by id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM fiqh_rulings WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Ruling not found' });
  res.json(rows[0]);
});

module.exports = router;
