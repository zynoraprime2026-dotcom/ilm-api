const express = require('express');
const router = express.Router();
const { parts, stories } = require('../../data/stories');

// In-memory index built once at cold start.
const byPart = {};
for (const partId of Object.keys(parts)) {
  byPart[partId] = stories
    .filter((s) => s.part === partId)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.id);
}
const byId = {};
for (const s of stories) byId[s.id] = s;

const DAY = 24 * 60 * 60;
const indexFields = (s) => ({
  id: s.id,
  part: s.part,
  order: s.order,
  slug: s.slug,
  name_english: s.nameEn,
  name_arabic: s.nameAr,
  title_english: s.titleEn,
  era: s.era,
  ayah_count: s.ayat.length,
  hadith_count: s.hadith.length,
});

// Deterministic "story of the day" — cycles through all stories by UTC date,
// same pattern as the ecosystem's manuscript-of-the-day.
function storyOfTheDay(dateStr) {
  const epochDay = Math.floor(Date.parse(dateStr + 'T00:00:00Z') / (DAY * 1000));
  return stories[Math.abs(epochDay) % stories.length];
}

// GET /v1/stories — parts overview + compact index of all stories
router.get('/', (req, res) => {
  res.set('Cache-Control', `public, max-age=${DAY}`);
  res.json({
    count: stories.length,
    note: 'Islamic history in three parts: The Beginning (Allah\'s first creations through Adam), The Prophets (Adam to Muhammad ﷺ), and The End (signs of the Hour through the Hereafter).',
    parts: Object.entries(parts).map(([id, p]) => ({
      id,
      name_english: p.en,
      name_arabic: p.ar,
      description: p.desc,
      story_ids: byPart[id],
    })),
    stories: stories.map(indexFields),
  });
});

// GET /v1/stories/parts — just the three parts
router.get('/parts', (req, res) => {
  res.set('Cache-Control', `public, max-age=${DAY}`);
  res.json(Object.entries(parts).map(([id, p]) => ({
    id,
    name_english: p.en,
    name_arabic: p.ar,
    description: p.desc,
    story_count: byPart[id].length,
  })));
});

// GET /v1/stories/part/:partId — compact index for one part
router.get('/part/:partId', (req, res) => {
  const part = parts[req.params.partId];
  if (!part) {
    return res.status(404).json({
      error: 'Part not found',
      valid_parts: Object.keys(parts),
    });
  }
  res.set('Cache-Control', `public, max-age=${DAY}`);
  const ids = byPart[req.params.partId];
  res.json({
    part: req.params.partId,
    name_english: part.en,
    name_arabic: part.ar,
    description: part.desc,
    count: ids.length,
    stories: ids.map((id) => indexFields(byId[id])),
  });
});

// GET /v1/stories/daily — deterministic story of the day (UTC)
router.get('/daily', (req, res) => {
  res.set('Cache-Control', `public, max-age=${DAY}`);
  const dateStr = (req.query.date || new Date().toISOString().slice(0, 10));
  const s = storyOfTheDay(dateStr);
  res.json({ date: dateStr, story: serializeStory(s) });
});

// GET /v1/stories/random — random story
router.get('/random', (req, res) => {
  const partId = req.query.part;
  const pool = partId ? byPart[partId] : stories.map((s) => s.id);
  if (pool.length === 0) {
    return res.status(404).json({ error: 'Part not found', valid_parts: Object.keys(parts) });
  }
  const s = byId[pool[Math.floor(Math.random() * pool.length)]];
  res.set('Cache-Control', 'no-store');
  res.json(serializeStory(s));
});

// GET /v1/stories/:id — full story (summary, ayat with exact Arabic, hadith with sources)
router.get('/:id', (req, res) => {
  const s = byId[req.params.id];
  if (!s) {
    return res.status(404).json({
      error: 'Story not found',
      hint: 'GET /v1/stories for the full index',
    });
  }
  res.set('Cache-Control', `public, max-age=${DAY}`);
  res.json(serializeStory(s));
});

function serializeStory(s) {
  return {
    id: s.id,
    part: s.part,
    part_name: parts[s.part] ? parts[s.part].en : s.part,
    order: s.order,
    slug: s.slug,
    name_english: s.nameEn,
    name_arabic: s.nameAr,
    title_english: s.titleEn,
    era: s.era,
    summary: s.summary,
    ayat: s.ayat.map((a) => ({
      reference: a.ref,
      text_arabic: a.ar,
      translation: a.en,
      translation_source: 'Sahih International',
    })),
    hadith: s.hadith.map((h) => ({
      source: h.src,
      grade: h.grade || null,
      text_english: h.en,
      text_arabic: h.ar || null,
    })),
  };
}

module.exports = router;
