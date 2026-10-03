// Comprehensive data-quality audit for ilm-api (read-only) — part 2
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const out = (label, rows) => {
  const line = rows.length > 1
    ? rows.map((r) => Object.values(r).join(' | ')).slice(0, 10).join(' ; ')
    : JSON.stringify(rows[0]);
  console.log(label.padEnd(34), line);
};

(async () => {
  out('hadith columns', await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'hadiths' ORDER BY ordinal_position`);
  out('fiqh columns', await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'fiqh_rulings' ORDER BY ordinal_position`);
  out('fiqh sample', await sql`SELECT * FROM fiqh_rulings LIMIT 5`);
  out('narrators total', await sql`SELECT count(*) AS c FROM narrators`);
  out('narrators bio', await sql`SELECT count(*) AS c FROM narrators WHERE bio IS NOT NULL`);
  out('narrators arabic name', await sql`SELECT count(*) AS c FROM narrators WHERE name_arabic IS NOT NULL`);
  out('isnad rows', await sql`SELECT count(*) AS c FROM isnads`);
  out('duas', await sql`SELECT count(*) AS c FROM duas`);
  out('dua chapters', await sql`SELECT count(*) AS c FROM dua_chapters`);
  out('reciters', await sql`SELECT count(*) AS c FROM reciters`);
  out('translations', await sql`SELECT code, language, translator_name FROM translations ORDER BY code`);
  out('per-collection hadith', await sql`SELECT collection, count(*) AS c FROM hadiths GROUP BY collection ORDER BY c DESC`);
  out('root table', await sql`SELECT count(*) AS c FROM quranic_roots`);
  out('word sample', await sql`SELECT word_position, text_arabic, part_of_speech FROM ayah_words ORDER BY ayah_id, word_position LIMIT 8`);
  out('ayahs WITHOUT words', await sql`
    SELECT a.surah_number, a.ayah_number FROM ayahs a
    WHERE NOT EXISTS (SELECT 1 FROM ayah_words w WHERE w.ayah_id = a.id)
    ORDER BY a.surah_number, a.ayah_number LIMIT 30`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
