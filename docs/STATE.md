# ilm-api state (handoff)

Last updated: 2026-11-09 02:05 Africa/Accra. The database-level handoff below is
**done**; its numbers are recorded here so nobody re-derives them at 2am.

Read order for a new agent: this file, then the section for whatever is still
open. Nothing in "Production is down" is current any more; it is kept only as
the record of what went wrong and how to avoid repeating it.

## Current state: healthy (verified 2026-11-09 02:00-02:05 UTC)

| Check | Result |
| --- | --- |
| `GET /health` | `status: ok`, `db: up`, version 1.6.0, no `db_error` |
| `GET /v1/status` | 114 surahs, 6,236 ayahs, 47,457 hadiths, 10,609 tafsir, 306 duas |
| `GET /v1/quran/1` | 7 ayahs; 1:1 no longer starts with U+FEFF |
| Public tables | 65 |
| Hadith collections | 16 |

Counts taken directly from the database on the same day agree with the API to
the row: surahs 114, ayahs 6,236, translations 19 (`ayah_translations` 118,484),
hadiths 47,457, hadith collections 16, tafsir 10,609, duas 306, `ayah_words`
77,429.

## What the outage was (resolved)

The Vercel `DATABASE_URL` had been replaced by hand and pointed at a Neon
database holding only `api_keys`, so every database-backed route failed:
`/v1/quran/1` answered 403 `Invalid API key`, signup crashed 500 on a missing
`tier` column, `/web/*` timed out, and `/health` was an old build with no `db`
field. Restoring the correct project's connection string fixed reads; the code
fixes below fixed the silence around it.

Two data points worth keeping, because they cost the most time:

- A 403 on a bad key and a 403 with no rows to join look identical from outside.
  `/health` now distinguishes `auth_failed`, `dns_failed`, `wrong_database`,
  `timeout`, `unreachable` for exactly this reason.
- A generic error handler was swallowing the real Postgres codes (`42703`,
  `42P01`). Anything that catches and returns "Internal server error" removes
  the only evidence a person on the outside has.

## Deployed and verified since then

- `38e9e72` unknown `?translation=` codes 400 with a hint instead of an empty surah.
- `27a166e` per-key rate limiting by tier, `X-RateLimit-*`, 429 with `Retry-After`.
- `add9fdc` `/health` database probe and the response-edge U+FEFF strip.
- Fiqh routing covers 12 chapters / 77 topics.
- Hadith browse hides no-text placeholders and reports an `unavailable` count;
  a single such narration answers 404 with `text_available: false` instead of
  returning an empty body, and hadith audio answers 404 rather than asking TTS to
  speak an empty string.

## Hadith totals: closed, both endpoints say 47,457

The open question was `/v1/status` = 47,457 against per-collection totals summing
to 47,832. Run on 2026-11-09 against the live database:

```sql
select coalesce(c.slug,'(orphan)') as collection, count(*) as rows
  from hadiths h left join hadith_collections c on c.id = h.collection_id
 group by 1 order by 2 desc;
```

| Collection | Rows |
| --- | --- |
| bukhari | 7,580 |
| muslim | 7,360 |
| nasai | 5,679 |
| abudawud | 5,272 |
| mishkat | 4,428 |
| ibnmajah | 4,340 |
| tirmidhi | 3,926 |
| malik | 1,985 |
| riyad | 1,896 |
| bulugh | 1,767 |
| ahmed | 1,374 |
| adab | 1,326 |
| shamail | 402 |
| nawawi40 | 42 |
| dehlawi40 | 40 |
| qudsi40 | 40 |
| **sum** | **47,457** |

No orphans. The per-collection endpoints were re-summed live the same day and
also total 47,457, so the API no longer quotes two totals.

**Why 47,832 was wrong, in one line:** it was measured before the 375 no-text
placeholder rows were purged from `hadiths`. 47,457 + 375 = 47,832 exactly, and
the same 16 collections sum to 47,457 now. Nothing was ever double-counted and no
listing was joining; one figure was simply stale. Lesson worth keeping: a number
quoted in a handoff is a measurement with a timestamp, not a fact.

## BOM cleanup: done on the stored rows

`node scripts/fix-utf8-bom.cjs` was run once on 2026-11-09 against this database:

```
ayahs.text_arabic:    cleaned 1 row(s)
hadiths.text_arabic:  cleaned 0 row(s)
duas.text_arabic:     cleaned 0 row(s)
tafsir.text:          cleaned 0 row(s)
```

The one stored BOM was Al-Fatihah 1:1, the verse every recitation opens with.
A second run cleaned 0 across all four tables, so the script is idempotent as
advertised, and a follow-up query finds no leading U+FEFF in those four columns
and none embedded anywhere in `ayahs.text_arabic`. `/v1/quran/1` confirms it from
the outside: 7 ayahs, 1:1 starts with ب, not with an invisible character.

## Tables verified present

65 tables in `public`, including every one the API joins on. Column counts for
the core set, from `information_schema`: ayahs 7, surahs 7, hadiths 12,
hadith_collections 5, tafsir 6, duas 7, ayah_words 9, quranic_roots 5,
translations 5, reciters 4, narrators 9, topics 4, fiqh_rulings 8, api_keys 6,
dictionary_words 8, adhkar_progress 5. None missing, which settles the "database
with only api_keys in it" failure mode for good.

## Still open

1. `/v1/version` should keep tracking package.json; do not hardcode it again.
2. 375 narrations of the upstream `fawazahmed0/hadith-api` edition are
   intentionally absent (the edition ships them with empty text). They are not
   recoverable from that source and were deliberately not backfilled from a
   differently-numbered corpus: citing the wrong narration is worse than a gap.
   `scripts/purgeEmptyHadiths.cjs` documents the removal; it is not needed again.

## Access boundaries (updated 2026-11-09)

| System | Reachable | Notes |
| --- | --- | --- |
| Database (direct) | yes, with `DATABASE_URL` | an agent sandbox holding it can run DB work; that is how this handoff was completed |
| GitHub `zynoraprime2026-dotcom` | yes | admin/push on ilm-api and ilm-daily |
| Vercel | partly | the stored token deploys `ilm-daily` successfully (verified 2026-11-09); not re-tested against the `ilm-api` project |
| Neon API | no | supplied key returns 401 |

Nobody should ask the owner to paste a connection string into a chat, and nobody
should print one into a commit or a transcript.

## House rules

- Never change `DATABASE_URL` without checking `/v1/status` (or `/health`)
  afterwards; that mistake took the API down for an hour with no signal.
- Never print a connection string, API key or password in a chat or a commit.
- Commit as `Abdul Rahim Abubakar <zynoraprime2026@gmail.com>`.
- Parse the shipped script before calling a static-site deploy good. A patch once
  orphaned `async` from `async function renderSurah` and shipped a page that ran
  nothing while its own tests passed.
- Definition of done for the outage: `/health` reports `db up`, `/v1/quran/1`
  returns 7 ayahs, and signup returns "An API key already exists" rather than
  500. The first two are met and re-verified above.

## SDK release

`sdk/` publishes as `ilm-api`. `.github/workflows/publish-sdk.yml` releases it on
a `sdk-v*` tag once the repo has an `NPM_TOKEN` secret; without that secret the
job stops at the publish step.
