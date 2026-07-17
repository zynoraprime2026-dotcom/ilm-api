// Populates tafsir table from the open spa5k/tafsir_api dataset
// (https://github.com/spa5k/tafsir_api) — static JSON, free, no key required.
// Run: npm run seed:tafsir
//
// NOTE: This dataset is large (multiple tafsir sources x 114 surahs). Runtime
// depends on network speed; expect several minutes per source.

require('dotenv').config();
const fetch = require('node-fetch');
const db = require('../src/config/db');

const BASE_URL = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir';

// Each entry maps a display name to the dataset's internal source slug.
// Check https://github.com/spa5k/tafsir_api/tree/main/tafsir for the full list
// of available slugs if you want to add more.
const SOURCES = [
  { slug: 'en-tafisr-ibn-kathir', name: 'Ibn Kathir' },
  { slug: 'en-tafsir-maarif-ul-quran', name: "Maarif-ul-Quran" },
];

async function seedSource(source) {
  console.log(`\nFetching tafsir source: ${source.name}...`);

  for (let surahNum = 1; surahNum <= 114; surahNum++) {
    const url = `${BASE_URL}/${source.slug}/${surahNum}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Surah ${surahNum}: not found for ${source.name} (status ${res.status}), skipping`);
      continue;
    }
    const data = await res.json();
    // Expected shape: { ayahs: [{ ayah: number, text: string }, ...] } — verify
    // against actual response and adjust field names if the dataset differs.
    const ayahEntries = data.ayahs || data;

    for (const entry of ayahEntries) {
      const ayahNumber = entry.ayah ?? entry.numberInSurah ?? entry.aya;
      const text = entry.text ?? entry.tafsir;
      if (!ayahNumber || !text) continue;

      const ayahResult = await db.query(
        'SELECT id FROM ayahs WHERE surah_number = $1 AND ayah_number = $2',
        [surahNum, ayahNumber]
      );
      if (ayahResult.rows.length === 0) continue; // ayah not seeded yet — run seed:quran first

      const ayahId = ayahResult.rows[0].id;

      await db.query(
        `INSERT INTO tafsir (ayah_id, source, text, source_edition)
         VALUES ($1, $2, $3, $4)`,
        [ayahId, source.name, text, source.slug]
      );
    }
    if (surahNum % 10 === 0) console.log(`  ...${source.name}: surah ${surahNum}/114 done`);
  }
  console.log(`${source.name} complete.`);
}

async function seed() {
  // Sanity check: make sure Quran ayahs exist first
  const check = await db.query('SELECT COUNT(*) FROM ayahs');
  if (parseInt(check.rows[0].count, 10) === 0) {
    console.error('No ayahs found. Run `npm run seed:quran` before seeding tafsir.');
    process.exit(1);
  }

  for (const source of SOURCES) {
    await seedSource(source);
  }

  console.log('\nTafsir seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
