# ilm-api state (handoff)

Last updated: 2026-11-09 00:35 Africa/Accra (commit add9fdc / db94aa6 across repos).

Any agent picking this repo up should read this file first and then act on the
open issue. It records what is broken, what is already fixed in code, and what
is deliberately not touching.

## Production is down

ilm-api.vercel.app answers static routes but cannot serve any database-backed
route.

Measured, not guessed:

- `GET /v1/quran/1` -> 403 `Invalid API key`
- `POST /v1/developers/signup` -> 500 `Internal server error during signup`
- `GET /web/v1/quran/surahs` -> no response (times out)
- `GET /health` -> old build, only `{status, service}`, no database field

Root cause: the Vercel `DATABASE_URL` was replaced by hand and now points at a
Neon database that does not hold the ilm-api schema. Reads run a query that
returns no rows (403), writes crash on a missing table (500).

Two wrong candidates were already ruled out by their console pages:

- `icy-recipe-77430125` (AWS US East 2 / Ohio, 5 days old)
- `still-darkness-30591691`, database `alhaqq_ops`

The correct project is the one whose endpoint is `ep-gentle-sound-b1uqdhp3`
(AWS Europe Central 1 / Frankfurt). Verify before pasting: in that project's
SQL editor, `select count(*) from ayahs;` must return 6236.

## Production is also behind main

The live deployment predates tonight's commits. `/health` returning no `db`
field is the tell. Redeploy from `main` (head add9fdc) so the diagnostics below
exist in production at all.

## Already fixed in code, waiting on that redeploy

- `38e9e72` unknown `?translation=` codes now 400 with a hint instead of
  returning a surah with zero ayahs.
- `27a166e` per-key rate limiting by tier (60/min free, 600/min pro and
  academic), `X-RateLimit-*` headers, 429 with `Retry-After`.
- `add9fdc` `/health` now probes the pool and reports `db: down` plus a
  classified reason (`auth_failed`, `dns_failed`, `wrong_database`, `timeout`,
  `unreachable`). Same commit strips leading U+FEFF from every JSON response,
  which cleans Al-Fatihah 1:1 for every client without a migration.

## Still open

1. Fix `DATABASE_URL` (owner action, see the issue checklist).
2. Run `node scripts/fix-utf8-bom.cjs` once against the correct database to
   clean the stored rows, not just the response.
3. `/v1/version` should keep tracking package.json; do not hardcode it again.

## Access boundaries (verified 2026-11-09)

| System | Reachable | Notes |
| --- | --- | --- |
| GitHub `zynoraprime2026-dotcom` | yes | admin/push on ilm-api and ilm-daily |
| Vercel | no | every token 403 `Not authorized: scope zynora1` |
| Neon API | no | supplied key returns 401 |

So no agent can change Vercel env vars or read Neon directly. Nobody should
claim otherwise, and nobody should ask the owner to paste a connection string
into a chat.

## House rules

- Never change `DATABASE_URL` without checking `/health` afterwards; that
  mistake took the API down for an hour with no signal.
- Never print a connection string, API key or password in a chat or a commit.
- Commit as `Abdul Rahim Abubakar <zynoraprime2026@gmail.com>`.
- Parse the shipped script before calling a static-site deploy good. A patch
  once orphaned `async` from `async function renderSurah` and shipped a page
  that ran nothing while its own tests passed.
- Definition of done for this incident: `/health` reports `db up`,
  `/v1/quran/1` returns 7 ayahs, and signup returns
  "An API key already exists" rather than 500.
