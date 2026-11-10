# ilm-api

Typed, zero-dependency client for the Ilm API: Quran with word-by-word grammar,
16 hadith collections, tafsir, duas, fiqh, the Mutun Talib al-'Ilm catalogue,
dictionary, roots, narrators and prayer times. One file, no build step, no
dependencies. Node 18+, Bun, Deno, Cloudflare Workers and browsers.

```bash
npm install ilm-api
```

Until the package is on npm, install the tarball from the release:

```bash
npm install https://github.com/zynoraprime2026-dotcom/ilm-api/releases/download/sdk-v1.1.0/ilm-api-1.1.0.tgz
```

## Two tiers, one shape

```js
import IlmApi from 'ilm-api';

const ilm = new IlmApi({ apiKey: process.env.ILM_API_KEY }); // /v1
const web = IlmApi.public();                                  // /web/v1, no key
```

The public tier serves the read-only subset with no key: Quran, tafsir, hadith,
hadith audio, duas, mutoon, dictionary, roots, prayer times and alarm. Everything
else needs a key, and the client says so before it makes a request:

```js
try {
  await web.fiqh.books();
} catch (e) {
  e.code;  // 'KEY_REQUIRED'
  e.hint;  // 'Construct the client with new IlmApi({ apiKey }) to call this route.'
}
```

## Quick start

```js
const surah = await ilm.quran.surah(2, { limit: 5 });
for (const ayah of surah.ayahs) console.log(ayah.ayah_number, ayah.translation);

const { words } = await ilm.quran.words(2, 255);   // position, grammar, root, audio
const hadith = await ilm.hadith.get('bukhari', 1); // text, grade, isnad, citation
const tafsir = await ilm.tafsir.get(2, 255);
```

## Media that behaves like a file

Every audio and PDF is proxied by the API, so it plays cross-origin and saves
with a filename. No third-party CDN in the path.

```js
ilm.quran.audioUrl(2, 255, { reciter: 'ar.alafasy' });            // play
ilm.quran.audioUrl(2, 255, { reciter: 'ar.alafasy', download: true }); // save
ilm.mutoon.streamUrl('al-ajurrumiyyah');
ilm.mutoon.pdfUrl('al-jazariyyah');
ilm.mutoon.lineAudioUrl('al-ajurrumiyyah', 1);
ilm.hadith.audioUrl('bukhari', 1);
ilm.dictionary.audioUrl('كتاب');

const res = await ilm.mutoon.download('al-jazariyyah', { pdf: true });
fs.writeFileSync('al-jazariyyah.pdf', Buffer.from(await res.arrayBuffer()));
```

Streams support byte ranges, so a player can seek without pulling the whole file:

```js
const res = await ilm.media('/mutoon/al-ajurrumiyyah/stream', null, { range: 'bytes=0-1023' });
res.status;                        // 206
res.headers.get('content-range');  // 'bytes 0-1023/6752107'
```

## Mutoon

```js
const cat = await ilm.mutoon.list();        // 29 matns
const paths = await ilm.mutoon.paths();     // 13 study paths, grammar first
const matn = await ilm.mutoon.get('al-ajurrumiyyah');
matn.pdf_available, matn.audio_available;
```

`mutoon.lines()` rejects with status `409` and `{ ingested: false }` for a matn
whose text is catalogued but not loaded. The API never serves partial text, so
treat the 409 as "not available yet", not as a bug.

## Errors you can act on

```js
import { IlmApiError } from 'ilm-api';

try {
  await ilm.quran.surah(2, { translation: 'zz' });
} catch (e) {
  e.name;    // 'IlmApiError'
  e.status;  // 400
  e.hint;    // 'Use ?language=fr for that language's default translation…'
  e.code;    // 'KEY_REQUIRED' | 'TIMEOUT' | 'NETWORK' | pg code, when present
}
```

Retries cover network errors, 429 and 5xx, honour `Retry-After`, and never
re-run a write. Timeouts are per attempt. `ilm.lastRateLimit` carries
`{ limit, remaining, reset, dailyLimit, dailyRemaining }` after every call.

## Extras

```js
ilm.search('2:255');            // one query across Quran, hadith, duas, tafsir, fiqh
ilm.cite('2:255');              // 'Quran 2:255 (Al-Baqara)'
ilm.hadith.isnad('bukhari', 1); // the chain, narrator by narrator
ilm.prayerTimes({ city: 'Accra' });
ilm.alarm.vapid();              // web-push public key
ilm.dictionary.root('كتب');
```

## Types

`index.d.ts` ships with the package and is written against the live responses.
The contract tests in `test/live.test.mjs` hit production, so a change in the API
shows up as a failing test rather than a runtime surprise.

```bash
npm test                       # keyless live tests, no secrets
ILM_API_KEY=ilm_... npm test   # adds the keyed surface
```

## Scope

Covered: every API-key route on `/v1`, and everything the keyless `/web` tier
serves. Not covered: the browser-session flows (`/v1/auth`, `/v1/bookmarks`) and
the developer console key rotation, which are dashboard actions rather than
client calls. `developers.signup()` is included because it self-provisions a key.

MIT.
