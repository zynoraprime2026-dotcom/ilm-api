// Fast batched Quran seeder for sandboxes where only HTTPS (not raw TCP 5432)
// is reachable. Same source/data/conflict-handling as scripts/seedQuran.cjs,
// just batches rows into multi-VALUES INSERTs to cut network round trips
// from ~37k down to a few hundred. Production (Vercel/Replit, real TCP) keeps
// using the original scripts/seedQuran.cjs unchanged.
require('dotenv').config();
const fetch = require('node-fetch');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const META_URL = 'https://api.alquran.cloud/v1/meta';
const ARABIC_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';
const TRANSLATIONS = [
  { code: 'en.sahih', language: 'en', translator: 'Saheeh International', isSimplified: false },
  { code: 'en.yusufali', language: 'en', translator: 'Abdullah Yusuf Ali', isSimplified: false },
  { code: 'en.pickthall', language: 'en', translator: 'Mohammed Marmaduke Pickthall', isSimplified: false },
  { code: 'en.hilali', language: 'en', translator: 'Hilali & Khan', isSimplified: false },
  { code: 'en.clearquran', language: 'en', translator: 'Dr. Mustafa Khattab (The Clear Quran)', isSimplified: true },
];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedSurahsAndArabic() {
  console.log('Fetching Quran metadata...');
  const meta = await (await fetch(META_URL)).json();
  const surahsMeta = meta.data.surahs.references;

  console.log('Inserting surahs (batched)...');
  for (const batch of chunk(surahsMeta, 50)) {
    const values = [];
    const params = [];
    batch.forEach((s, i) => {
      const o = i * 6;
      values.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6})`);
      params.push(s.number, s.name, s.englishNameTranslation, s.englishName, s.revelationType, s.numberOfAyahs);
    });
    await sql.query(
      `INSERT INTO surahs (number, name_arabic, name_english, name_transliteration, revelation_place, ayah_count)
       VALUES ${values.join(',')} ON CONFLICT (number) DO NOTHING`,
      params
    );
  }
  console.log('Surahs done.');

  console.log('Fetching Arabic text (whole Quran)...');
  const arabicData = await (await fetch(ARABIC_URL)).json();
  const arabicSurahs = arabicData.data.surahs;

  const ayahIdMap = {};
  console.log('Inserting ayahs (batched, 100/req)...');
  for (const surah of arabicSurahs) {
    const ayahBatches = chunk(surah.ayahs, 100);
    for (const batch of ayahBatches) {
      const values = [];
      const params = [];
      batch.forEach((ayah, i) => {
        const o = i * 5;
        values.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},'quran-uthmani')`);
        params.push(surah.number, ayah.numberInSurah, ayah.text, ayah.juz, ayah.page);
      });
      const rows = await sql.query(
        `INSERT INTO ayahs (surah_number, ayah_number, text_arabic, juz, page, source_edition)
         VALUES ${values.join(',')}
         ON CONFLICT (surah_number, ayah_number) DO UPDATE SET text_arabic = EXCLUDED.text_arabic
         RETURNING id, surah_number, ayah_number`,
        params
      );
      for (const r of rows) ayahIdMap[`${r.surah_number}:${r.ayah_number}`] = r.id;
    }
    if (surah.number % 20 === 0 || surah.number === 114) console.log(`  Surah ${surah.number} Arabic text done`);
  }
  console.log('Ayahs done.');
  return ayahIdMap;
}

async function seedTranslation(translation, ayahIdMap) {
  console.log(`Seeding translation: ${translation.translator} (${translation.code})...`);
  await sql.query(
    `INSERT INTO translations (code, language, translator_name, is_simplified)
     VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO UPDATE SET is_simplified = EXCLUDED.is_simplified`,
    [translation.code, translation.language, translation.translator, translation.isSimplified || false]
  );
  const tRow = await sql.query('SELECT id FROM translations WHERE code = $1', [translation.code]);
  const translationId = tRow[0].id;

  const url = `https://api.alquran.cloud/v1/quran/${translation.code}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  Skipping ${translation.code} — not available (status ${res.status})`);
    return;
  }
  const data = await res.json();
  const surahs = data.data.surahs;

  for (const surah of surahs) {
    const batches = chunk(surah.ayahs, 100);
    for (const batch of batches) {
      const values = [];
      const params = [];
      let i = 0;
      for (const ayah of batch) {
        const ayahId = ayahIdMap[`${surah.number}:${ayah.numberInSurah}`];
        if (!ayahId) continue;
        const o = i * 3;
        values.push(`($${o+1},$${o+2},$${o+3})`);
        params.push(ayahId, translationId, ayah.text);
        i++;
      }
      if (values.length === 0) continue;
      await sql.query(
        `INSERT INTO ayah_translations (ayah_id, translation_id, text)
         VALUES ${values.join(',')}
         ON CONFLICT (ayah_id, translation_id) DO UPDATE SET text = EXCLUDED.text`,
        params
      );
    }
  }
  console.log(`  ${translation.code} done.`);
}

async function main() {
  const ayahIdMap = await seedSurahsAndArabic();
  for (const t of TRANSLATIONS) {
    await seedTranslation(t, ayahIdMap);
  }
  console.log('\nQuran seed complete (fast/batched).');
}

main().catch(e => { console.error('FAILED:', e.message, e.stack); process.exit(1); });
