// Audit part 4: word integrity + remaining tables/stats
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const out = (label, rows) => {
  const line = rows.length > 1
    ? rows.map((r) => Object.values(r).join(' | ')).slice(0, 14).join(' ; ')
    : JSON.stringify(rows[0]);
  console.log(label.padEnd(34), line);
};

(async () => {
  out('ALL TABLES (full)', await sql`
    SELECT string_agg(table_name, ', ' ORDER BY table_name) AS t FROM information_schema.tables
    WHERE table_schema='public'`);
  out('FULL ayah 1:1+1:2 words', await sql`
    SELECT w.word_position, w.text_arabic, w.part_of_speech
    FROM ayah_words w JOIN ayahs a ON a.id = w.ayah_id
    WHERE a.surah_number IN (1,2) AND a.ayah_number = 1
    ORDER BY a.surah_number, w.word_position`);
  out('FULL ayah 1:2 words', await sql`
    SELECT w.word_position, w.text_arabic
    FROM ayah_words w JOIN ayahs a ON a.id = w.ayah_id
    WHERE a.surah_number = 1 AND a.ayah_number = 2
    ORDER BY w.word_position`);
  out('FULL ayah 2:255 (Ayat al-Kursi) words', await sql`
    SELECT w.word_position, w.text_arabic
    FROM ayah_words w JOIN ayahs a ON a.id = w.ayah_id
    WHERE a.surah_number = 2 AND a.ayah_number = 255
    ORDER BY w.word_position`);
  out('ayah text 1:2 (reference)', await sql`
    SELECT text_arabic FROM ayahs WHERE surah_number=1 AND ayah_number=2`);
  out('ayah text 2:255 (reference)', await sql`
    SELECT text_arabic FROM ayahs WHERE surah_number=2 AND ayah_number=255`);
  out('reciters', await sql`SELECT count(*) AS c FROM reciters`);
  out('translations', await sql`SELECT code, language, translator_name FROM translations ORDER BY code`);
  out('per-collection hadith', await sql`SELECT collection, count(*) AS c FROM hadiths GROUP BY collection ORDER BY c DESC`);
  out('root table', await sql`SELECT count(*) AS c FROM quranic_roots`);
  out('hadith_books rows', await sql`SELECT count(*) AS c FROM hadith_books`);
  out('dua_categories', await sql`SELECT count(*) AS c FROM dua_categories`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
