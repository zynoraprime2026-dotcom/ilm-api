// Fast batched tafsir seeder (HTTPS-only sandboxes). Same source as
// scripts/seedTafsir.cjs. Preloads all ayah ids once (1 query instead of
// one SELECT per ayah), batches the tafsir INSERTs per surah.
require('dotenv').config();
const fetch = require('node-fetch');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const BASE_URL = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir';
const SOURCES = [
  { slug: 'en-tafisr-ibn-kathir', name: 'Ibn Kathir' },
  { slug: 'en-tafsir-maarif-ul-quran', name: 'Maarif-ul-Quran' },
];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadAyahIdMap() {
  const rows = await sql.query('SELECT id, surah_number, ayah_number FROM ayahs');
  const map = {};
  for (const r of rows) map[`${r.surah_number}:${r.ayah_number}`] = r.id;
  return map;
}

async function seedSource(source, ayahIdMap) {
  console.log(`\nFetching tafsir source: ${source.name}...`);
  for (let surahNum = 1; surahNum <= 114; surahNum++) {
    const url = `${BASE_URL}/${source.slug}/${surahNum}.json`;
    const res = await fetch(url);
    if (!res.ok) { continue; }
    const data = await res.json();
    const ayahEntries = data.ayahs || data;

    const rowsToInsert = [];
    for (const entry of ayahEntries) {
      const ayahNumber = entry.ayah ?? entry.numberInSurah ?? entry.aya;
      const text = entry.text ?? entry.tafsir;
      if (!ayahNumber || !text) continue;
      const ayahId = ayahIdMap[`${surahNum}:${ayahNumber}`];
      if (!ayahId) continue;
      rowsToInsert.push([ayahId, source.name, text, source.slug]);
    }

    for (const batch of chunk(rowsToInsert, 100)) {
      const values = [];
      const params = [];
      batch.forEach((row, i) => {
        const o = i * 4;
        values.push(`($${o+1},$${o+2},$${o+3},$${o+4})`);
        params.push(...row);
      });
      if (values.length === 0) continue;
      await sql.query(
        `INSERT INTO tafsir (ayah_id, source, text, source_edition) VALUES ${values.join(',')}`,
        params
      );
    }
    if (surahNum % 20 === 0) console.log(`  ...${source.name}: surah ${surahNum}/114 done`);
  }
  console.log(`${source.name} complete.`);
}

async function seed() {
  const countRow = await sql.query('SELECT COUNT(*) FROM ayahs');
  if (parseInt(countRow[0].count, 10) === 0) {
    console.error('No ayahs found. Run quran seed first.');
    process.exit(1);
  }
  // Clear any existing tafsir rows to avoid duplicates on re-run (original
  // script has no unique constraint / ON CONFLICT on tafsir table).
  await sql.query('DELETE FROM tafsir');
  const ayahIdMap = await loadAyahIdMap();
  for (const source of SOURCES) {
    await seedSource(source, ayahIdMap);
  }
  console.log('Tafsir seed complete (fast/batched).');
}
seed().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
