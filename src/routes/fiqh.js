const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /v1/fiqh/chapters — list chapters with topic and ruling counts
router.get('/chapters', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  const { rows } = await db.query(
    `SELECT chapter, count(DISTINCT topic) AS topics, count(*) AS rulings
     FROM fiqh_rulings GROUP BY chapter ORDER BY min(id)`
  );
  res.json({ count: rows.length, chapters: rows });
});

// GET /v1/fiqh/search?topic=fasting&madhab=Hanafi&chapter=Fasting — rulings for a topic
router.get('/search', async (req, res) => {
  const { topic, madhab, chapter } = req.query;
  if (!topic && !madhab && !chapter) {
    return res.status(400).json({ error: 'Provide at least one of: topic, madhab, chapter' });
  }

  const conditions = [];
  const params = [];
  if (topic) {
    params.push(`%${topic}%`);
    conditions.push(`topic ILIKE $${params.length}`);
  }
  if (madhab) {
    params.push(`%${madhab}%`);
    conditions.push(`madhab ILIKE $${params.length}`);
  }
  if (chapter) {
    params.push(`%${chapter}%`);
    conditions.push(`chapter ILIKE $${params.length}`);
  }

  let rows;
  try {
    rows = (await db.query(
      `SELECT id, chapter, topic, madhab, question, ruling, reference, evidence
       FROM fiqh_rulings
       WHERE ${conditions.join(' AND ')}
       ORDER BY chapter, topic,
                CASE madhab
                  WHEN 'Consensus (all four madhabs)' THEN 0
                  WHEN 'Hanafi' THEN 1
                  WHEN 'Maliki' THEN 2
                  WHEN 'Shafi''i' THEN 3
                  WHEN 'Hanbali' THEN 4
                  ELSE 5
                END`,
      params
    )).rows;
  } catch (err) {
    console.error('fiqh search error:', err);
    return res.status(500).json({ error: 'Database error during fiqh search' });
  }

  res.json({
    count: rows.length,
    note: 'Mainstream comparative positions from classical manuals. For a personal ruling (fatwa), consult a qualified scholar.',
    rulings: rows,
  });
});

// GET /v1/fiqh/books?madhab=&level= — the classical manuals and collections cited by
// the dataset, with metadata and research access links. For study and verification.
// Includes per-madhab study paths (beginner -> advanced) and the evidence-first
// tradition for those not following a madhab.
router.get('/books', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  const { madhab, level } = req.query;
  let q = 'SELECT * FROM fiqh_books';
  const where = [];
  const params = [];
  if (madhab) { params.push(`%${madhab}%`); where.push(`school ILIKE $${params.length}`); }
  if (level) { params.push(`%${level}%`); where.push(`level ILIKE $${params.length}`); }
  if (where.length) q += ' WHERE ' + where.join(' AND ');
  q += ' ORDER BY id';
  const { rows } = await db.query(q, params);
  res.json({ count: rows.length, books: rows });
});

// GET /v1/fiqh/scholars — scholars of the evidence-first (no exclusive madhab)
// tradition, for research purposes. Presented alongside, not above, the four schools.
router.get('/scholars', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  const { rows } = await db.query('SELECT * FROM fiqh_scholars ORDER BY death_year_ah');
  res.json({ count: rows.length, scholars: rows });
});

// GET /v1/fiqh/topics — all topics with their chapters
router.get('/topics', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  const { rows } = await db.query(
    `SELECT DISTINCT chapter, topic, question FROM fiqh_rulings ORDER BY chapter, topic`
  );
  res.json({ count: rows.length, topics: rows });
});

// GET /v1/fiqh/:id — single ruling by id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Ruling id must be a number' });
  const { rows } = await db.query('SELECT * FROM fiqh_rulings WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Ruling not found' });
  res.json(rows[0]);
});

module.exports = router;
