// Comprehensive data-quality audit for ilm-api (read-only)
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const out = (label, rows) => {
  const line = rows.length > 1
    ? rows.map((r) => Object.values(r).join(' | ')).slice(0, 10).join(' ; ')
    : JSON.stringify(rows[0]);
  console.log(label.padEnd(34), line);
};

(async () => {
  out('ayahs total', await sql`SELECT count(*) AS c FROM ayahs`);
  out('ayahs WITH word rows', await sql`SELECT count(DISTINCT ayah_id) AS c FROM ayah_words`);
  out('word rows total', await sql`SELECT count(*) AS c FROM ayah_words`);
  out('word translation null', await sql`SELECT count(*) AS c FROM ayah_words WHERE translation IS NULL`);
  out('word translit null', await sql`SELECT count(*) AS c FROM ayah_words WHERE transliteration IS NULL`);
  out('word pos null', await sql`SELECT count(*) AS c FROM ayah_words WHERE part_of_speech IS NULL`);
  out('word root null', await sql`SELECT count(*) AS c FROM ayah_words WHERE root_id IS NULL`);
  out('tafsir entries', await sql`SELECT count(*) AS c, count(DISTINCT ayah_id) AS ayahs FROM tafsir`);
  out('tafsir sources', await sql`SELECT source, count(*) AS c FROM tafsir GROUP BY source ORDER BY c DESC`);
  out('fiqh rulings', await sql`SELECT count(*) AS c FROM fiqh_rulings`);
  out('hadith total', await sql`SELECT count(*) AS c FROM hadiths`);
  out('hadith arabic null', await sql`SELECT count(*) AS c FROM hadiths WHERE text_arabic IS NULL`);
  out('hadith book_name set', await sql`SELECT count(*) AS c FROM hadiths WHERE book_name IS NOT NULL`);
  out('hadith chapter set', await sql`SELECT count(*) AS c FROM hadiths WHERE chapter_name IS NOT NULL`);
  out('hadith grade set', await sql`SELECT count(*) AS c FROM hadiths WHERE grade IS NOT NULL`);
  out('hadith narrator set', await sql`SELECT count(*) AS c FROM hadiths WHERE narrator IS NOT NULL`);
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
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
