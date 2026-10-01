// Fast batched hadith seeder (HTTPS-only sandboxes). Same source/conflict
// logic as scripts/seedHadith.cjs, batched to cut ~32k round trips to ~350.
require('dotenv').config();
const fetch = require('node-fetch');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const COLLECTIONS = [
  { slug: 'bukhari', name: 'Sahih al-Bukhari', editionCode: 'eng-bukhari' },
  { slug: 'muslim', name: 'Sahih Muslim', editionCode: 'eng-muslim' },
  { slug: 'abudawud', name: 'Sunan Abu Dawud', editionCode: 'eng-abudawud' },
  { slug: 'tirmidhi', name: 'Jami at-Tirmidhi', editionCode: 'eng-tirmidhi' },
  { slug: 'nasai', name: "Sunan an-Nasa'i", editionCode: 'eng-nasai' },
  { slug: 'ibnmajah', name: 'Sunan Ibn Majah', editionCode: 'eng-ibnmajah' },
];
const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedCollection({ slug, name, editionCode }) {
  console.log(`Fetching ${name}...`);
  const res = await fetch(`${BASE_URL}/${editionCode}.json`);
  if (!res.ok) {
    console.warn(`  Skipping ${name} (status ${res.status})`);
    return;
  }
  const data = await res.json();
  const hadithList = data.hadiths || [];

  const collectionResult = await sql.query(
    `INSERT INTO hadith_collections (slug, name, total_hadith)
     VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET total_hadith = EXCLUDED.total_hadith
     RETURNING id`,
    [slug, name, hadithList.length]
  );
  const collectionId = collectionResult[0].id;

  for (const batch of chunk(hadithList, 150)) {
    const values = [];
    const params = [];
    batch.forEach((h, i) => {
      const o = i * 4;
      values.push(`($${o+1},$${o+2},$${o+3},$${o+4})`);
      params.push(collectionId, String(h.hadithnumber ?? h.number), h.text, editionCode);
    });
    await sql.query(
      `INSERT INTO hadiths (collection_id, hadith_number, text_english, source_edition)
       VALUES ${values.join(',')}
       ON CONFLICT (collection_id, hadith_number) DO UPDATE SET text_english = EXCLUDED.text_english`,
      params
    );
  }
  console.log(`  ${name}: inserted ${hadithList.length} hadith`);
}

async function seed() {
  for (const c of COLLECTIONS) await seedCollection(c);
  console.log('Hadith seed complete (fast/batched).');
}
seed().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
