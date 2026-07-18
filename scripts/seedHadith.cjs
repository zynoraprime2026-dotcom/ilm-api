// Populates hadith_collections and hadiths from the open fawazahmed0/hadith-api
// dataset (free JSON, no key, hosted on jsDelivr CDN).
// Repo: https://github.com/fawazahmed0/hadith-api
// Run: npm run seed:hadith

require('dotenv').config();
const fetch = require('node-fetch');
const db = require('../src/config/db');

// The six canonical hadith collections (Kutub al-Sittah).
// jsDelivr path pattern: /gh/fawazahmed0/hadith-api@1/editions/eng-{slug}.json
const COLLECTIONS = [
  { slug: 'bukhari', name: 'Sahih al-Bukhari', editionCode: 'eng-bukhari' },
  { slug: 'muslim', name: 'Sahih Muslim', editionCode: 'eng-muslim' },
  { slug: 'abudawud', name: 'Sunan Abu Dawud', editionCode: 'eng-abudawud' },
  { slug: 'tirmidhi', name: 'Jami at-Tirmidhi', editionCode: 'eng-tirmidhi' },
  { slug: 'nasai', name: "Sunan an-Nasa'i", editionCode: 'eng-nasai' },
  { slug: 'ibnmajah', name: 'Sunan Ibn Majah', editionCode: 'eng-ibnmajah' },
];

const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

async function seedCollection({ slug, name, editionCode }) {
  console.log(`Fetching ${name}...`);
  const res = await fetch(`${BASE_URL}/${editionCode}.json`);
  if (!res.ok) {
    console.warn(`  Skipping ${name} — dataset not available at expected URL (status ${res.status})`);
    return;
  }
  const data = await res.json();
  const hadithList = data.hadiths || [];

  const collectionResult = await db.query(
    `INSERT INTO hadith_collections (slug, name, total_hadith)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET total_hadith = EXCLUDED.total_hadith
     RETURNING id`,
    [slug, name, hadithList.length]
  );
  const collectionId = collectionResult.rows[0].id;

  for (const h of hadithList) {
    await db.query(
      `INSERT INTO hadiths (collection_id, hadith_number, text_english, source_edition)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (collection_id, hadith_number) DO UPDATE SET text_english = EXCLUDED.text_english`,
      [collectionId, String(h.hadithnumber ?? h.number), h.text, editionCode]
    );
  }
  console.log(`  ${name}: inserted ${hadithList.length} hadith`);
}

async function seed() {
  for (const collection of COLLECTIONS) {
    await seedCollection(collection);
  }
  console.log('Hadith seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
