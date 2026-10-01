// Populates quranic_roots and ayah_words from the Quranic Arabic Corpus
// morphology dataset (originally corpus.quran.com, forked/cleaned at
// https://github.com/mustafa0x/quran-morphology, GNU licensed).
//
// FORMAT VERIFIED (2026-10-01) against data/quran-morphology.txt
// (6,322,866 bytes, 130,030 lines, now committed in this repo).
// Layout: tab-separated  LOCATION  FORM  TAG  FEATURES
//   LOCATION  "surah:ayah:word:segment"  e.g. 1:1:1:2
//   TAG       part-of-speech code (N, V, P, PN, ADJ, DEM, REL, ...)
//   FEATURES  pipe-separated key:value pairs (ROOT:سمو|LEM:اسْم|M|GEN)
// Case (NOM/ACC/GEN) appears as a bare token in FEATURES, not as POS:.
//
// Run: npm run seed:roots
// (requires seed:quran to have run first — ayah ids must exist)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const db = require('../src/config/db');

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
  // Corpus grammar case appears as a bare token (NOM/ACC/GEN) in FEATURES.
  const caseMatch = featureStr.match(/\b(NOM|ACC|GEN)\b/);
  return caseMatch ? `${tag} (${caseMatch[1]})` : tag;
}

async function getOrCreateRoot(rootArabic) {
  const existing = await db.query('SELECT id FROM quranic_roots WHERE root_arabic = $1', [rootArabic]);
  if (existing.rows.length > 0) {
    await db.query('UPDATE quranic_roots SET occurrence_count = occurrence_count + 1 WHERE id = $1', [existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const result = await db.query(
    `INSERT INTO quranic_roots (root_arabic, occurrence_count) VALUES ($1, 1) RETURNING id`,
    [rootArabic]
  );
  return result.rows[0].id;
}

async function seed() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file not found at ${DATA_FILE}`);
    console.error('Download it manually first — see the comment block at the top of this script.');
    process.exit(1);
  }

  const rootIdCache = {};
  const ayahIdCache = {}; // ~6,236 ayahs instead of ~100k lookups
  let lineCount = 0;
  let insertedWords = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(DATA_FILE),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineCount++;
    if (!line || line.startsWith('#') || line.startsWith('LOCATION')) continue; // skip headers/comments

    const columns = line.split('\t');
    if (columns.length < 4) continue;

    const [location, form, tag, featureStr] = columns;
    const locationMatch = location.match(/\(?(\d+):(\d+):(\d+):(\d+)\)?/);
    if (!locationMatch) continue;

    const surahNumber = parseInt(locationMatch[1], 10);
    const ayahNumber = parseInt(locationMatch[2], 10);
    const wordPosition = parseInt(locationMatch[3], 10);

    // Only process STEM segments — prefixes/suffixes don't carry root info
    if (tag !== 'STEM' && !featureStr.includes('ROOT:')) continue;

    const features = parseFeatures(featureStr || '');
    const root = features.ROOT;
    if (!root) continue;

    const ayahKey = `${surahNumber}:${ayahNumber}`;
    let ayahId = ayahIdCache[ayahKey];
    if (ayahId === undefined) {
      const ayahResult = await db.query(
        'SELECT id FROM ayahs WHERE surah_number = $1 AND ayah_number = $2',
        [surahNumber, ayahNumber]
      );
      if (ayahResult.rows.length === 0) continue; // run seed:quran first
      ayahId = ayahIdCache[ayahKey] = ayahResult.rows[0].id;
    }

    if (!rootIdCache[root]) {
      rootIdCache[root] = await getOrCreateRoot(root);
    }

    await db.query(
      `INSERT INTO ayah_words (ayah_id, word_position, text_arabic, root_id, part_of_speech)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ayah_id, word_position) DO UPDATE SET root_id = EXCLUDED.root_id`,
      [ayahId, wordPosition, form, rootIdCache[root], posLabel(tag, featureStr || '')]
    );
    insertedWords++;

    if (lineCount % 5000 === 0) console.log(`  ...processed ${lineCount} lines, ${insertedWords} words with roots inserted`);
  }

  console.log(`\nRoot/morphology seed complete! ${insertedWords} words inserted across ${Object.keys(rootIdCache).length} unique roots.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
