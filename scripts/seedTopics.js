// Starter thematic index linking ayahs and hadith by topic.
// Like narrators/isnad, there's no bulk open dataset for thematic tagging —
// this is a curation starter you expand over time.
// Run: npm run seed:topics

require('dotenv').config();
const db = require('../src/config/db');

const TOPICS = [
  { slug: 'patience', name: 'Patience (Sabr)', description: 'Perseverance through hardship and self-restraint.' },
  { slug: 'charity', name: 'Charity (Sadaqah)', description: 'Giving to those in need.' },
  { slug: 'intention', name: 'Intention (Niyyah)', description: 'The role of sincere intention in actions.' },
];

// ayah_refs / hadith_refs use identifiers that must already exist in your DB
const TOPIC_LINKS = [
  {
    topic: 'patience',
    ayah_refs: [
      { surah: 2, ayah: 153 },
      { surah: 2, ayah: 155 },
      { surah: 3, ayah: 200 },
    ],
    hadith_refs: [],
  },
  {
    topic: 'intention',
    ayah_refs: [],
    hadith_refs: [{ collection: 'bukhari', number: '1' }],
  },
];

async function seed() {
  console.log('Inserting topics...');
  const topicIds = {};
  for (const t of TOPICS) {
    const result = await db.query(
      `INSERT INTO topics (slug, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [t.slug, t.name, t.description]
    );
    topicIds[t.slug] = result.rows[0].id;
  }

  console.log('Linking topics to ayahs/hadith...');
  for (const link of TOPIC_LINKS) {
    const topicId = topicIds[link.topic];

    for (const ref of link.ayah_refs) {
      const ayahResult = await db.query(
        'SELECT id FROM ayahs WHERE surah_number = $1 AND ayah_number = $2',
        [ref.surah, ref.ayah]
      );
      if (ayahResult.rows.length === 0) continue; // run seed:quran first
      await db.query(
        `INSERT INTO ayah_topics (ayah_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [ayahResult.rows[0].id, topicId]
      );
    }

    for (const ref of link.hadith_refs) {
      const hadithResult = await db.query(
        `SELECT h.id FROM hadiths h JOIN hadith_collections c ON c.id = h.collection_id
         WHERE c.slug = $1 AND h.hadith_number = $2`,
        [ref.collection, ref.number]
      );
      if (hadithResult.rows.length === 0) continue; // run seed:hadith first
      await db.query(
        `INSERT INTO hadith_topics (hadith_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [hadithResult.rows[0].id, topicId]
      );
    }
  }

  console.log('Topic seed complete. Expand TOPICS and TOPIC_LINKS as you curate more connections.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
