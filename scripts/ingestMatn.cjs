// Ingests a matn's lines into mutoon_lines so /v1/mutoon/:slug/lines can serve
// them, and so per-line audio (MUTOON_AUDIO_BASE) has something to index.
//
// Usage:
//   DATABASE_URL=... node scripts/ingestMatn.cjs data/mutoon/al-ajurrumiyyah.json
//   node scripts/ingestMatn.cjs data/mutoon/al-ajurrumiyyah.json --check   # validate only
//
// Every line passes the text-quality gate in src/lib/matnText.js before anything
// is written. OCR noise in a text people memorise is worse than no text, so a
// failing file is refused whole rather than partially imported.
//
// File shape:
//   { "slug": "al-ajurrumiyyah", "source": "edition / licence note",
//     "lines": [ { "n": 1, "arabic": "...", "translation": "...", "transliteration": "..." }, ... ] }
//
// Nothing is invented here: the script only loads text someone supplied.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { MUTOON } = require('../data/mutoon.js');
const { inspectMatn } = require('../src/lib/matnText.js');


(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/ingestMatn.cjs <path-to-json>');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const known = MUTOON.find((m) => m.slug === data.slug);
  if (!known) {
    console.error(`Unknown slug "${data.slug}". Add it to data/mutoon.js first.`);
    process.exit(1);
  }
  if (!Array.isArray(data.lines) || !data.lines.length) {
    console.error('File has no lines.');
    process.exit(1);
  }

  const verdict = inspectMatn(data.lines);
  if (verdict.stats) {
    console.log(
      `${data.slug}: ${verdict.stats.lines} lines, ` +
      `${verdict.stats.arabic_letters} Arabic letters, ` +
      `latin ratio ${verdict.stats.latin_ratio}, ` +
      `diacritic ratio ${verdict.stats.diacritic_ratio}`
    );
  }
  if (!verdict.ok) {
    console.error(`Text quality gate refused this file: ${verdict.problems.length} problem(s).`);
    for (const p of verdict.problems) console.error(`  line ${p.n}: ${p.problem}`);
    if (!process.argv.includes('--force')) {
      console.error('Nothing was written. Fix the source text, or pass --force if you have read the file yourself and accept it.');
      process.exit(1);
    }
    console.error('--force given, importing anyway.');
  }
  if (process.argv.includes('--check')) {
    console.log('Check only, nothing written.');
    process.exit(verdict.ok ? 0 : 1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set, so there is nowhere to write. Use --check to validate a file without a database.');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  await sql`CREATE TABLE IF NOT EXISTS mutoon_lines (
    slug text NOT NULL,
    line_number integer NOT NULL,
    arabic text NOT NULL,
    translation text,
    transliteration text,
    source text,
    PRIMARY KEY (slug, line_number)
  )`;

  await sql`DELETE FROM mutoon_lines WHERE slug = ${data.slug}`;

  await sql`
    INSERT INTO mutoon_lines (slug, line_number, arabic, translation, transliteration, source)
    SELECT ${data.slug}, x.n, x.arabic, x.translation, x.transliteration, ${data.source || null}
      FROM jsonb_to_recordset(${JSON.stringify(data.lines)}::jsonb)
        AS x(n integer, arabic text, translation text, transliteration text)
  `;

  const [{ c }] = await sql`SELECT count(*)::int AS c FROM mutoon_lines WHERE slug = ${data.slug}`;
  console.log(`${data.slug}: ${c} lines ingested${data.source ? ' from ' + data.source : ''}`);
})().catch((e) => { console.error(e); process.exit(1); });
