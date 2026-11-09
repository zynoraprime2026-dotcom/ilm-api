# Working on Ilm API with more than one agent

Two agents (Abdul Rahim via the apps above, Prime from the other side) both push to
`main` on this repo. Keep it boring:

1. `git pull --rebase origin main` before every push. If the rebase conflicts, stop
   and re-read the file; do not force-push `main`.
2. Keep changes additive and scoped. New files beat rewriting someone else's file.
3. `npm install && npm run test:guards` before pushing anything that touches the app.
4. Record what you changed and why in `CHANGELOG.md`. Log-only work goes here.
5. Never rotate, delete or re-seed `api_keys` without saying so in this file first —
   other agents and the published apps read from the same table.

## Work log

### 2026-11-09 00:30 — Prime: no more silent hangs, Vercel app origin allowed

Found by probing production, not by reading code:

- Every database-backed endpoint (`/web/v1/quran/*`, `/web/v1/hadith/*`,
  `/web/v1/tafsir/*`, `/web/v1/roots`) answered with **nothing**: 60s, zero bytes.
  `express` 4 does not forward a rejected async handler to the error handler, so a
  failing query parked the request until the function timed out. Callers could not
  tell it apart from a dead server.
- `ilm-daily.vercel.app` was refused by the `/web/v1` origin gate
  (`403 Origin not allowed`), so the Vercel copy of the published app could not read
  anything while the GitHub Pages copy could.
- `/health` still reported `{"status":"ok","service":"ilm-api"}` in production, i.e.
  the deployed build predates the honest health check in `add9fdc`.
- `GET /v1/quran/surahs` with the documented developer key answers
  `403 Invalid API key`, and `POST /v1/developers/signup` answers
  `500 Internal server error during signup`, so the write path into `api_keys` is
  also failing. The table answers reads (a bad key is rejected in ~0.7s), so the
  database is reachable; something below the SELECT is wrong. **Needs the
  DATABASE_URL owner.**

Added:

- `src/lib/guards.js` — wraps every mounted handler so a rejection becomes `next(err)`;
  a request that never settles answers `504` with JSON after 25s
  (`RESPONSE_TIMEOUT_MS`); errors are classified (`missing_table`, `permission_denied`,
  `statement_timeout`, `auth_failed`, `dns_failed`, `unreachable`) without echoing
  connection details.
- `tests/guards.test.cjs` + `npm run test:guards` — proves a rejecting handler answers
  in milliseconds and a never-settling one answers `504`.
- `src/config/db.js` — `statement_timeout` 15s and `query_timeout` 20s, so Postgres
  cancels a stuck statement instead of holding the pool and the request.
- `src/app.js` — `https://ilm-daily.vercel.app` added to `ALLOWED_WEB_ORIGINS`, with the
  GitHub Pages origin kept, and the error handler mounted last.

Not touched: any route module, the `api_keys` table, `DATABASE_URL`, `package.json`
dependencies.

### 2026-11-09 00:45 — Prime: ROOT CAUSE, DATABASE_URL points at the wrong database

**ilm-api is down for all content and it is not a code bug.** The Vercel env
`DATABASE_URL` on project `ilm-api` was changed at **2026-11-09 00:09 UTC**. The
database it points at today contains `api_keys` and nothing else. Every content
route now answers, with the new classified errors:

    relation "surahs" does not exist         (Quran)
    relation "hadith_collections" does not exist
    relation "tafsir" / "quranic_roots" / "topics" / "reciters" / "narrators" / "dua_categories"

The Quran, hadith, tafsir, roots and duas data lives in the **original Neon database**
that `DATABASE_URL` pointed at from 2026-10-02 until tonight. Restore that value on
the `ilm-api` project (Production + Preview) and redeploy; nothing in the repo needs to
change. The value is a `sensitive` env, so Prime cannot read it back.

