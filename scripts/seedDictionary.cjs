// Seed the dictionary module from scripts/dictionary/dictionary.jsonl.
// Usage: DATABASE_URL=... node scripts/seedDictionary.cjs
// Works locally with pg and on Neon via the serverless driver shim.

let sql;
(async () => {
  const db = require('../src/config/db');
  sql = db;

  const fs = require('fs');
  const path = require('path');

  const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g;
  const strip = (t) => String(t || '').replace(DIACRITICS, '');

  const file = path.join(__dirname, 'dictionary', 'dictionary.jsonl');
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  console.log(`Loaded ${lines.length} dictionary lines`);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS dictionary_words (
      id          SERIAL PRIMARY KEY,
      word        TEXT NOT NULL,
      word_plain  TEXT NOT NULL,
      root        TEXT,
      pos         TEXT,
      gloss_en    TEXT,
      source      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_dict_word_plain ON dictionary_words (word_plain)`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_dict_root ON dictionary_words (root)`);

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < lines.length; i += BATCH) {
    const chunk = lines.slice(i, i + BATCH);
    const params = [];
    const values = chunk.map((line) => {
      let d;
      try { d = JSON.parse(line); } catch { return null; }
      if (!d.gloss_en) return null;
      params.push(
        (d.word || '').trim(),
        strip(d.word || ''),
        d.root ? strip(d.root).replace(/-/g,'').split('').join('-') : null,
        d.pos || null,
        d.gloss_en,
        d.source || null
      );
      return `($${params.length - 5}, $${params.length - 4}, $${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length})`;
    }).filter(Boolean);
    if (!values.length) continue;
    await sql.query(
      `INSERT INTO dictionary_words (word, word_plain, root, pos, gloss_en, source)
       VALUES ${values.join(', ')}`,
      params
    );
    inserted += values.length;
    if ((i / BATCH) % 10 === 0) console.log(`  ${inserted} rows...`);
  }
  console.log(`DONE: ${inserted} dictionary words inserted`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
