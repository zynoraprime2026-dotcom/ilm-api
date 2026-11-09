// The upstream edition (fawazahmed0/hadith-api) ships 375 placeholder records with
// no Arabic, no English, no grade and book 0 — where a narration simply is not.
// They are hidden from browse and audio already; this removes them for good so
// totals match reality.
//
// Destructive, so it prints what it would delete and does nothing without --apply.
//   node scripts/purgeEmptyHadiths.cjs            # dry run
//   node scripts/purgeEmptyHadiths.cjs --apply    # delete
require('dotenv').config();
const db = require('../src/config/db');

const EMPTY = `(COALESCE(text_arabic,'') = '' AND COALESCE(text_english,'') = '')`;

async function main() {
  const apply = process.argv.includes('--apply');
  const byCollection = await db.query(
    `SELECT c.slug, COUNT(*)::int AS n
       FROM hadiths h JOIN hadith_collections c ON c.id = h.collection_id
      WHERE ${EMPTY}
      GROUP BY c.slug ORDER BY c.slug`
  );
  const total = byCollection.rows.reduce((n, r) => n + r.n, 0);
  console.log(apply ? 'Deleting' : 'Would delete', total, 'empty placeholder records:');
  byCollection.rows.forEach((r) => console.log('  ' + r.slug.padEnd(12), r.n));

  // reassure: none of these have any text or grade worth keeping
  const sample = await db.query(
    `SELECT h.hadith_number, h.book_number, h.grade
       FROM hadiths h JOIN hadith_collections c ON c.id = h.collection_id
      WHERE ${EMPTY} ORDER BY h.id LIMIT 5`
  );
  console.log('sample:', sample.rows.map((r) => `${r.hadith_number} (book ${r.book_number}, grade ${r.grade || 'none'})`).join(', '));

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to delete.');
    process.exit(0);
  }
  const del = await db.query(`DELETE FROM hadiths WHERE ${EMPTY}`);
  console.log('deleted rows:', del.rowCount);
  const after = await db.query(
    `SELECT c.slug, COUNT(*)::int AS n FROM hadiths h JOIN hadith_collections c ON c.id=h.collection_id GROUP BY c.slug ORDER BY c.slug`
  );
  console.log('totals now:', after.rows.map((r) => `${r.slug} ${r.n}`).join(', '));
  process.exit(0);
}

main().catch((e) => { console.error('purge failed:', e.message); process.exit(1); });
