const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getCached, setCached } = require('../config/cache');

// GET /v1/topics — list all thematic topics
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM topics ORDER BY name');
  res.json(rows);
});

// GET /v1/topics/:slug — every ayah + hadith tagged with this topic
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `topic:${slug}`;
  const cached = await getCached(cacheKey);
  if (cached) return res.json(cached);

  const topicResult = await db.query('SELECT * FROM topics WHERE slug = $1', [slug]);
  if (topicResult.rows.length === 0) {
    return res.status(404).json({ error: 'Topic not found' });
  }

  const ayahsResult = await db.query(
    `SELECT a.surah_number, a.ayah_number, a.text_arabic
     FROM ayah_topics at
     JOIN ayahs a ON a.id = at.ayah_id
     JOIN topics t ON t.id = at.topic_id
     WHERE t.slug = $1
     ORDER BY a.surah_number, a.ayah_number`,
    [slug]
  );

  const hadithResult = await db.query(
    `SELECT h.hadith_number, h.text_english, c.slug AS collection, c.name AS collection_name
     FROM hadith_topics ht
     JOIN hadiths h ON h.id = ht.hadith_id
     JOIN topics t ON t.id = ht.topic_id
     JOIN hadith_collections c ON c.id = h.collection_id
     WHERE t.slug = $1
     ORDER BY c.name, h.hadith_number`,
    [slug]
  );

  const payload = {
    topic: topicResult.rows[0],
    ayahs: ayahsResult.rows,
    hadith: hadithResult.rows,
  };

  await setCached(cacheKey, payload);
  res.json(payload);
});

module.exports = router;
