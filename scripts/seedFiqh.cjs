// Seed the fiqh comparative dataset (data/fiqh-part1/2/3.js) into fiqh_rulings.
// Adds chapter + evidence columns, replaces all rows deterministically.
// To add more rulings later: add topics to the data files and rerun this script.
// Usage: DATABASE_URL=... node scripts/seedFiqh.cjs
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const parts = [
  require('../data/fiqh-part1.js'),
  require('../data/fiqh-part2.js'),
  require('../data/fiqh-part3.js'),
  require('../data/fiqh-part4.js'),
];
const DEFAULT_REF = {
  "Hanafi": "Al-Hidayah (al-Marghinani)",
  "Shafi'i": "Minhaj al-Talibin (al-Nawawi)",
  "Maliki": "Mukhtasar Khalil",
  "Hanbali": "Al-Mughni (Ibn Qudamah)",
};

const BOOKS = require('../data/fiqh-books.js');

(async () => {
  // rulings table
  await sql.query('ALTER TABLE fiqh_rulings ADD COLUMN IF NOT EXISTS chapter TEXT');
  await sql.query('ALTER TABLE fiqh_rulings ADD COLUMN IF NOT EXISTS evidence TEXT');

  const rows = [];
  for (const topic of parts.flat()) {
    for (const r of topic.rows) {
      rows.push([
        topic.chapter,
        topic.topic,
        r.madhab,
        topic.question,
        r.ruling,
        r.reference || DEFAULT_REF[r.madhab] || '',
        r.evidence || null,
      ]);
    }
  }
  console.log(`dataset: ${rows.length} rulings`);

  await sql.query('DELETE FROM fiqh_rulings');

  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const params = [];
    const tuples = batch.map((r) => {
      const o = params.length;
      params.push(...r);
      return `($${o + 1}::text, $${o + 2}::text, $${o + 3}::text, $${o + 4}::text, $${o + 5}::text, $${o + 6}::text, $${o + 7}::text)`;
    });
    await sql.query(
      `INSERT INTO fiqh_rulings (chapter, topic, madhab, question, ruling, reference, evidence)
       VALUES ${tuples.join(',')}`,
      params
    );
  }

  const check = await sql.query(
    `SELECT count(*) AS total,
            count(DISTINCT topic) AS topics,
            count(DISTINCT chapter) AS chapters,
            count(*) FILTER (WHERE evidence IS NOT NULL) AS with_evidence
     FROM fiqh_rulings`
  );
  console.log('VERIFY:', JSON.stringify(check[0]));
  // books registry (research layer)
  await sql.query(
    'CREATE TABLE IF NOT EXISTS fiqh_books (id SERIAL PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, death_year_ah INTEGER, school TEXT, description TEXT, access_url TEXT)'
  );
  await sql.query('DELETE FROM fiqh_books');
  for (const b of BOOKS) {
    await sql.query(
      'INSERT INTO fiqh_books (title, author, death_year_ah, school, description, access_url) VALUES ($1, $2, $3, $4, $5, $6)',
      [b.title, b.author, b.death_year_ah, b.school, b.description, b.access_url]
    );
  }
  const books = await sql.query('SELECT count(*) AS c FROM fiqh_books');
  console.log('books seeded:', books[0].c);
  console.log('FIQH SEED COMPLETE');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
