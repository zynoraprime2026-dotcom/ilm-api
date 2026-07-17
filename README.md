# Ilm API

A unified Islamic knowledge API — Quran, Hadith, Prayer Times, and Du'as — built for developers to integrate into their own apps.

## Stack
- Node.js + Express
- PostgreSQL (relational data: surahs → ayahs → translations, hadith collections → books → hadiths)
- Redis (optional response caching — falls back gracefully if not running)
- `adhan` npm package for prayer time calculations (computed locally, no external calls)
- `public/index.html` — a static docs site served at your deployed root URL, with a self-serve API key signup form. This is the actual "front door" for researchers/scholars/students to visit.

## Setup

**Deploying to production?** See `DEPLOYMENT.md` for a full Railway walkthrough.

For local development:

```bash
npm install
cp .env.example .env
# edit .env with your real DATABASE_URL (and REDIS_URL if using Redis)

# Create the database first, e.g.:
# createdb ilm_api

npm run migrate        # creates all tables
npm run seed:quran     # pulls Quran text + 4 translations from alquran.cloud
npm run seed:tafsir    # pulls Ibn Kathir + Maarif-ul-Quran tafsir (run AFTER seed:quran)
npm run seed:hadith    # pulls all six canonical collections (Kutub al-Sittah)
npm run seed:narrators # starter narrator bios + one sample isnad chain (expand this yourself — see script comments)
npm run seed:roots     # requires manual download first — see scripts/seedRootWords.js header
npm run seed:topics    # starter cross-reference tags (expand yourself — curation, no bulk source)
npm run seed:fiqh      # starter madhab-comparison rulings (expand yourself — curation, no bulk source)
npm run seed:reciters  # registers audio reciters (Alafasy, Husary, Minshawi via everyayah.com)
npm run seed:duas      # inserts starter dua data (expand this yourself)

npm run dev            # starts on http://localhost:4000
```

## Authentication

There are **two separate auth systems** in this API:

1. **Developer API keys** (`x-api-key` header) — gate `/v1/quran`, `/v1/hadith`, `/v1/tafsir`, etc. Self-serve signup:
```bash
curl -X POST http://localhost:4000/v1/developers/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@university.edu"}'
```
This is also available as a form on the docs homepage (`public/index.html`). New keys start on the `free` tier — upgrade to `academic` or `pro` manually in the `api_keys` table for now (bulk export endpoints require one of those tiers).

2. **User accounts** (JWT, `Authorization: Bearer <token>` header) — for people using bookmarking/study lists directly, not through a third-party app. Sign up and log in to get a token:
```bash
curl -X POST http://localhost:4000/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"a-real-password"}'
```
Then use the returned `token` on `/v1/bookmarks` requests. These routes are intentionally NOT behind the developer `x-api-key` gate.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/v1/quran/surahs` | List all 114 surahs |
| GET | `/v1/quran/:surah?translation=en.sahih` | Full surah with translation |
| GET | `/v1/quran/:surah/:ayah` | Single ayah |
| GET | `/v1/quran/translations` | List available translations |
| GET | `/v1/tafsir/sources` | List available tafsir sources |
| GET | `/v1/tafsir/:surah/:ayah?source=` | Tafsir commentary for an ayah |
| GET | `/v1/quran/:surah/:ayah/words` | Word-by-word breakdown (Arabic + root + grammar) |
| GET | `/v1/roots` | List all tagged Arabic roots |
| GET | `/v1/roots/:root/occurrences` | Every ayah where a root appears |
| GET | `/v1/quran/:surah/:ayah/cite?format=bibtex\|apa` | Citation export for an ayah |
| GET | `/v1/hadith/:collection/:number/cite?format=bibtex\|apa` | Citation export for a hadith |
| GET | `/v1/topics` | List thematic cross-reference topics |
| GET | `/v1/topics/:slug` | Ayahs + hadith tagged under a topic |
| GET | `/v1/fiqh/search?topic=fasting` | Fiqh rulings across madhabs for a topic |
| GET | `/v1/fiqh/:id` | Single fiqh ruling |
| GET | `/v1/quran/:surah/:ayah/audio?reciter=alafasy` | Recitation audio URL |
| GET | `/v1/reciters` | List available reciters |
| POST | `/v1/auth/signup` | Create a user account |
| POST | `/v1/auth/login` | Log in, returns a JWT |
| GET/POST | `/v1/bookmarks` | List / create bookmarks (requires login) |
| DELETE | `/v1/bookmarks/:id` | Remove a bookmark (requires login) |
| GET/POST | `/v1/bookmarks/lists` | List / create study lists (requires login) |
| POST | `/v1/developers/signup` | Self-serve API key creation |
| GET | `/v1/quran/export?translation=` | Full Quran dataset — **academic/pro tier only** |
| GET | `/v1/hadith/export?collection=` | Full hadith collection dataset — **academic/pro tier only** |
| GET | `/v1/hadith/collections` | List hadith collections (all six canonical books) |
| GET | `/v1/hadith/search?q=patience` | Full-text search across hadith |
| GET | `/v1/hadith/:collection/:number` | Single hadith |
| GET | `/v1/hadith/:collection/:number/isnad` | Chain of narrators for a hadith |
| GET | `/v1/prayer-times?lat=&lng=&date=&method=` | Computed prayer times |
| GET | `/v1/duas/categories` | List dua categories |
| GET | `/v1/duas/:category` | Du'as in a category |

## Data sources (all open/free)
- Quran text + translations (Sahih International, Yusuf Ali, Pickthall, Hilali-Khan): [Al Quran Cloud API](https://alquran.cloud/api)
- Tafsir (Ibn Kathir, Maarif-ul-Quran): [spa5k/tafsir_api](https://github.com/spa5k/tafsir_api)
- Hadith — all six canonical collections (Bukhari, Muslim, Abu Dawud, Tirmidhi, An-Nasa'i, Ibn Majah): [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)
- Prayer times: computed via [adhan](https://github.com/batoulapps/adhan-js) — no external API needed
- Du'as: starter set included, expand from Hisnul Muslim or your own curation
- Arabic root words/morphology: [Quranic Arabic Corpus](https://corpus.quran.com), fork at [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology) — **requires manual download**, file too large for automated fetch (see script header)
- Isnad/narrator data: **no open structured dataset exists** for this — `seedNarrators.js` is a curation starter, not a bulk import. Expanding this is an ongoing content project, similar to how existing hadith apps built their narrator databases by hand.
- Fiqh/topics: same as narrators — starter curated content, no bulk open dataset exists
- Audio recitation: URLs computed from [everyayah.com](https://everyayah.com)'s public file naming pattern — audio itself is hosted there, not by your API
- Simplified translation (`en.clearquran`): **verify this edition code exists** at `https://api.alquran.cloud/v1/edition` before relying on it — if it 404s, the seeder logs a warning and skips it harmlessly

