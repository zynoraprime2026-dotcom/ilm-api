// Starter du'a data. There's no single great open API for duas, so this is
// meant as a seed you expand — add more entries to SAMPLE_DUAS or load from
// your own curated JSON/CSV file (e.g. transcribed from Hisnul Muslim).
// Run: npm run seed:duas

require('dotenv').config();
const db = require('../src/config/db');

const CATEGORIES = [
  { slug: 'morning', name: 'Morning Remembrance' },
  { slug: 'evening', name: 'Evening Remembrance' },
  { slug: 'before-eating', name: 'Before Eating' },
  { slug: 'travel', name: 'Travel' },
  { slug: 'distress', name: 'Times of Distress' },
];

const SAMPLE_DUAS = [
  {
    category: 'before-eating',
    title: 'Dua before eating',
    text_arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation: 'In the name of Allah',
    reference: 'Abu Dawud, Tirmidhi',
  },
  {
    category: 'travel',
    title: 'Dua for travel',
    text_arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ',
    transliteration: 'Subhanal-lathi sakhkhara lana hatha wama kunna lahu muqrineen',
    translation: 'Glory to Him Who has subjected this to us, and we could never have accomplished this by ourselves',
    reference: 'Sahih Muslim',
  },
  // Add more entries — this is a starting point, not a complete set.
];

async function seed() {
  console.log('Inserting dua categories...');
  const categoryIds = {};
  for (const c of CATEGORIES) {
    const result = await db.query(
      `INSERT INTO dua_categories (slug, name) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [c.slug, c.name]
    );
    categoryIds[c.slug] = result.rows[0].id;
  }

  console.log('Inserting sample duas...');
  for (const d of SAMPLE_DUAS) {
    await db.query(
      `INSERT INTO duas (category_id, title, text_arabic, transliteration, translation, reference)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [categoryIds[d.category], d.title, d.text_arabic, d.transliteration, d.translation, d.reference]
    );
  }

  console.log('Dua seed complete! Add more entries to SAMPLE_DUAS as you curate content.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
