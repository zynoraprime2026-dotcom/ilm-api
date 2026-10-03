// Fetch complete word-by-word Quran data from quran.com API v4
// Usage: node scripts/fetchWords.cjs
// Writes: data/qurancom-words.json (array of {verse_key, position, text, translit, trans, audio})
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'qurancom-words.json');

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

async function fetchChapter(chapter) {
  const verses = [];
  let page = 1;
  for (;;) {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${chapter}?words=true&word_fields=text_uthmani,translation,transliteration,audio_url&word_translation_language=en&fields=verse_key&per_page=50&page=${page}`;
    const data = await fetchJson(url);
    for (const v of data.verses || []) {
      for (const w of v.words || []) {
        if (w.char_type_name !== 'word') continue;
        verses.push({
          verse_key: v.verse_key,
          position: w.position,
          text: w.text_uthmani,
          translit: w.transliteration && w.transliteration.text ? w.transliteration.text : null,
          trans: w.translation && w.translation.text ? w.translation.text : null,
          audio: w.audio_url || null,
        });
      }
    }
    if (!data.pagination || page >= data.pagination.total_pages) break;
    page += 1;
  }
  return verses;
}

(async () => {
  const all = [];
  const t0 = Date.now();
  for (let chapter = 1; chapter <= 114; chapter += 4) {
    const group = [];
    for (let c = chapter; c < Math.min(chapter + 4, 115); c += 1) group.push(fetchChapter(c));
    const results = await Promise.all(group);
    results.forEach((r) => all.push(...r));
    process.stdout.write(`chapter ${chapter}-${Math.min(chapter + 3, 114)} done (${all.length} words, ${Math.round((Date.now() - t0) / 1000)}s)\n`);
  }
  fs.writeFileSync(OUT, JSON.stringify(all));
  console.log(`TOTAL WORDS: ${all.length} -> ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
