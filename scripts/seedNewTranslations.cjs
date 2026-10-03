// Seed 14 new Quran translations (from quran.com API v4 data) into the DB.
// Usage: DATABASE_URL=... node scripts/seedNewTranslations.cjs
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);
const DATA = path.join(__dirname, '..', 'data');
const RESOURCES = JSON.parse(fs.readFileSync(path.join(DATA, 'translation-resources.json')));

function cleanText(t) {
  return String(t || '')
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // footnotes
    .replace(/<[^>]+>/g, '') // remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  // canonical ayah order: surah 1:1 ... 114:6
  const ayahRows = await sql.query(
    'SELECT id FROM ayahs ORDER BY surah_number, ayah_number'
  );
  const ayahIds = ayahRows.map((r) => r.id);
  console.log(`canonical ayah order loaded: ${ayahIds.length}`);

  for (const r of RESOURCES) {
    const existing = await sql.query('SELECT id FROM translations WHERE code = $1', [r.code]);
    let translationId;
    if (existing.length > 0) {
      translationId = existing[0].id;
      await sql.query('DELETE FROM ayah_translations WHERE translation_id = $1', [translationId]);
      console.log(`${r.code}: exists (id ${translationId}) — replacing texts`);
    } else {
      const ins = await sql.query(
        'INSERT INTO translations (code, language, translator_name, is_simplified) VALUES ($1, $2, $3, false) RETURNING id',
        [r.code, r.language, r.translator]
      );
      translationId = ins[0].id;
      console.log(`${r.code}: created translation row (id ${translationId})`);
    }

    const raw = JSON.parse(fs.readFileSync(path.join(DATA, `tr-${r.id}.json`)));
    if (raw.length !== ayahIds.length) {
      throw new Error(`${r.code}: expected ${ayahIds.length} rows, got ${raw.length}`);
    }

    const rows = raw.map((t, i) => [ayahIds[i], translationId, cleanText(t.text)]);
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = rows.slice(i, i + CHUNK);
      const params = [];
      const tuples = batch.map((row) => {
        const o = params.length;
        params.push(...row);
        return `($${o + 1}::int, $${o + 2}::int, $${o + 3}::text)`;
      });
      await sql.query(
        `INSERT INTO ayah_translations (ayah_id, translation_id, text) VALUES ${tuples.join(',')}`,
        params
      );
    }
    console.log(`  ${r.code}: inserted ${rows.length} ayah texts`);
  }

  const check = await sql.query(
    `SELECT t.code, t.language, count(at.id) AS c
     FROM translations t LEFT JOIN ayah_translations at ON at.translation_id = t.id
     GROUP BY t.code, t.language ORDER BY t.code`
  );
  for (const c of check) console.log(`  ${c.code} (${c.language}): ${c.c} ayahs`);
  console.log('TRANSLATIONS COMPLETE');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
