// GET /v1/mutoon — the classical primers students memorise, with their study
// paths. Text lines and per-line audio are served only when actually ingested:
// this endpoint never advertises sound or content it does not hold.
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { MUTOON, PATHS } = require('../../data/mutoon.js');
const { bundledMatn } = require('../lib/bundledMatn');

const AUDIO_BASE = String(process.env.MUTOON_AUDIO_BASE || '').replace(/\/+$/, '');
// Lines live in Postgres (scripts/ingestMatn.cjs), not in memory: a serverless
// instance cannot be trusted to keep them, and claiming content we cannot serve
// is worse than saying it is not loaded yet.
const LINES = {}; // slug -> { lines, source }, read-through cache

function withAudio(m, baseUrl) {
  // Text counts as available if it came from the database or ships with the code.
  const bundled = bundledMatn(m.slug);
  const ingested = Boolean(
    (LINES[m.slug] && LINES[m.slug].lines && LINES[m.slug].lines.length) ||
    (bundled && bundled.lines.length)
  );
  const matnAudio = m.audio && m.audio.url ? m.audio : null;
  // Per-line audio is richer (a learner can loop one verse) but needs a bucket.
  // Whole-matn audio is what we can verify today, so serve it rather than 503.
  const kind = AUDIO_BASE && ingested ? 'line' : matnAudio ? 'matn' : null;
  const tier = String(baseUrl || '/v1/mutoon').replace(/\/+$/, '');
  return {
    ...m,
    ingested,
    audio_kind: kind,
    audio_available: Boolean(kind),
    audio_url: kind === 'line' ? `${AUDIO_BASE}/${m.slug}/1.mp3` : (matnAudio ? `${API_BASE}${tier}/${m.slug}/stream` : null),
    pdf_available: !!pdfFor(m.slug),
    pdf_url: pdfFor(m.slug) ? `${API_BASE}${tier}/${m.slug}/pdf` : null,
    audio_download_url: kind === 'line' ? null : (matnAudio ? `${API_BASE}${tier}/${m.slug}/stream?download=1` : null),
    audio_url_template: kind === 'line' ? `${AUDIO_BASE}/${m.slug}/{line}.mp3` : null,
  };
}

