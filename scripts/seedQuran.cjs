// Populates surahs, ayahs, and MULTIPLE translations.
// Source: Al Quran Cloud API (https://alquran.cloud/api) — free, open, no key required.
// Run: npm run seed:quran

require('dotenv').config();
const fetch = require('node-fetch');
const db = require('../src/config/db');

const META_URL = 'https://api.alquran.cloud/v1/meta';
const ARABIC_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';

// Add/remove translations here. Edition codes must match alquran.cloud's
// edition identifiers (see https://api.alquran.cloud/v1/edition).
const TRANSLATIONS = [
  { code: 'en.sahih', language: 'en', translator: 'Saheeh International', isSimplified: false },
  { code: 'en.yusufali', language: 'en', translator: 'Abdullah Yusuf Ali', isSimplified: false },
  { code: 'en.pickthall', language: 'en', translator: 'Mohammed Marmaduke Pickthall', isSimplified: false },
  { code: 'en.hilali', language: 'en', translator: 'Hilali & Khan', isSimplified: false },
  // Plain, modern English aimed at students new to the text. Verify this
  // edition code against https://api.alquran.cloud/v1/edition before relying
  // on it — if it 404s, the seeder logs a warning and skips it harmlessly.
  { code: 'en.clearquran', language: 'en', translator: 'Dr. Mustafa Khattab (The Clear Quran)', isSimplified: true },
];

async function seedSurahsAndArabic() {
  console.log('Fetching Quran metadata...');
  const meta = await (await fetch(META_URL)).json();
  const surahsMeta = meta.data.surahs.references;

  console.log('Inserting surahs...');
  for (const s of surahsMeta) {
    await db.query(
      `INSERT INTO surahs (number, name_arabic, name_english, name_transliteration, revelation_place, ayah_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (number) DO NOTHING`,
      [s.number, s.name, s.englishNameTranslation, s.englishName, s.revelationType, s.numberOfAyahs]
    );
  }

  console.log('Fetching Arabic text (whole Quran)...');
  const arabicData = await (await fetch(ARABIC_URL)).json();
  const arabicSurahs = arabicData.data.surahs;

  // Map of ayah_id keyed by "surah:ayah" so translation pass can reuse it
  const ayahIdMap = {};

  console.log('Inserting ayahs (Arabic text)...');
  for (const surah of arabicSurahs) {
    for (const ayah of surah.ayahs) {
      const result = await db.query(
        `INSERT INTO ayahs (surah_number, ayah_number, text_arabic, juz, page, source_edition)
         VALUES ($1, $2, $3, $4, $5, 'quran-uthmani')
         ON CONFLICT (surah_number, ayah_number) DO UPDATE SET text_arabic = EXCLUDED.text_arabic
         RETURNING id`,
        [surah.number, ayah.numberInSurah, ayah.text, ayah.juz, ayah.page]
      );
      ayahIdMap[`${surah.number}:${ayah.numberInSurah}`] = result.rows[0].id;
    }
    console.log(`  Surah ${surah.number} Arabic text done`);
  }

  return ayahIdMap;
}

async function seedTranslation(translation, ayahIdMap) {
  console.log(`\nSeeding translation: ${translation.translator} (${translation.code})...`);

  await db.query(
    `INSERT INTO translations (code, language, translator_name, is_simplified)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (code) DO UPDATE SET is_simplified = EXCLUDED.is_simplified`,
    [translation.code, translation.language, translation.translator, translation.isSimplified || false]
  );
  const translationRow = await db.query('SELECT id FROM translations WHERE code = $1', [translation.code]);
  const translationId = translationRow.rows[0].id;

  const url = `https://api.alquran.cloud/v1/quran/${translation.code}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  Skipping ${translation.code} — not available at alquran.cloud (status ${res.status})`);
    return;
  }
  const data = await res.json();
  const surahs = data.data.surahs;

  for (const surah of surahs) {
    for (const ayah of surah.ayahs) {
      const ayahId = ayahIdMap[`${surah.number}:${ayah.numberInSurah}`];
      if (!ayahId) continue; // shouldn't happen, but guard anyway

      await db.query(
        `INSERT INTO ayah_translations (ayah_id, translation_id, text)
         VALUES ($1, $2, $3)
         ON CONFLICT (ayah_id, translation_id) DO UPDATE SET text = EXCLUDED.text`,
        [ayahId, translationId, ayah.text]
      );
    }
    console.log(`  Surah ${surah.number} done`);
  }
}

async function seed() {
  const ayahIdMap = await seedSurahsAndArabic();

  for (const translation of TRANSLATIONS) {
    await seedTranslation(translation, ayahIdMap);
  }

  console.log('\nQuran seed complete! Translations loaded:', TRANSLATIONS.map((t) => t.code).join(', '));
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
