const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { shapeRows } = require('../lib/shape');

// GET /v1/fiqh — the module index. A caller who finds this endpoint from /v1/meta
// used to get "Endpoint not found" from a module that is fully populated, which
// reads like an outage. Answer with what is here and where to go next instead.
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'private, max-age=3600');
  const count = async (sql) => {
    try { const { rows } = await db.query(sql); return rows[0] ? rows[0].n : null; }
    catch (e) { return null; }
  };
  const [chapters, topics, rulings, books, scholars] = await Promise.all([
    count('SELECT count(DISTINCT chapter)::int AS n FROM fiqh_rulings'),
    count('SELECT count(DISTINCT topic)::int AS n FROM fiqh_rulings'),
    count('SELECT count(*)::int AS n FROM fiqh_rulings'),
    count('SELECT count(*)::int AS n FROM fiqh_books'),
    count('SELECT count(*)::int AS n FROM fiqh_scholars'),
  ]);
  res.json({
    module: 'fiqh',
    counts: { chapters, topics, rulings, books, scholars },
    note: 'Comparative rulings from the four schools, side by side. Not a fatwa: for a personal ruling ask a qualified scholar.',
    endpoints: [
      { path: '/v1/fiqh/chapters', what: 'each chapter with its topic and ruling counts' },
      { path: '/v1/fiqh/topics', what: 'every topic grouped by chapter' },
      { path: '/v1/fiqh/search?topic=prayer&madhab=Hanafi', what: 'rulings for a topic, optionally narrowed to one school' },
      { path: '/v1/fiqh/books', what: 'recommended works, filterable by school and level' },
      { path: '/v1/fiqh/scholars', what: 'scholars of the evidence-first tradition' },
      { path: '/v1/fiqh/:id', what: 'one ruling by id' },
    ],
  });
});

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

  const shaped = shapeRows(rows, req.query);
  res.json({
    count: shaped.rows.length,
    note: 'Mainstream comparative positions from classical manuals. For a personal ruling (fatwa), consult a qualified scholar.',
    rulings: shaped.rows,
    excerpted: shaped.opts.excerpt > 0,
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
