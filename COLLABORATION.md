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
