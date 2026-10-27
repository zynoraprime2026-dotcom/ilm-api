// GET /v1/hadith-audio/... — the best available voice for a hadith.
//
// Recorded Arabic recitations exist for the major collections (served by
// hadith.to); hadiths with no matching recording fall back to the app's
// Arabic TTS. Because edition numbering drifts between datasets, a
// recording is only served when its own Arabic text matches OUR hadith
// text — never a wrong-numbered recitation.
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Ilm collection slug -> hadith.to collection id (collections with recordings)
const RECORDED = {
  bukhari: 'bukhari',
  muslim: 'muslim',
  nasai: 'nasai',
  abudawud: 'abudawud',
  tirmidhi: 'tirmidhi',
  ibnmajah: 'ibnmajah',
  malik: 'malik',
  ahmed: 'musnad-ahmad',
  riyad: 'riyad',
  nawawi40: 'nawawi40',
  qudsi40: 'qudsi40',
  dehlawi40: 'shahwaliullah40',
};

const norm = (s) => String(s || '')
  .replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, '')          // harakat / tatweel
  .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')   // bidi & zero-width marks
  .replace(/[^\u0621-\u064A\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// hadith.to keeps matn-only text (chains trimmed mid-word), which is usually
// a substring of our full text; compare on the inner words so seam fragments
// don't fail the match.
function textsMatch(ours, theirs) {
  const a = norm(ours);
  const b = norm(theirs);
  if (!a || !b) return false;
  if (a === b) return true;
  const core = (t) => { const w = t.split(' '); return w.length > 2 ? w.slice(1, -1).join(' ') : t; };
  const ac = core(a);
  const bc = core(b);
  if (bc.length >= 12 && a.includes(bc)) return true;
  if (ac.length >= 12 && b.includes(ac)) return true;
  // short texts: >= 70% shared words
  const aw = new Set(a.split(' '));
  const bw = b.split(' ');
  let hit = 0;
  for (const w of bw) if (aw.has(w)) hit++;
  return bw.length >= 3 && hit / bw.length >= 0.7;
}

const RES_CACHE = new Map(); // "slug:number" -> resolution
const RES_MAX = 2000;

async function resolve(collection, number) {
  const key = collection + ':' + number;
  if (RES_CACHE.has(key)) return RES_CACHE.get(key);
  let out = { recorded: false };
  const ext = RECORDED[collection];
  const n = parseInt(String(number).replace(/[^0-9]/g, ''), 10);
  if (ext && n > 0) {
    let mine = null;
    try {
      const q = await db.query(
        `SELECT h.text_arabic FROM hadiths h
         JOIN hadith_collections c ON c.id = h.collection_id
         WHERE c.slug = $1 AND h.hadith_number = $2`,
        [collection, String(number)]
      );
      mine = q.rows[0] ? q.rows[0].text_arabic : null;
    } catch (e) { /* DB hiccup -> TTS fallback */ }
    if (mine) {
      // content-mapped record numbers first (riyad/malik editions order their
      // hadiths completely differently), then raw + neighbouring numbers
      const mapped = RECORD_MAPS[collection] && RECORD_MAPS[collection][String(number)];
      const mappedN = mapped ? parseInt(mapped, 10) : null;
      const cands = [mappedN, mappedN - 1, mappedN + 1, n, n - 1, n + 1];
      for (const c of [...new Set(cands)].filter((x) => x > 0)) {
        try {
          const r = await fetch(`https://api.hadith.to/v1/hadith/${ext}/${c}`, {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' },
          });
          if (!r.ok) continue;
          const d = await r.json();
          if (!d || !d.media || !d.media.available || !d.media.audio || !d.arabic) continue;
          if (!textsMatch(mine, d.arabic)) continue; // wrong record — never play it
          out = { recorded: true, audio: d.media.audio };
          break;
        } catch (e) { /* try next candidate */ }
      }
    }
  }
  RES_CACHE.set(key, out);
  if (RES_CACHE.size > RES_MAX) RES_CACHE.delete(RES_CACHE.keys().next().value);
  return out;
}

// the clip itself, proxied (the recitation CDN has no CORS) — the app caches
// this response in Cache Storage for offline replay. Registered BEFORE the
// resolution route so ":number.mp3" does not swallow into ":number".
router.get('/:collection/:number.mp3', async (req, res) => {
  const collection = String(req.params.collection || '').replace(/[^a-z0-9-]/gi, '');
  const number = decodeURIComponent(String(req.params.number || '')).slice(0, 40);
  if (!collection || !number) return res.status(400).json({ error: 'collection and number are required' });
  let r;
  try { r = await resolve(collection, number); } catch (e) { r = { recorded: false }; }
  if (!r.recorded) return res.status(404).json({ error: 'No recording for this hadith' });
  try {
    const up = await fetch(r.audio, {
      signal: AbortSignal.timeout(25000),
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' },
    });
    if (!up.ok) return res.status(502).json({ error: 'Recording unavailable' });
    const buf = Buffer.from(await up.arrayBuffer());
    if (!buf || buf.length < 1000) return res.status(502).json({ error: 'Recording unavailable' });
    res.set('Content-Type', up.headers.get('content-type') || 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=604800');
    return res.send(buf);
  } catch (e) {
    return res.status(502).json({ error: 'Recording unavailable' });
  }
});

// resolution — the app asks which voice reads this hadith before playing
router.get('/:collection/:number', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  const collection = String(req.params.collection || '').replace(/[^a-z0-9-]/gi, '');
  const number = decodeURIComponent(String(req.params.number || '')).slice(0, 40);
  if (!collection || !number) return res.status(400).json({ error: 'collection and number are required' });
  try {
    const r = await resolve(collection, number);
    const dbg = { mapLoaded: Object.keys(RECORD_MAPS).length, mapped: (RECORD_MAPS[collection] || {})[String(number)] || null };
    return res.json(Object.assign(r.recorded
      ? { recorded: true, clip: `/v1/hadith-audio/${collection}/${encodeURIComponent(number)}.mp3`, voice: 'recorded recitation' }
      : { recorded: false, tts: true, voice: 'arabic tts' }, dbg));
  } catch (e) {
    return res.json({ recorded: false, tts: true, voice: 'arabic tts' });
  }
});

module.exports = router;
