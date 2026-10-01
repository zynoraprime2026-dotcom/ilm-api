// Seeds the full Hisn al-Muslim (Fortress of the Muslim) dua collection from
// the official hisnmuslim.com API — 132 chapters, ~250+ duas. Batched for
// HTTPS-only sandboxes. Keeps any existing manually curated duas.
require('dotenv').config();
const fetch = require('node-fetch');
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const CATEGORIES_URL = 'https://www.hisnmuslim.com/api/en/husn_en.json';
const catUrl = (id) => `https://www.hisnmuslim.com/api/en/${id}.json`;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

(async () => {
  console.log('Fetching category list...');
  const res = await fetch(CATEGORIES_URL);
  const raw = await res.text();
  const data = JSON.parse(Buffer.from(raw, 'utf-8').toString('utf8').replace(/^\uFEFF/, ''));
  const categories = data['English'];
  console.log(`Found ${categories.length} chapters.`);

  for (const cat of categories) {
    const slug = slugify(cat.TITLE);
    let duas = [];
    try {
      const cres = await fetch(catUrl(cat.ID));
      if (cres.ok) {
        const craw = await cres.text();
        const cdata = JSON.parse(craw.replace(/^\uFEFF/, ''));
        const titleKey = Object.keys(cdata)[0];
        duas = cdata[titleKey] || [];
      }
    } catch (e) { /* skip chapter on error */ }

    // Upsert category
    await sql.query(
      `INSERT INTO dua_categories (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
      [cat.TITLE, slug]
    );
    const catRow = await sql.query('SELECT id FROM dua_categories WHERE slug = $1', [slug]);
    const categoryId = catRow[0].id;

    if (duas.length === 0) { console.log(`  ${slug}: no duas fetched, category only`); continue; }

    for (const batch of chunk(duas, 50)) {
      const values = [], params = [];
      batch.forEach((d, i) => {
        const o = i * 6;
        values.push(`($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6})`);
        params.push(categoryId,
                    (d.LANGUAGE_ARABIC_TRANSLATED_TEXT || cat.TITLE).trim(),
                    d.ARABIC_TEXT || '',
                    null,
                    d.TRANSLATED_TEXT || '',
                    'Hisn al-Muslim (hafiz.al) — ' + cat.TITLE);
      });
      await sql.query(
        `INSERT INTO duas (category_id, title, text_arabic, transliteration, translation, reference)
         VALUES ${values.join(',')}`,
        params
      );
    }
    console.log(`  ${slug}: ${duas.length} duas`);
  }

  const count = await sql.query('SELECT COUNT(*) FROM duas');
  console.log(`Done. Total duas in DB: ${count[0].count}`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