## Roadmap

**Phase 1 — Content Depth** ✅
- [x] Multiple Quran translations
- [x] Tafsir (Ibn Kathir, Maarif-ul-Quran)
- [x] Full six-book hadith collection
- [x] Isnad chains + narrator biography schema (starter data — needs ongoing curation, no bulk source exists)
- [x] Arabic root-word tagging schema + word-by-word endpoint (needs manual data download — see script)

**Phase 2 — Scholarly/Research Tools** ✅
- [x] Cross-referencing (ayah ↔ hadith by topic — starter data, ongoing curation)
- [x] Arabic root-word search (`/v1/roots/:root/occurrences`, from Phase 1 schema)
- [x] Thematic index across Quran + Hadith (`topics` table + routes)
- [x] Citation export (BibTeX/APA) for both ayahs and hadith
- [x] Madhab comparison view (`/v1/fiqh/search` — starter data, ongoing curation)

**Phase 3 — Student/Accessibility Features** ✅ (this update)
- [x] Simplified/beginner translation mode (`en.clearquran`, flagged via `is_simplified` — verify edition code first, see note above)
- [x] Word-by-word Quran breakdown (built in Phase 1)
- [x] Bookmarking/study lists — full user account system (signup/login/JWT), separate from developer API keys
- [x] Audio recitation links (3 reciters via everyayah.com)
- Note: hadith audio was considered but skipped — no equivalent open/free audio source was found for hadith the way everyayah.com covers Quran

**Phase 4 — Developer/Researcher Portal** ✅
- [x] Public docs site with interactive signup (`public/index.html`) — served at your deployed root URL
- [x] Self-serve signup → auto-generated API key (`POST /v1/developers/signup`)
- [x] Bulk export endpoints (`/v1/quran/export`, `/v1/hadith/export`)
- [x] Usage tiers (free/academic/pro) — bulk export gated to academic/pro via `requireTier` middleware
- Note: an interactive live-query API explorer (try real requests in-browser against your own data) is a natural next addition to `public/index.html` — the sandbox artifact from earlier in this conversation shows the pattern, but it used seeded demo data rather than your real database

**Phase 5 — Trust & Scale** ✅ (this update)
- [x] Source verification metadata (`source_edition` on ayahs/hadith, `publisher`/`source_edition` on tafsir)
- [x] Gzip compression + tuned Postgres connection pooling
- [x] `Cache-Control` headers on rarely-changing reference endpoints
- [x] Public changelog (`CHANGELOG.md`) + `/v1/version` endpoint for stable citation

All five roadmap phases are now built. Natural next steps beyond the roadmap: an actual CDN in front of the deployed API (Cloudflare is the common free choice), and a real production deployment so the docs site is live for people to visit.
