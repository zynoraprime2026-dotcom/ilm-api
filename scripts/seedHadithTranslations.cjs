// Seeds community-language hadith translations from the fawazahmed0/hadith-api
// editions into hadith_translations. Matched against hadiths by
// (collection, hadith_number), same convention as the original seed.
//
// Local:   node scripts/seedHadithTranslations.cjs
// Neon:    DATABASE_URL=<neon-url> node scripts/seedHadithTranslations.cjs
// One or more language codes can be passed as args: node ... ben urd
require('dotenv').config();

// Connection layer: Neon serverless driver (HTTPS) for neon.tech URLs,
// plain pg for local Postgres.
const db = (() => {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('neon.tech')) {
    const { Pool: NeonPool } = require('@neondatabase/serverless');
    const pool = new NeonPool({ connectionString: url });
    return { query: (t, p) => pool.query(t, p) };
  }
  const { Pool: PgPool } = require('pg');
  const pool = new PgPool({ connectionString: url });
  return { query: (t, p) => pool.query(t, p) };
})();

const fetch = require('node-fetch');
const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

const LANGUAGES = {
  ben: 'Bengali',
  fra: 'French',
  ind: 'Indonesian',
  rus: 'Russian',
  tur: 'Turkish',
  urd: 'Urdu',
  tam: 'Tamil',
};

// Which languages each collection has editions for (from the editions index).
const AVAILABILITY = {
  bukhari:   ['ben', 'fra', 'ind', 'rus', 'tur', 'urd', 'tam'],
  muslim:    ['ben', 'fra', 'ind', 'rus', 'tur', 'urd', 'tam'],
  abudawud:  ['ben', 'fra', 'ind', 'rus', 'tur', 'urd'],
  tirmidhi:  ['ben', 'ind', 'tur', 'urd'],
  nasai:     ['ben', 'fra', 'ind', 'tur', 'urd'],
  ibnmajah:  ['ben', 'fra', 'ind', 'rus', 'tur', 'urd'],
};

const ONLY = process.argv.slice(2).filter((a) => LANGUAGES[a]);
const wanted = ONLY.length ? ONLY : Object.keys(LANGUAGES);

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hadith_translations (
      id SERIAL PRIMARY KEY,
      hadith_id INTEGER NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(hadith_id, language)
    )`);
  await db.query('CREATE INDEX IF NOT EXISTS idx_hadith_translations_lang ON hadith_translations(language)');
}

async function fetchEdition(editionCode) {
  const res = await fetch(`${BASE_URL}/${editionCode}.json`);
  if (!res.ok) throw new Error(`${editionCode}: HTTP ${res.status}`);
  const data = await res.json();
  return data.hadiths || [];
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedLanguage(lang) {
  console.log(`\n=== ${lang} (${LANGUAGES[lang]}) ===`);
  let totalInserted = 0;

  for (const [slug, langs] of Object.entries(AVAILABILITY)) {
    if (!langs.includes(lang)) continue;

    // Existing (hadith_id, language) pairs to skip — idempotent reruns.
    const hadithRows = await db.query(
      `SELECT h.id, h.hadith_number FROM hadiths h
       JOIN hadith_collections c ON c.id = h.collection_id
       WHERE c.slug = $1`, [slug]);
    const idByNumber = new Map(hadithRows.rows.map((r) => [String(r.hadith_number), r.id]));
    if (idByNumber.size === 0) { console.warn(`  no hadiths for ${slug}`); continue; }

    const existing = await db.query(
      `SELECT ht.hadith_id FROM hadith_translations ht
       JOIN hadiths h ON h.id = ht.hadith_id
       JOIN hadith_collections c ON c.id = h.collection_id
       WHERE ht.language = $1 AND c.slug = $2`, [lang, slug]);
    const already = new Set(existing.rows.map((r) => r.hadith_id));

    let hadithList;
    try {
      hadithList = await fetchEdition(`${lang}-${slug}`);
    } catch (e) {
      console.warn(`  ${slug}: edition not available (${e.message}) — skipped`);
      continue;
    }
    const rows = [];
    for (const h of hadithList) {
      const text = (h.text || '').trim();
      if (!text) continue;
      const hid = idByNumber.get(String(h.hadithnumber));
      if (!hid || already.has(hid)) continue;
      rows.push({ hid, text });
    }
    if (rows.length === 0) { console.log(`  ${slug}: nothing to insert`); continue; }

    for (const batch of chunk(rows, 200)) {
      const values = [], params = [];
      batch.forEach((r, i) => {
        const o = i * 3;
        values.push(`($${o + 1}::int, $${o + 2}::text, $${o + 3}::text)`);
        params.push(r.hid, lang, r.text);
      });
      await db.query(
        `INSERT INTO hadith_translations (hadith_id, language, text)
         VALUES ${values.join(',')}
         ON CONFLICT (hadith_id, language) DO NOTHING`,
        params
      );
    }
    totalInserted += rows.length;
    console.log(`  ${slug}: ${rows.length} translations inserted`);
  }
  console.log(`${lang} total inserted: ${totalInserted}`);
}

async function run() {
  await ensureTable();
  for (const lang of wanted) {
    await seedLanguage(lang);
  }
  const summary = await db.query(
    'SELECT language, count(*) c FROM hadith_translations GROUP BY language ORDER BY c DESC');
  console.log('\nFinal counts:');
  summary.rows.forEach((r) => console.log(`  ${r.language}: ${r.c}`));
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
