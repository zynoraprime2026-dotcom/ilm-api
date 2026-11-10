// Media the app plays, proxied so a client never reaches a third-party CDN.
//
// Why: the web app must not hand a learner's browser to audio.qurancdn.com,
// cdn.mp3quran.net or islamcan.com. Those hosts are fine as upstreams, but they
// put the bytes (and the learner's IP) outside our own delivery, they cannot be
// cached by us, and a browser ignores a download attribute on a cross-origin
// clip so saving silently fails. Everything here is bytes-out only, so the app
// keeps a single origin for audio and offline caching actually works.
const express = require('express');
const { Readable } = require('stream');

const router = express.Router();

const WORD_AUDIO_BASE = 'https://audio.qurancdn.com/wbw/';
const ADHAN_SOURCE = 'https://www.islamcan.com/audio/adhan/azan1.mp3';
// Full-surah recitations, keyed the way the app names them. Anyayah-style files
// are not the only way a reciter publishes: these are one file per surah.
const FULL_SURAH = {
  islam_sobhi: { name: 'Islam Sobhi', base: 'https://cdn.mp3quran.net/audio/islam-sobhi/r1/' },
};
// 001_001_001.mp3 — surah, ayah, word position. Anything else is refused rather
// than passed upstream, so this route cannot be used as an open proxy.
const WORD_FILE = /^\d{3}_\d{3}_\d{3}\.mp3$/;

const pad3 = (v) => String(v).padStart(3, '0');

async function proxyBytes(req, res, upstream, { filename, attempts = 2 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const headers = {};
      if (req.headers.range) headers.Range = req.headers.range;
      const up = await fetch(upstream, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (!up.ok && up.status !== 206) {
        lastErr = new Error('upstream ' + up.status);
        if (attempt < attempts - 1) continue;
        return res.status(502).json({ error: 'Media host unavailable', upstream_status: up.status });
      }
      res.status(up.status === 206 ? 206 : 200);
      res.set('Content-Type', up.headers.get('content-type') || 'audio/mpeg');
      for (const h of ['content-length', 'content-range']) {
        const v = up.headers.get(h);
        if (v) res.set(h, v);
      }
      res.set('Accept-Ranges', 'bytes');
      if (filename) {
        const disp = req.query.download === '1' ? 'attachment' : 'inline';
        res.set('Content-Disposition', `${disp}; filename="${filename}"`);
      }
      res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
      if (!up.body) return res.end();
      Readable.fromWeb(up.body).on('error', () => res.end()).pipe(res);
      return;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
    }
  }
  res.status(502).json({ error: 'Media fetch failed', detail: String((lastErr && lastErr.message) || '') });
}

// One word's recording, ~45 KB. The file name travels with the word because the
// numbering is not strictly positional.
router.get('/word-audio/:file', (req, res) => {
  const file = String(req.params.file || '');
  if (!WORD_FILE.test(file)) {
    return res.status(400).json({ error: 'Expected a word clip name like 001_001_001.mp3' });
  }
  proxyBytes(req, res, WORD_AUDIO_BASE + file, { filename: file });
});

// A whole surah in one file, for reciters who publish that way.
router.get('/surah-audio/:surah', (req, res) => {
  const surah = parseInt(req.params.surah, 10);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
    return res.status(400).json({ error: 'Surah must be 1-114' });
  }
  const key = String(req.query.reciter || 'islam_sobhi').toLowerCase();
  const reciter = FULL_SURAH[key];
  if (!reciter) {
    return res.status(404).json({
      error: `No full-surah recording for "${req.query.reciter}". Available: ${Object.keys(FULL_SURAH).join(', ')}. For per-ayah audio use /v1/quran/:surah/:ayah/audio.`,
    });
  }
  proxyBytes(req, res, `${reciter.base}${pad3(surah)}.mp3`, { filename: `${pad3(surah)}-${key}.mp3` });
});

// The adhan the salat alarm plays.
router.get('/adhan.mp3', (req, res) => proxyBytes(req, res, ADHAN_SOURCE, { filename: 'adhan.mp3' }));
router.get('/adhan', (req, res) => proxyBytes(req, res, ADHAN_SOURCE, { filename: 'adhan.mp3' }));

module.exports = router;
