// GET /v1/mutoon — the classical primers students memorise, with their study
// paths. Text lines and per-line audio are served only when actually ingested:
// this endpoint never advertises sound or content it does not hold.
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { MUTOON, PATHS } = require('../../data/mutoon.js');

const AUDIO_BASE = String(process.env.MUTOON_AUDIO_BASE || '').replace(/\/+$/, '');
// Lines live in Postgres (scripts/ingestMatn.cjs), not in memory: a serverless
// instance cannot be trusted to keep them, and claiming content we cannot serve
// is worse than saying it is not loaded yet.
const LINES = {}; // slug -> { lines, source }, read-through cache

function withAudio(m) {
  const ingested = Boolean(LINES[m.slug] && LINES[m.slug].lines && LINES[m.slug].lines.length);
  const matnAudio = m.audio && m.audio.url ? m.audio : null;
  // Per-line audio is richer (a learner can loop one verse) but needs a bucket.
  // Whole-matn audio is what we can verify today, so serve it rather than 503.
  const kind = AUDIO_BASE && ingested ? 'line' : matnAudio ? 'matn' : null;
  return {
    ...m,
    ingested,
    audio_kind: kind,
    audio_available: Boolean(kind),
    audio_url: kind === 'line' ? `${AUDIO_BASE}/${m.slug}/1.mp3` : (matnAudio ? matnAudio.url : null),
    audio_url_template: kind === 'line' ? `${AUDIO_BASE}/${m.slug}/{line}.mp3` : null,
  };
}

router.get('/', (req, res) => {
  const field = req.query.field ? String(req.query.field) : null;
  const level = req.query.level ? String(req.query.level) : null;
  let rows = MUTOON.map(withAudio);
  if (field) rows = rows.filter((m) => m.field === field || m.field.startsWith(field + '-'));
  if (level) rows = rows.filter((m) => m.level === level);
  res.json({
    count: rows.length,
    fields: [...new Set(MUTOON.map((m) => m.field))].sort(),
    levels: ['beginner', 'intermediate', 'advanced'],
    paths: PATHS,
    mutoon: rows,
  });
});

router.get('/paths', (req, res) => {
  const byPath = Object.entries(PATHS).map(([name, slugs]) => ({
    path: name,
    mutoon: slugs.map((s) => MUTOON.find((m) => m.slug === s)).filter(Boolean).map((m) => ({ slug: m.slug, title_english: m.title_english, level: m.level })),
  }));
  res.json({ count: byPath.length, paths: byPath });
});

router.get('/:slug', (req, res, next) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return next(); // fall through to the generic 404 handler
  res.json(withAudio(m));
});

router.get('/:slug/lines', async (req, res) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: `Unknown matn: ${req.params.slug}`, list_url: '/v1/mutoon' });

  if (!LINES[m.slug]) {
    try {
      const { rows } = await db.query(
        'SELECT line_number, arabic, translation, transliteration, source FROM mutoon_lines WHERE slug = $1 ORDER BY line_number',
        [m.slug]
      );
      if (rows.length) {
        LINES[m.slug] = {
          source: rows[0].source || null,
          lines: rows.map((r) => ({ n: r.line_number, arabic: r.arabic, translation: r.translation, transliteration: r.transliteration })),
        };
      }
    } catch (e) {
      if (String(e.code) === '42P01') {
        return res.status(409).json({
          error: 'Text not ingested yet',
          slug: m.slug,
          ingested: false,
          hint: 'Run scripts/ingestMatn.cjs to create mutoon_lines and load this matn. The API never serves partial text.',
        });
      }
      throw e;
    }
  }

  const pack = LINES[m.slug];
  if (!pack || !pack.lines.length) {
    return res.status(409).json({
      error: 'Text not ingested yet',
      slug: m.slug,
      ingested: false,
      hint: 'This matn is catalogued but its lines are not loaded. Ingest it with scripts/ingestMatn.cjs.',
    });
  }
  const from = Math.max(1, parseInt(req.query.from, 10) || 1);
  const to = Math.min(pack.lines.length, parseInt(req.query.to, 10) || pack.lines.length);
  res.json({
    slug: m.slug,
    title_english: m.title_english,
    total_lines: pack.lines.length,
    from, to,
    source: pack.source || null,
    audio_available: Boolean(AUDIO_BASE),
    lines: pack.lines
      .filter((l) => l.n >= from && l.n <= to)
      .map((l) => ({ ...l, audio_url: AUDIO_BASE ? `${AUDIO_BASE}/${m.slug}/${l.n}.mp3` : null })),
  });
});

router.get('/:slug/audio', (req, res) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: `Unknown matn: ${req.params.slug}` });
  if (m.audio && m.audio.url) return res.redirect(302, m.audio.url);
  return res.status(503).json({
    error: 'Audio not configured',
    slug: m.slug,
    hint: 'Set MUTOON_AUDIO_BASE for per-line files ({slug}/{line}.mp3), or add a verified whole-matn url to data/mutoon.js.',
  });
});

router.get('/:slug/audio/:line', (req, res) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: `Unknown matn: ${req.params.slug}` });
  const line = parseInt(req.params.line, 10);
  if (!Number.isFinite(line) || line < 1) return res.status(400).json({ error: 'Line must be a positive number' });

  if (AUDIO_BASE) return res.redirect(302, `${AUDIO_BASE}/${m.slug}/${line}.mp3`);

  // No bucket yet: hand back the whole recording rather than an error, and say so
  // in headers so a client knows line seeking is its own job.
  if (m.audio && m.audio.url) {
    res.set('X-Audio-Kind', 'matn');
    res.set('X-Audio-Line-Ignored', String(line));
    return res.redirect(302, m.audio.url);
  }
  return res.status(503).json({
    error: 'Audio not configured',
    slug: m.slug,
    hint: 'Set MUTOON_AUDIO_BASE to the bucket root, laid out as {slug}/{line}.mp3, and this endpoint redirects to it.',
  });
});

module.exports = router;
module.exports.LINES = LINES;
