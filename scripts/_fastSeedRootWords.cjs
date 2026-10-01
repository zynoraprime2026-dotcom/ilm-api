// Fast batched morphology seeder (HTTPS-only sandboxes). Same parsing logic
// as scripts/seedRootWords.cjs (format verified 2026-10-01) but batches all
// inserts: 1 query for ayah ids, ~250 for roots/words instead of ~100k.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const DATA_FILE = path.join(__dirname, '..', 'data', 'quran-morphology.txt');

function parseFeatures(featureStr) {
  const features = {};
  for (const part of featureStr.split('|')) {
    const [key, value] = part.split(':');
    if (key && value) features[key.trim()] = value.trim();
  }
  return features;
}
function posLabel(tag, featureStr) {
  const caseMatch = featureStr.match(/\b(NOM|ACC|GEN)\b/);
  return caseMatch ? `${tag} (${caseMatch[1]})` : tag;
}
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seed() {
  console.log('Loading ayah ids...');
  const ayahRows = await sql.query('SELECT id, surah_number, ayah_number FROM ayahs');
  const ayahIdMap = {};
  for (const r of ayahRows) ayahIdMap[`${r.surah_number}:${r.ayah_number}`] = r.id;

  console.log('Parsing morphology file...');
  const lines = fs.readFileSync(DATA_FILE, 'utf8').split('\n');
  const rootCounts = {};
  const words = [];
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('LOCATION')) continue;
    const columns = line.split('\t');
    if (columns.length < 4) continue;
    const [location, form, tag, featureStr] = columns;
    const m = location.match(/\(?(\d+):(\d+):(\d+):(\d+)\)?/);
    if (!m) continue;
    const surah = parseInt(m[1], 10), ayah = parseInt(m[2], 10), pos = parseInt(m[3], 10);
    if (tag !== 'STEM' && !featureStr.includes('ROOT:')) continue;
    const features = parseFeatures(featureStr || '');
    const root = features.ROOT;
    if (!root) continue;
    const ayahId = ayahIdMap[`${surah}:${ayah}`];
    if (!ayahId) continue;
    rootCounts[root] = (rootCounts[root] || 0) + 1;
    // A few words carry multiple STEM segments; one-at-a-time inserts let the
    // last one win via ON CONFLICT DO UPDATE. Batched inserts forbid touching
    // the same row twice, so keep only the last entry per word position.
    words.push([ayahId, pos, form, root, posLabel(tag, featureStr || '')]);
  }
  console.log(`Parsed ${words.length} words across ${Object.keys(rootCounts).length} unique roots.`);

  console.log('Replacing quranic_roots (batched)...');
  await sql.query('DELETE FROM ayah_words');
  await sql.query('DELETE FROM quranic_roots');
  const roots = Object.keys(rootCounts);
  const rootIdMap = {};
  for (const batch of chunk(roots, 200)) {
    const values = [], params = [];
    batch.forEach((root, i) => {
      const o = i * 2;
      values.push(`($${o+1},$${o+2})`);
      params.push(root, rootCounts[root]);
    });
    const rows = await sql.query(
      `INSERT INTO quranic_roots (root_arabic, occurrence_count) VALUES ${values.join(',')} RETURNING id, root_arabic`,
      params
    );
    for (const r of rows) rootIdMap[r.root_arabic] = r.id;
  }

  const dedup = {};
  for (const w of words) dedup[`${w[0]}:${w[1]}`] = w;
  const uniqueWords = Object.values(dedup);
  console.log(`Deduped to ${uniqueWords.length} unique word positions (from ${words.length}).`);

  console.log('Inserting ayah_words (batched)...');
  for (const batch of chunk(uniqueWords, 200)) {
    const values = [], params = [];
    batch.forEach((w, i) => {
      const o = i * 5;
      values.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5})`);
      params.push(w[0], w[1], w[2], rootIdMap[w[3]], w[4]);
    });
    await sql.query(
      `INSERT INTO ayah_words (ayah_id, word_position, text_arabic, root_id, part_of_speech)
       VALUES ${values.join(',')}
       ON CONFLICT (ayah_id, word_position) DO UPDATE SET root_id = EXCLUDED.root_id`,
      params
    );
  }
  console.log(`\nRoot/morphology seed complete! ${uniqueWords.length} words across ${roots.length} roots.`);
}
seed().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
