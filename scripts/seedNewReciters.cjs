// Expand the reciters table with verified everyayah.com audio sources.
// Usage: DATABASE_URL=... node scripts/seedNewReciters.cjs
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const NEW_RECITERS = [
  { slug: 'abdulbasit', name: 'Abdul Basit Abdus Samad (Murattal)', url: 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/' },
  { slug: 'abdulbasit-mujawwad', name: 'Abdul Basit Abdus Samad (Mujawwad)', url: 'https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps/' },
  { slug: 'hudhaify', name: 'Ali Al-Hudhaify', url: 'https://everyayah.com/data/Hudhaify_128kbps/' },
  { slug: 'shaatree', name: 'Abu Bakr Ash-Shaatree', url: 'https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps/' },
  { slug: 'qatami', name: 'Nasser Alqatami', url: 'https://everyayah.com/data/Nasser_Alqatami_128kbps/' },
  { slug: 'dussary', name: 'Yasser Ad-Dussary', url: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/' },
  { slug: 'sudais', name: 'Abdurrahman As-Sudais', url: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/' },
  { slug: 'ghamdi', name: 'Saad Al-Ghamdi', url: 'https://everyayah.com/data/Ghamadi_40kbps/' },
  { slug: 'muaiqly', name: 'Maher Al-Muaiqly', url: 'https://everyayah.com/data/Maher_AlMuaiqly_64kbps/' },
  { slug: 'neana', name: 'Ahmed Neana', url: 'https://everyayah.com/data/Ahmed_Neana_128kbps/' },
];

(async () => {
  for (const r of NEW_RECITERS) {
    await sql.query(
      'INSERT INTO reciters (slug, name, audio_base_url) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name = $2, audio_base_url = $3',
      [r.slug, r.name, r.url]
    );
    console.log(`  added ${r.slug} — ${r.name}`);
  }
  const check = await sql.query('SELECT slug, name FROM reciters ORDER BY name');
  console.log(`TOTAL RECITERS: ${check.length}`);
  for (const c of check) console.log(`  ${c.slug}: ${c.name}`);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
