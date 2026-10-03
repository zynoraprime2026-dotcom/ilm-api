// Fetch complete Quran translations from quran.com API v4
// Usage: node scripts/fetchTranslations.cjs
// Writes: data/tr-{id}.json for each resource
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');

// quran.com resource ids -> our translation codes
const RESOURCES = [
  { id: 31, code: 'fr.hamidullah', language: 'fr', translator: 'Muhammad Hamidullah' },
  { id: 83, code: 'es.garcia', language: 'es', translator: 'Sheikh Isa Garcia' },
  { id: 33, code: 'id.kemenag', language: 'id', translator: 'Indonesian Islamic Affairs Ministry' },
  { id: 234, code: 'ur.jalandhari', language: 'ur', translator: 'Fatah Muhammad Jalandhari' },
  { id: 77, code: 'tr.diyanet', language: 'tr', translator: 'Diyanet Isleri (Turkish Religious Foundation)' },
  { id: 163, code: 'bn.mujiburrahman', language: 'bn', translator: 'Sheikh Mujibur Rahman' },
  { id: 39, code: 'ms.basmeih', language: 'ms', translator: 'Abdullah Muhammad Basmeih' },
  { id: 32, code: 'ha.gumi', language: 'ha', translator: 'Abubakar Gumi' },
  { id: 49, code: 'sw.barwani', language: 'sw', translator: 'Ali Muhsin Al-Barwani' },
  { id: 87, code: 'am.sadiq', language: 'am', translator: 'Sadiq and Sani' },
  { id: 56, code: 'zh.majian', language: 'zh', translator: 'Ma Jian (Simplified Chinese)' },
  { id: 45, code: 'ru.kuliev', language: 'ru', translator: 'Elmir Kuliev' },
  { id: 103, code: 'pt.nasr', language: 'pt', translator: 'Helmi Nasr' },
  { id: 27, code: 'de.bubenheim', language: 'de', translator: 'Frank Bubenheim and Nadeem Elyas' },
];

async function fetchJson(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ilm-api-seeder/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`FAILED ${url}: ${e.message}`);
  }
}

(async () => {
  fs.writeFileSync(path.join(DATA, 'translation-resources.json'), JSON.stringify(RESOURCES));
  for (const r of RESOURCES) {
    const data = await fetchJson(`https://api.quran.com/api/v4/quran/translations/${r.id}`);
    const rows = (data.translations || []).map((t) => ({
      resource_id: t.resource_id,
      text: t.text,
    }));
    fs.writeFileSync(path.join(DATA, `tr-${r.id}.json`), JSON.stringify(rows));
    console.log(`${r.code} (id ${r.id}): ${rows.length} ayahs saved`);
  }
  console.log('DONE');
})().catch((e) => { console.error(e); process.exit(1); });