router.get('/', (req, res) => {
  const field = req.query.field ? String(req.query.field) : null;
  const level = req.query.level ? String(req.query.level) : null;
  let rows = MUTOON.map((m) => withAudio(m, req.baseUrl));
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

const { pdfFor, MUTOON_PDFS } = require('../lib/mutoonPdfs');
const { PDF_CANDIDATES } = require('../lib/mutoonPdfCandidates');
const API_BASE = String(process.env.API_BASE_URL || 'https://ilm-api.vercel.app').replace(/\/+$/, '');

// Audio provenance in one place, so a bad source can be pulled without shipping a
// client update. The upstream file is never advertised: clients talk to /stream on
// this domain, which is what keeps playback inside the app that asked for it.
function audioRegistry(baseUrl) {
  return MUTOON.filter((m) => m.audio && m.audio.url).map((m) => ({
    slug: m.slug,
    title_english: m.title_english,
    kind: m.audio.kind || 'matn',
    source: m.audio.source || null,
    speaker: m.audio.speaker || null,
    licence: m.audio.licence || m.audio.license || null,
    verified_at: m.audio.verified_at || null,
    bytes: m.audio.bytes || null,
    stream_url: `${API_BASE}${String(baseUrl || '/v1/mutoon').replace(/\/+$/, '')}/${m.slug}/stream`,
    upstream_host: (() => { try { return new URL(m.audio.url).host; } catch { return null; } })(),
  }));
}

router.get('/audio-sources', (req, res) => {
  const rows = audioRegistry(req.baseUrl);
  res.json({
    count: rows.length,
    note: 'Playback goes through /v1/mutoon/{slug}/stream on this API; upstream hosts are listed for attribution only.',
    sources: rows,
  });
});

// The waiting room for found-but-unverified editions: visible to whoever reviews
// them, never advertised as a download in the catalogue.
router.get('/pdf-candidates', (req, res) => {
  const rows = Object.entries(PDF_CANDIDATES).map(([slug, c]) => {
    const m = MUTOON.find((x) => x.slug === slug);
    return {
      slug,
      title_english: m ? m.title_english : null,
      identifier: c.identifier,
      bytes: c.bytes,
      check: c.check,
      review_url: `https://archive.org/details/${c.identifier}`,
      verified: false,
      next_step: 'open the first page and confirm it is the matn itself',
    };
  });
  const usable = rows.filter((r) => r.check === 'pdf-magic-ok').length;
  res.json({
    count: rows.length,
    fetchable: usable,
    note: 'Candidate editions awaiting review. Nothing here is downloadable through this API until it is confirmed and moved into the verified registry.',
    candidates: rows,
  });
});

router.get('/pdf-sources', (req, res) => {
  const rows = MUTOON.filter((m) => MUTOON_PDFS[m.slug]).map((m) => {
    const p = pdfFor(m.slug);
    return {
      slug: m.slug,
      title_english: m.title_english,
      bytes: p.bytes,
      source: p.source,
      source_item: p.source_item,
      licence: p.licence,
      download_url: `${API_BASE}${String(req.baseUrl || '/v1/mutoon').replace(/\/+$/, '')}/${m.slug}/pdf`,
    };
  });
  res.json({
    count: rows.length,
    note: 'Printed editions of the mutoon as downloadable PDFs. Credit the source on download; the archive item states no licence.',
    sources: rows,
  });
});

// The edition as a file: recognised by slug, saved with a readable name, so a
// student can keep the matn offline instead of printing from a viewer.
router.get('/:slug/pdf', async (req, res) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: `Unknown matn: ${req.params.slug}` });
  const p = pdfFor(m.slug);
  if (!p) {
    return res.status(503).json({
      error: 'No PDF for this matn',
      slug: m.slug,
      hint: 'Only the matns published as PDFs in the source collection are available. See /v1/mutoon/pdf-sources.',
    });
  }
  try {
    const { up, err } = await fetchUpstream(p.upstream, req.headers.range, 30000);
    if (err || !up) {
      return res.status(502).json({ error: 'PDF host unavailable', detail: String(err && err.message || 'fetch failed') });
    }
    if (!up.ok && up.status !== 206) {
      return res.status(502).json({ error: 'PDF host unavailable', upstream_status: up.status });
    }
    res.status(up.status === 206 ? 206 : 200);
    res.set('Content-Type', 'application/pdf');
    for (const h of ['content-length', 'content-range']) {
      const v = up.headers.get(h);
      if (v) res.set(h, v);
    }
    res.set('Accept-Ranges', 'bytes');
    const inline = String(req.query.inline || '') === '1';
    res.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${m.slug}.pdf"`);
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (!up.body) return res.end();
    const { Readable } = require('stream');
    Readable.fromWeb(up.body).on('error', () => res.end()).pipe(res);
  } catch (e) {
    res.status(e && e.name === 'AbortError' ? 504 : 502).json({ error: 'PDF fetch failed', detail: String(e && e.message || '') });
  }
});

// Fetching a remote file is the flakiest thing this API does: archive.org
// redirects to a download node that occasionally refuses or resets a connection,
// and a single failure should not read to the user as "this matn has no file".
// Two attempts, a short pause, and the real cause reported instead of a bare 502.
async function fetchUpstream(url, rangeHeader, timeoutMs = 25000, attempts = 2) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {};
      if (rangeHeader) headers.Range = rangeHeader;
      const up = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);
      if ((up.status === 429 || up.status === 503) && i < attempts - 1) {
        lastErr = new Error('upstream busy: ' + up.status);
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      return { up };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return { err: lastErr };
}

