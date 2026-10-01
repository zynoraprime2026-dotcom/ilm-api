// Builds a real narrator/isnad layer by extracting the "Narrated X:" prefix
// from every hadith text and linking narrators to hadiths via isnad_chains
// (chain_position 1 = the companion/successor who narrated it). Derived
// directly from the fawazahmed0 dataset text — names appear exactly as
// written in the collections. Batched for HTTPS-only sandboxes.
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

(async () => {
  console.log('Loading all hadith narrator prefixes...');
  const hadiths = await sql.query(
    `SELECT h.id, h.narrator FROM hadiths h WHERE h.narrator IS NOT NULL AND h.narrator <> ''`
  );
  console.log(`Hadiths with an extracted narrator: ${hadiths.length}`);

  // Distinct narrator names
  const nameCount = {};
  for (const h of hadiths) nameCount[h.narrator] = (nameCount[h.narrator] || 0) + 1;
  const names = Object.keys(nameCount);
  console.log(`Distinct narrator names: ${names.length}`);

  // Clear old derived links (keeps the 4 curated sample narrators and their chains)
  console.log('Rebuilding narrator table (curated bios preserved)...');
  const kept = await sql.query(
    `SELECT * FROM narrators WHERE bio IS NOT NULL OR generation IS NOT NULL`
  );
  const keptNames = new Set(kept.map(r => r.name_english));
  await sql.query('DELETE FROM isnad_chains WHERE narrator_id IN (SELECT id FROM narrators WHERE bio IS NULL AND generation IS NULL)');
  await sql.query('DELETE FROM narrators WHERE bio IS NULL AND generation IS NULL');

  // Insert narrators (batched) with occurrence counts.
  // UNIQUE(name_english, kunya) treats NULL kunya as always-distinct, so we
  // must EXCLUDE curated narrator names from the insert to avoid duplicates.
  const nameIdMap = {};
  const toInsert = names.filter(n => !keptNames.has(n));
  for (const batch of chunk(toInsert, 200)) {
    const values = [], params = [];
    batch.forEach((name, i) => {
      const o = i * 2;
      values.push(`($${o+1},$${o+2})`);
      params.push(name, nameCount[name]);
    });
    const rows = await sql.query(
      `INSERT INTO narrators (name_english, bio)
       VALUES ${values.join(',')}
       ON CONFLICT (name_english, kunya) DO UPDATE SET bio = narrators.bio
       RETURNING id, name_english`,
      params
    );
    for (const r of rows) nameIdMap[r.name_english] = r.id;
  }
  // kept narrators may also be narrator names — map them too
  for (const k of kept) if (!nameIdMap[k.name_english]) nameIdMap[k.name_english] = k.id;

  // occurrence counts as a proxy stat: store in bio? No — narrators.bio is for
  // real bios. Skip counts in DB; report here.
  console.log(`Narrators in DB now: ${Object.keys(nameIdMap).length}`);

  // Link chains: chain_position = 1 for every hadith
  console.log('Linking isnad chains...');
  let linked = 0;
  const links = hadiths
    .filter(h => nameIdMap[h.narrator])
    .map(h => [h.id, nameIdMap[h.narrator]]);
  for (const batch of chunk(links, 200)) {
    const values = [], params = [];
    batch.forEach((l, i) => {
      const o = i * 2;
      values.push(`($${o+1},$${o+2},1)`);
      params.push(l[0], l[1]);
    });
    await sql.query(
      `INSERT INTO isnad_chains (hadith_id, narrator_id, chain_position)
       VALUES ${values.join(',')}
       ON CONFLICT (hadith_id, chain_position) DO NOTHING`,
      params
    );
    linked += batch.length;
  }
  console.log(`Linked ${linked} hadiths to their first narrator.`);
  console.log('Narrator/isnad build complete.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