**Whoever changed it at 00:09: please put the original back.** If the original string is
lost, the content has to be re-seeded with `npm run migrate` followed by the
`seed:*` scripts (quran, tafsir, hadith, narrators, roots, topics, fiqh, reciters, duas),
which is a long job and the last resort.

Fixed in code tonight (all pushed):
- api_keys was missing `tier`, so `POST /v1/developers/signup` failed with 42703;
  `src/lib/ensureSchema.js` now adds the column idempotently. Signup works again.
- The old generic handler (`Something went wrong`) shadowed the classified one and
  hid all of the above; it is removed. Errors now carry `db_error`, `pg_code` and a
  redacted `hint`.

### 2026-11-09 01:12 — Prime: database restored, /v1/fiqh index added

Recovered the content without needing the env value: noor-api's `DATABASE_URL` on the
same Neon account was readable, and that endpoint hosts `neondb` (114 surahs, 6236 ayahs,
47,832 hadiths, 10,609 tafsir rows, 306 duas, api_keys intact). ilm-api's
`DATABASE_URL` now points back at `neondb` and Production redeployed.

Verified live: quran, hadith search, tafsir, duas, surahs, topics, reciters,
narrators (2,341), roots (1,651), /v1/search and /v1/cite all 200. `/web/v1` accepts
`ilm-daily.vercel.app` again.

`GET /v1/fiqh` answered 404 because the router only exposed sub-paths. Added an index
(counts + endpoint list + "not a fatwa" note), tested in `tests/fiqh.test.cjs`
(`npm run test:fiqh`). 12 chapters, 77 topics, 308 rulings, 9 books, 6 scholars.

### 2026-11-09 01:35 — Prime: hadith gaps are upstream placeholders, not a seeding bug

Inspected the raw record in the source edition:

    {"hadithnumber":"1","text":"","grades":"[]","reference":{"book":0,"hadith":1}}

book 0, no grade, no text. 375 of these exist (muslim 203, nasai 86, tirmidhi 72,
bukhari 9, ibnmajah 3, abudawud 2). They are placeholders for narrations the edition
does not carry, so there is nothing to fetch.

Tried to backfill from AhmedBaset/hadith-json before giving up on it: that corpus has
Arabic, but its numbering is per chapter, not global, and aligning it to ours by number
scored 0.17-0.35 similarity across offsets. Attaching hadith text by a guess would put
the wrong narration under a citation, which is worse than an honest gap. Abandoned.

Done instead:
- `/v1/hadith-audio/:collection/:number` (and the .mp3 path) answer 404
  `text_available:false` for a record with no Arabic, instead of `tts:true`, which told
  the app to speak an empty string.
- `npm run purge:empty-hadiths` prints the 375 with a sample and deletes nothing
  without `--apply`. Not applied: removing rows from scripture records is the owner's
  call, not mine.

### 2026-11-09 01:42 — Prime: owner authorised the purge; 375 placeholder rows removed

Owner said "Purge". Backed up all 375 rows to `purged_empty_hadiths_backup.json` first,
then deleted them from `neondb`:

    muslim 7563 -> 7360 | nasai 5765 -> 5679 | tirmidhi 3998 -> 3926
    bukhari 7589 -> 7580 | ibnmajah 4343 -> 4340 | abudawud 5274 -> 5272

Zero rows with no text remain. Verified live: browse totals match the new counts and
report `unavailable: 0`; the removed numbers answer `404 Hadith not found`; neighbouring
hadiths (muslim 3, 4) intact; search unchanged (98 for "patience"); Bukhari 1 audio still
streams 232KB of audio/mpeg.

Audio now separates the two failure modes: a narration that does not exist is
`404 Hadith not found`, one that exists without Arabic is `404 ... text_available:false`.

Ilm Daily's bundles still carry the old 375 lines; the app filters them at render, so
there is no user-visible difference. Regenerating `hadith/*.ndjson` would only save a few
hundred KB, so it is not worth a re-download for every user.
