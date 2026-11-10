// Matn text that ships with the code, for when the database has none.
//
// Why this exists: /v1/mutoon/:slug/lines answered 409 "not ingested yet" for
// every matn, so the study feature was dead in practice even though the texts
// are public domain and do not change. A classical matn is immutable content, so
// it belongs in the repository next to the catalogue rather than waiting on a
// database write nobody could run.
//
// Order of truth: rows in mutoon_lines win (someone curated them), then a file
// here. Every file is put through the same text-quality gate as an ingest, so a
// corrupt edition cannot reach a learner by this quieter path.
const fs = require('fs');
const path = require('path');
const { inspectMatn } = require('./matnText');

const DIR = path.join(__dirname, '../../data/mutoon');
const cache = new Map();

function loadFile(slug) {
  const file = path.join(DIR, slug + '.json');
  if (!fs.existsSync(file)) return null;
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error('bundledMatn: ' + slug + ' is not readable JSON: ' + e.message);
    return null;
  }
  const check = inspectMatn(raw.lines || []);
  if (!check.ok) {
    console.error('bundledMatn: ' + slug + ' refused by the text-quality gate: ' + JSON.stringify(check.problems.slice(0, 3)));
    return null;
  }
  return {
    source: raw.source || null,
    licence: raw.licence || null,
    origin: 'repository',
    lines: raw.lines.map((l, i) => ({
      n: Number(l.n) || i + 1,
      arabic: l.arabic,
      translation: l.translation || null,
      transliteration: l.transliteration || null,
    })),
  };
}

function bundledMatn(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const pack = loadFile(slug);
  cache.set(slug, pack);
  return pack;
}

// Slugs that can be served without a database, discovered once at load.
const BUNDLED_SLUGS = (() => {
  try {
    return new Set(fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
  } catch (e) {
    return new Set();
  }
})();

module.exports = { bundledMatn, BUNDLED_SLUGS };
