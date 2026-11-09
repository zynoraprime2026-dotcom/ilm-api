# ilm-api

Typed, zero-dependency client for the Ilm API: Quran with 19 translations across
15 languages, 16 hadith collections, tafsir, duas, fiqh, roots, narrators and
prayer times. Works in Node 18+, Bun, Deno, Cloudflare Workers and the browser.

```bash
npm install ilm-api
```

## Quick start

```js
import IlmApi from 'ilm-api';

const ilm = new IlmApi({ apiKey: process.env.ILM_API_KEY });

const surah = await ilm.quran.surah(2, { limit: 5 });
console.log(surah.surah.name_english); // Al-Baqara
for (const ayah of surah.ayahs) console.log(ayah.ayah_number, ayah.translation);
```

No key? Read the public tier, which serves the same content without one:

```js
const ilm = IlmApi.public();
const surahs = await ilm.quran.surahs(); // 114
```

## Citations, not guesses

Readers cite scripture; the search endpoint understands that.

```js
const r = await ilm.search('2:255');        // Ayat al-Kursi
const h = await ilm.search('Bukhari 1');    // first hadith
const k = await ilm.search('Al-Baqarah 255');
```

Each returns `sections.reference` with the resolved record, alongside ordinary
text matches for Quran, hadith, duas and fiqh.

## Errors you can act on

```js
import { IlmApiError } from 'ilm-api';

try {
  await ilm.quran.surah(2, { translation: 'fr' });
} catch (e) {
  if (e instanceof IlmApiError) {
    console.log(e.status, e.code, e.hint);
    // 400, undefined, 'Use ?language=fr for that language's default translation…'
  }
}
```

Unknown translation codes answer 400 rather than silently returning an empty
surah. Retries on 429 and 5xx happen automatically and honour `Retry-After`.

## Pacing yourself

```js
await ilm.quran.surah(1);
console.log(ilm.lastRateLimit);
// { limit: 600, remaining: 599, dailyLimit: 100000, dailyRemaining: 99999, … }

console.log(await ilm.usage()); // tier, minute and day budgets, resets
```

## Everything available

| Call | Returns |
| --- | --- |
| `quran.surahs()` | 114 surahs with metadata |
| `quran.surah(n, { translation, language, page, limit })` | ayahs with Arabic and translation |
| `quran.translations()` | 19 editions with translator names |
| `quran.offline()` | the whole Quran in one payload, for PWA sync |
| `hadith.collections()` / `hadith.collection(slug)` / `hadith.get(slug, n)` | 16 collections |
| `hadith.search(q)` | Arabic or English full text |
| `tafsir.get(surah, ayah)` | Ibn Kathir and Maarif-ul-Quran |
| `duas.categories()` / `duas.category(slug)` | 137 categories |
| `fiqh.books()` / `fiqh.search(q)` | 30 classical manuals |
| `roots.list()` | 1,651 Arabic roots |
| `narrators.list()` / `reciters.list()` | narrator and reciter registries |
| `status()` | is the API and its database alive, with row counts |
| `sources()` | provenance and review state for every edition |

## Offline-first apps

`quran.offline()` returns all 114 surahs with Arabic and one translation in a
single response, which is the cheapest way to seed a PWA once and read forever.
Pair it with `quran.surah()` for later reads.

## License

MIT. The underlying texts carry their own attribution; see `sources()`.