// Streams the recording with Range support so a phone can seek without pulling the
// whole file, and keeps the upstream host out of the client's request path.
router.get('/:slug/stream', async (req, res) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: `Unknown matn: ${req.params.slug}` });
  const upstream = m.audio && m.audio.url;
  if (!upstream) {
    return res.status(503).json({
      error: 'Recording not available',
      slug: m.slug,
      hint: 'This matn has no verified recording yet. See /v1/mutoon/audio-sources.',
    });
  }
  try {
    const { up, err } = await fetchUpstream(upstream, req.headers.range);
    if (err || !up) {
      return res.status(502).json({ error: 'Recording host unavailable', detail: String(err && err.message || 'fetch failed') });
    }
    if (!up.ok && up.status !== 206) {
      return res.status(502).json({ error: 'Recording host unavailable', upstream_status: up.status });
    }
    res.status(up.status === 206 ? 206 : 200);
    res.set('Content-Type', up.headers.get('content-type') || 'audio/mpeg');
    for (const h of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const v = up.headers.get(h);
      if (v) res.set(h, v);
    }
    if (!up.headers.get('accept-ranges')) res.set('Accept-Ranges', 'bytes');
    // Named attachment when asked, inline otherwise, so both listening and saving
    // work from the same endpoint.
    const fname = `${m.slug}.mp3`;
    const disp = String(req.query.download || '') === '1' ? 'attachment' : 'inline';
    res.set('Content-Disposition', `${disp}; filename="${fname}"`);
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (!up.body) return res.end();
    const { Readable } = require('stream');
    Readable.fromWeb(up.body).on('error', () => res.end()).pipe(res);
  } catch (e) {
    res.status(e && e.name === 'AbortError' ? 504 : 502).json({ error: 'Recording fetch failed', detail: String(e && e.message || '') });
  }
});

router.get('/:slug', (req, res, next) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return next(); // fall through to the generic 404 handler
  res.json(withAudio(m, req.baseUrl));
});

router.get('/:slug/lines', async (req, res) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: `Unknown matn: ${req.params.slug}`, list_url: '/v1/mutoon' });

  // Curated rows win; the shipped edition is the fallback. Both are gated text.
  const fromRepository = () => {
    const b = bundledMatn(m.slug);
    return b ? { ...b, text_source: 'repository' } : null;
  };
  if (!LINES[m.slug]) {
    try {
      const { rows } = await db.query(
        'SELECT line_number, arabic, translation, transliteration, source FROM mutoon_lines WHERE slug = $1 ORDER BY line_number',
        [m.slug]
      );
      if (rows.length) {
        LINES[m.slug] = {
          source: rows[0].source || null,
          text_source: 'database',
          lines: rows.map((r) => ({ n: r.line_number, arabic: r.arabic, translation: r.translation, transliteration: r.transliteration })),
        };
      }
    } catch (e) {
      // No table yet, or the database is unreachable: neither is a reason to
      // withhold a public-domain text that ships with the code.
      if (String(e.code) !== '42P01' && !String(e.code || '').startsWith('ECONN')) throw e;
    }
    if (!LINES[m.slug]) {
      const b = fromRepository();
      if (b) LINES[m.slug] = b;
    }
  }

  const pack = LINES[m.slug];
  if (!pack || !pack.lines.length) {
    return res.status(409).json({
      error: 'Text not ingested yet',
      slug: m.slug,
      ingested: false,
      hint: 'This matn is catalogued but no edition is loaded: no mutoon_lines rows and no data/mutoon/<slug>.json edition in the repository.',
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
    licence: pack.licence || null,
    text_source: pack.text_source || 'database',
    audio_available: Boolean(AUDIO_BASE),
    lines: pack.lines
      .filter((l) => l.n >= from && l.n <= to)
      .map((l) => ({ ...l, audio_url: AUDIO_BASE ? `${AUDIO_BASE}/${m.slug}/${l.n}.mp3` : null })),
  });
});

router.get('/:slug/audio', (req, res) => {
  const m = MUTOON.find((x) => x.slug === req.params.slug);
  if (!m) return res.status(404).json({ error: `Unknown matn: ${req.params.slug}` });
  if (m.audio && m.audio.url) return res.redirect(302, `${API_BASE}${String(req.baseUrl || '/v1/mutoon').replace(/\/+$/, '')}/${m.slug}/stream`);
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
    return res.redirect(302, `${API_BASE}${String(req.baseUrl || '/v1/mutoon').replace(/\/+$/, '')}/${m.slug}/stream`);
  }
  return res.status(503).json({
    error: 'Audio not configured',
    slug: m.slug,
    hint: 'Set MUTOON_AUDIO_BASE to the bucket root, laid out as {slug}/{line}.mp3, and this endpoint redirects to it.',
  });
});

module.exports = router;
module.exports.LINES = LINES;
