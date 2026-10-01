// Fills hadiths.text_arabic from the fawazahmed0/hadith-api Arabic editions.
// Uses UPDATE ... FROM (VALUES ...) so Arabic-only numbering variants are
// simply skipped instead of trying to INSERT rows lacking English text.
require('dotenv').config();
const fetch = require('node-fetch');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const COLLECTIONS = [
  { slug: 'bukhari', editionCode: 'ara-bukhari' },
  { slug: 'muslim', editionCode: 'ara-muslim' },
  { slug: 'abudawud', editionCode: 'ara-abudawud' },
  { slug: 'tirmidhi', editionCode: 'ara-tirmidhi' },
  { slug: 'nasai', editionCode: 'ara-nasai' },
  { slug: 'ibnmajah', editionCode: 'ara-ibnmajah' },
];
const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedArabic({ slug, editionCode }) {
  console.log(`Fetching ${editionCode}...`);
  const res = await fetch(`${BASE_URL}/${editionCode}.json`);
  if (!res.ok) { console.warn(`  skip ${slug} (${res.status})`); return; }
  const data = await res.json();
  const hadithList = data.hadiths || [];

  const collRows = await sql.query('SELECT id FROM hadith_collections WHERE slug = $1', [slug]);
  if (collRows.length === 0) { console.warn(`  no collection row for ${slug}`); return; }
  const collectionId = collRows[0].id;

  let n = 0;
  for (const batch of chunk(hadithList, 150)) {
    const values = [], params = [];
    batch.forEach((h, i) => {
      const o = i * 3;
      values.push(`($${o+1}::int, $${o+2}::text, $${o+3}::text)`);
      params.push(collectionId, String(h.hadithnumber), h.text || '');
    });
    await sql.query(
      `UPDATE hadiths h
       SET text_arabic = v.text, source_edition = COALESCE(h.source_edition, 'ara+eng')
       FROM (VALUES ${values.join(',')}) AS v(cid, hnum, text)
       WHERE h.collection_id = v.cid AND h.hadith_number = v.hnum`,
      params
    );
    n += batch.length;
  }
  console.log(`  ${slug}: processed ${n} Arabic hadith`);
}

(async () => {
  for (const c of COLLECTIONS) await seedArabic(c);
  const check = await sql.query(
    `SELECT c.slug,
            COUNT(*) FILTER (WHERE h.text_arabic IS NOT NULL AND h.text_arabic <> '') AS with_arabic,
            COUNT(*) AS total
     FROM hadiths h JOIN hadith_collections c ON c.id = h.collection_id GROUP BY c.slug ORDER BY c.slug`
  );
  for (const r of check) console.log(`  ${r.slug}: ${r.with_arabic}/${r.total} have Arabic`);
  console.log('Arabic hadith seed complete.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
