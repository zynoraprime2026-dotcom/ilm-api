// Populates quranic_roots and ayah_words from the Quranic Arabic Corpus
// morphology dataset (originally corpus.quran.com, forked/cleaned at
// https://github.com/mustafa0x/quran-morphology, GNU licensed).
//
// IMPORTANT — VERIFY BEFORE FULL RUN:
// This file is 6MB+ and GitHub blocks automated raw fetches of it, so its
// exact column layout could not be verified directly while building this
// script. The parser below assumes the well-documented Quranic Arabic Corpus
// format: tab-separated columns of
//   LOCATION  FORM  TAG  FEATURES
// where LOCATION looks like "1:1:1:1" (surah:ayah:word:segment) and FEATURES
// is a pipe-separated list of key:value pairs including ROOT: and LEM:.
//
// Before running this on the full file:
//   1. Download quran-morphology.txt manually from:
//      https://github.com/mustafa0x/quran-morphology/blob/master/quran-morphology.txt
//      (use the "Download raw file" button — GitHub blocks scripted access)
//   2. Place it in this project as data/quran-morphology.txt
//   3. Run `head -50 data/quran-morphology.txt` and compare against the
//      assumptions above — adjust the parsing logic below if the real
//      columns differ.
//
// Run: npm run seed:roots

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

    const ayahResult = await db.query(
      'SELECT id FROM ayahs WHERE surah_number = $1 AND ayah_number = $2',
      [surahNumber, ayahNumber]
    );
    if (ayahResult.rows.length === 0) continue; // run seed:quran first
    const ayahId = ayahResult.rows[0].id;

    if (!rootIdCache[root]) {
      rootIdCache[root] = await getOrCreateRoot(root);
    }

    await db.query(
      `INSERT INTO ayah_words (ayah_id, word_position, text_arabic, root_id, part_of_speech)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ayah_id, word_position) DO UPDATE SET root_id = EXCLUDED.root_id`,
      [ayahId, wordPosition, form, rootIdCache[root], features.POS || null]
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
