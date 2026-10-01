// Fast batched hadith enrichment (HTTPS-only sandboxes): fills book_number,
// book_name (from dataset section metadata), arabic_number, grade, and narrator
// (extracted from "Narrated X:" text prefix) for all 6 collections.
require('dotenv').config();
const fetch = require('node-fetch');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const COLLECTIONS = [
  { slug: 'bukhari', editionCode: 'eng-bukhari' },
  { slug: 'muslim', editionCode: 'eng-muslim' },
  { slug: 'abudawud', editionCode: 'eng-abudawud' },
  { slug: 'tirmidhi', editionCode: 'eng-tirmidhi' },
  { slug: 'nasai', editionCode: 'eng-nasai' },
  { slug: 'ibnmajah', editionCode: 'eng-ibnmajah' },
];
const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function extractNarrator(text) {
  if (!text) return null;
  const m = text.match(/^Narrated\s+(.{2,120}?):/);
  return m ? m[1].trim() : null;
}
function extractGrade(grades) {
  if (!Array.isArray(grades) || grades.length === 0) return null;
  const g = grades[0];
  return g.grade || g.name || null;
}

async function enrichCollection({ slug, editionCode }) {
  console.log(`Fetching ${editionCode}...`);
  const res = await fetch(`${BASE_URL}/${editionCode}.json`);
  if (!res.ok) { console.warn(`  skip ${slug} (${res.status})`); return; }
  const data = await res.json();
  const sections = (data.metadata && data.metadata.sections) || {};
  const hadithList = data.hadiths || [];

  const collRows = await sql.query('SELECT id FROM hadith_collections WHERE slug = $1', [slug]);
  if (collRows.length === 0) { console.warn(`  no collection row for ${slug}`); return; }
  const collectionId = collRows[0].id;

  let updated = 0;
  for (const batch of chunk(hadithList, 200)) {
    const values = [], params = [];
    batch.forEach((h, i) => {
      const bookNum = h.reference && h.reference.book != null ? parseInt(h.reference.book, 10) : null;
      const bookName = sections[String(bookNum)] || null;
      const narrator = extractNarrator(h.text);
      const grade = extractGrade(h.grades);
      const o = i * 8;
      values.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6},$${o+7},$${o+8})`);
      params.push(collectionId, String(h.hadithnumber), h.arabicnumber != null ? String(h.arabicnumber) : null,
                  bookNum, bookName, grade, narrator, h.text || '');
    });
    await sql.query(
      `INSERT INTO hadiths (collection_id, hadith_number, arabic_number, book_number, book_name, grade, narrator, text_english)
       VALUES ${values.join(',')}
       ON CONFLICT (collection_id, hadith_number) DO UPDATE
         SET arabic_number = EXCLUDED.arabic_number,
             book_number = EXCLUDED.book_number,
             book_name = EXCLUDED.book_name,
             grade = EXCLUDED.grade,
             narrator = COALESCE(EXCLUDED.narrator, hadiths.narrator)`,
      params
    );
    updated += batch.length;
  }
  console.log(`  ${slug}: enriched ${updated} hadith`);
}

(async () => {
  for (const c of COLLECTIONS) await enrichCollection(c);
  console.log('Hadith enrichment complete.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
