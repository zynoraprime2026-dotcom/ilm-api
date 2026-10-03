// Comprehensive data-quality audit for ilm-api (read-only) — part 3
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const out = (label, rows) => {
  const line = rows.length > 1
    ? rows.map((r) => Object.values(r).join(' | ')).slice(0, 12).join(' ; ')
    : JSON.stringify(rows[0]);
  console.log(label.padEnd(34), line);
};

(async () => {
  out('ALL TABLES', await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' ORDER BY table_name`);
  out('word sample', await sql`SELECT word_position, text_arabic, part_of_speech FROM ayah_words ORDER BY ayah_id, word_position LIMIT 8`);
  out('ayahs WITHOUT words', await sql`
    SELECT a.surah_number, a.ayah_number FROM ayahs a
    WHERE NOT EXISTS (SELECT 1 FROM ayah_words w WHERE w.ayah_id = a.id)
    ORDER BY a.surah_number, a.ayah_number LIMIT 30`);
  out('duas', await sql`SELECT count(*) AS c FROM duas`);
  out('dua chapters', await sql`SELECT count(*) AS c FROM dua_chapters`);
  out('reciters', await sql`SELECT count(*) AS c FROM reciters`);
  out('translations', await sql`SELECT code, language, translator_name FROM translations ORDER BY code`);
  out('per-collection hadith', await sql`SELECT collection, count(*) AS c FROM hadiths GROUP BY collection ORDER BY c DESC`);
  out('root table', await sql`SELECT count(*) AS c FROM quranic_roots`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
