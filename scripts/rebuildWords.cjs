// Rebuild ayah_words with complete, correct word-by-word data from quran.com,
// merging POS + root grammar from the existing Quranic Arabic Corpus data.
//
// Problems fixed:
//  - old word rows dropped ~27k words (particles/prefixes) and lost prefixes
//    in stored text ("بِسْمِ" stored as "سْمِ")
//  - translation/transliteration were 100% NULL
//
// Usage: DATABASE_URL=... node scripts/rebuildWords.cjs
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);
const WORDS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'qurancom-words.json')));

// Strip Arabic diacritics for fuzzy alignment (ends-with matching)
function norm(s) {
  return String(s || '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g, '')
    .trim();
}

(async () => {
  console.log(`new words from quran.com: ${WORDS.length}`);

  // 1. add audio_url column
  await sql.query('ALTER TABLE ayah_words ADD COLUMN IF NOT EXISTS audio_url TEXT');

  // 2. ayah map
  const ayahRows = await sql.query('SELECT id, surah_number, ayah_number FROM ayahs');
  const ayahId = new Map(ayahRows.map((a) => [`${a.surah_number}:${a.ayah_number}`, a.id]));
  console.log(`ayah map: ${ayahId.size}`);

  // 3. old corpus segments for grammar merge
  const oldRows = await sql.query(
    'SELECT w.ayah_id, w.word_position, w.text_arabic, w.part_of_speech, w.root_id FROM ayah_words w ORDER BY w.ayah_id, w.word_position'
  );
  const oldByAyah = new Map();
  for (const r of oldRows) {
    if (!oldByAyah.has(r.ayah_id)) oldByAyah.set(r.ayah_id, []);
    oldByAyah.get(r.ayah_id).push(r);
  }
  console.log(`old segments loaded: ${oldRows.length} across ${oldByAyah.size} ayahs`);

  // 4. build new rows with grammar merge (grouped by verse)
  const byVerse = new Map();
  for (const w of WORDS) {
    if (!byVerse.has(w.verse_key)) byVerse.set(w.verse_key, []);
    byVerse.get(w.verse_key).push(w);
  }

  const rows = [];
  let matchedPos = 0;
  let matchedRoot = 0;
  let noAyah = 0;

  for (const [verseKey, words] of byVerse) {
    const id = ayahId.get(verseKey);
    if (!id) { noAyah += words.length; continue; }
    const oldSegs = oldByAyah.get(id) || [];
    let oldIdx = 0;
    for (const w of words) {
      let pos = null;
      let rootId = null;
      const normText = norm(w.text);
      for (let j = oldIdx; j < oldSegs.length; j += 1) {
        const seg = norm(oldSegs[j].text_arabic);
        if (seg && normText.endsWith(seg)) {
          pos = oldSegs[j].part_of_speech;
          rootId = oldSegs[j].root_id;
          oldIdx = j + 1;
          break;
        }
      }
      if (pos) matchedPos += 1;
      if (rootId) matchedRoot += 1;
      rows.push([id, w.position, w.text, w.translit, w.trans, pos, rootId, w.audio]);
    }
  }
  const pct = (n) => `${n} (${Math.round((n / rows.length) * 100)}%)`;
  console.log(`rows built: ${rows.length} | pos matched: ${pct(matchedPos)} | root matched: ${pct(matchedRoot)} | without ayah: ${noAyah}`);

  // 5. replace data
  await sql.query('DELETE FROM ayah_words');
  console.log('old rows deleted');

  // 6. batch insert
  const CHUNK = 400;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const params = [];
    const tuples = batch.map((r) => {
      const o = params.length;
      params.push(...r);
      return `($${o + 1}::int, $${o + 2}::int, $${o + 3}::text, $${o + 4}::text, $${o + 5}::text, $${o + 6}::text, $${o + 7}::int, $${o + 8}::text)`;
    });
    await sql.query(
      `INSERT INTO ayah_words (ayah_id, word_position, text_arabic, transliteration, translation, part_of_speech, root_id, audio_url)
       VALUES ${tuples.join(',')}`,
      params
    );
    done += batch.length;
    if (done % 8000 === 0 || done === rows.length) console.log(`  inserted ${done}/${rows.length}`);
  }

  // 7. verify
  const check = await sql.query(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE translation IS NOT NULL) AS with_trans,
            count(*) FILTER (WHERE transliteration IS NOT NULL) AS with_translit,
            count(*) FILTER (WHERE part_of_speech IS NOT NULL) AS with_pos,
            count(*) FILTER (WHERE root_id IS NOT NULL) AS with_root,
            count(DISTINCT ayah_id) AS ayahs
     FROM ayah_words`
  );
  console.log('VERIFY:', JSON.stringify(check[0]));
  console.log('REBUILD COMPLETE');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
