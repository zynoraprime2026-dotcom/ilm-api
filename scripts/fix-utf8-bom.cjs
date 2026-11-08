// Strips stray UTF-8 byte-order marks (U+FEFF) that the upstream Quran and
// hadith feeds sometimes prepend to Arabic text. Al-Fatihah 1:1 was the visible
// casualty: the verse every recitation opens with rendered an invisible extra
// character. Idempotent; safe to re-run. Requires DATABASE_URL.
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const BOM = "chr(65279)";

const TARGETS = [
  ['ayahs', 'text_arabic'],
  ['hadiths', 'text_arabic'],
  ['duas', 'text_arabic'],
  ['tafsir', 'text'],
];

(async () => {
  for (const [table, column] of TARGETS) {
    try {
      const rows = await sql.query(
        `UPDATE ${table}
            SET ${column} = regexp_replace(${column}, '^' || ${BOM} || '+', '')
          WHERE ${column} LIKE ${BOM} || '%'
          RETURNING 1`
      );
      console.log(`${table}.${column}: cleaned ${rows.length} row(s)`);
    } catch (e) {
      console.log(`${table}.${column}: skipped (${String(e.message || e).slice(0, 70)})`);
    }
  }
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
