// Populates narrators and links a few sample isnad chains to hadiths already
// in the database.
//
// HONEST NOTE ON DATA SOURCING:
// Unlike Quran/hadith text, there is no clean open API that provides
// structured isnad chains (narrator-by-narrator, per hadith, machine
// readable). The scholarly data exists (e.g. in books like Tahdhib al-Kamal,
// or digitized on sites like Islamweb / Dorar.net), but it isn't published
// as an open dataset. Building this out properly means either:
//   (a) manually curating narrator bios + chains hadith-by-hadith (slow,
//       but this is genuinely how existing hadith apps built their data), or
//   (b) scraping/licensing from a site that has it, which needs their
//       permission and is a bigger legal/technical undertaking than seeding.
//
// This script gives you the pattern for (a): a small set of well-known
// narrators to start with, and one example chain linked to a real hadith
// already in your database (if it exists). Expand SAMPLE_NARRATORS and
// SAMPLE_CHAINS over time — this is a content curation project, not a
// one-time script.
//
// Run: npm run seed:narrators

require('dotenv').config();
const db = require('../src/config/db');

const SAMPLE_NARRATORS = [
  {
    name_english: 'Abu Hurairah',
    name_arabic: 'أبو هريرة',
    kunya: 'Abu Hurairah',
    generation: 'Sahabi',
    death_year_hijri: 59,
    reliability_grade: 'Thiqah',
    bio: 'A companion of the Prophet ﷺ known for narrating the largest number of hadith, having spent several years closely accompanying him and dedicating himself to memorizing his sayings.',
  },
  {
    name_english: 'Aisha bint Abi Bakr',
    name_arabic: 'عائشة بنت أبي بكر',
    kunya: 'Umm al-Mu\'minin',
    generation: 'Sahabi',
    death_year_hijri: 58,
    reliability_grade: 'Thiqah',
    bio: 'Wife of the Prophet ﷺ and one of the most prolific narrators of hadith, especially regarding matters of the Prophet\'s household and personal conduct.',
  },
  {
    name_english: 'Anas ibn Malik',
    name_arabic: 'أنس بن مالك',
    kunya: null,
    generation: 'Sahabi',
    death_year_hijri: 93,
    reliability_grade: 'Thiqah',
    bio: 'Personal attendant of the Prophet ﷺ for around ten years, and one of the last companions to pass away, making him a key link to later generations.',
  },
  {
    name_english: 'Muhammad ibn Sirin',
    name_arabic: 'محمد بن سيرين',
    kunya: null,
    generation: "Tabi'in",
    death_year_hijri: 110,
    reliability_grade: 'Thiqah',
    bio: 'A prominent successor generation scholar known for his precision in hadith transmission and expertise in dream interpretation.',
  },
];

// Each chain links narrator names (must exist in SAMPLE_NARRATORS or already
// in the DB) to a hadith identified by collection slug + hadith_number.
// chain_position 1 = closest to the Prophet ﷺ.
const SAMPLE_CHAINS = [
  {
    collection_slug: 'bukhari',
    hadith_number: '1', // adjust to match a real seeded hadith_number
    chain: ['Abu Hurairah'],
  },
];

async function seed() {
  console.log('Inserting sample narrators...');
  const narratorIds = {};
  for (const n of SAMPLE_NARRATORS) {
    const result = await db.query(
      `INSERT INTO narrators (name_arabic, name_english, kunya, generation, death_year_hijri, reliability_grade, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (name_english, kunya) DO UPDATE SET bio = EXCLUDED.bio
       RETURNING id`,
      [n.name_arabic, n.name_english, n.kunya, n.generation, n.death_year_hijri, n.reliability_grade, n.bio]
    );
    narratorIds[n.name_english] = result.rows[0].id;
  }

  console.log('Linking sample isnad chains...');
  for (const chainDef of SAMPLE_CHAINS) {
    const hadithResult = await db.query(
      `SELECT h.id FROM hadiths h
       JOIN hadith_collections c ON c.id = h.collection_id
       WHERE c.slug = $1 AND h.hadith_number = $2`,
      [chainDef.collection_slug, chainDef.hadith_number]
    );
    if (hadithResult.rows.length === 0) {
      console.warn(`  Skipping chain — hadith ${chainDef.collection_slug}:${chainDef.hadith_number} not found (run seed:hadith first)`);
      continue;
    }
    const hadithId = hadithResult.rows[0].id;

    for (let i = 0; i < chainDef.chain.length; i++) {
      const narratorId = narratorIds[chainDef.chain[i]];
      if (!narratorId) continue;
      await db.query(
        `INSERT INTO isnad_chains (hadith_id, narrator_id, chain_position)
         VALUES ($1, $2, $3)
         ON CONFLICT (hadith_id, chain_position) DO UPDATE SET narrator_id = EXCLUDED.narrator_id`,
        [hadithId, narratorId, i + 1]
      );
    }
  }

  console.log('Narrator/isnad seed complete. Expand SAMPLE_NARRATORS and SAMPLE_CHAINS as you curate more.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
