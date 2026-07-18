// Starter fiqh rulings comparing madhabs on common topics. Like narrators and
// topics, this is a curation starter — there's no bulk open dataset for
// structured, attributed fiqh rulings across madhabs.
// Run: npm run seed:fiqh

require('dotenv').config();
const db = require('../src/config/db');

const SAMPLE_RULINGS = [
  {
    topic: 'Breaking the fast due to illness',
    madhab: 'Hanafi',
    question: 'Is a sick person permitted to break their fast during Ramadan?',
    ruling: 'Yes — a person whose illness would be worsened by fasting, or who fears delayed recovery, is permitted to break the fast and make up the missed days later.',
    reference: 'Al-Hidayah',
  },
  {
    topic: 'Breaking the fast due to illness',
    madhab: 'Shafi\'i',
    question: 'Is a sick person permitted to break their fast during Ramadan?',
    ruling: 'Yes, with the same underlying principle — hardship that fasting would cause or worsen permits breaking the fast, followed by making up the days once able.',
    reference: 'Minhaj al-Talibin',
  },
];

async function seed() {
  console.log('Inserting sample fiqh rulings...');
  for (const r of SAMPLE_RULINGS) {
    await db.query(
      `INSERT INTO fiqh_rulings (topic, madhab, question, ruling, reference)
       VALUES ($1, $2, $3, $4, $5)`,
      [r.topic, r.madhab, r.question, r.ruling, r.reference]
    );
  }
  console.log('Fiqh seed complete. Expand SAMPLE_RULINGS as you curate more comparisons.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
