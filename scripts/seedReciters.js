// Populates the reciters table. Audio files themselves are hosted by
// everyayah.com (free, long-standing public mirror of Quran recitations) —
// we only store the URL pattern, not the audio.
// Run: npm run seed:reciters

require('dotenv').config();
const db = require('../src/config/db');

// slug -> everyayah.com folder name. Verify folder names against
// https://everyayah.com/data/ if you add more reciters.
const RECITERS = [
  { slug: 'alafasy', name: 'Mishary Rashid Al-Afasy', folder: 'Alafasy_128kbps' },
  { slug: 'husary', name: 'Mahmoud Khalil Al-Husary', folder: 'Husary_128kbps' },
  { slug: 'minshawi', name: 'Mohamed Siddiq El-Minshawi', folder: 'Minshawy_Murattal_128kbps' },
];

async function seed() {
  for (const r of RECITERS) {
    const audioBaseUrl = `https://everyayah.com/data/${r.folder}/`;
    await db.query(
      `INSERT INTO reciters (slug, name, audio_base_url) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET audio_base_url = EXCLUDED.audio_base_url`,
      [r.slug, r.name, audioBaseUrl]
    );
  }
  console.log(`Reciters seed complete (${RECITERS.length} reciters).`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
