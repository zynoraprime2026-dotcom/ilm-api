# Deploying Ilm API to Railway

Railway is recommended here because it gives you Postgres + app hosting in
one place, has a generous free tier to start, and needs almost no config.

## Step 1 — Push the project to GitHub

Railway deploys from a GitHub repo, so the code needs to live there first.

```bash
cd ilm-api
git init
git add .
git commit -m "Initial commit: Ilm API"
```

Then create a new repo on GitHub (via github.com — click "New repository",
name it `ilm-api`, don't initialize with a README since you already have one),
and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ilm-api.git
git branch -M main
git push -u origin main
```

**Important:** make sure `.env` is in `.gitignore` before committing — you
never want real secrets in a public repo. Create one if it's not already there:
```bash
echo "node_modules/
.env" > .gitignore
```
(Run this *before* `git add .` — if you already committed `.env`, remove it
with `git rm --cached .env` and commit again.)

## Step 2 — Create the Railway project

1. Go to [railway.app](https://railway.app) and sign in (GitHub login is easiest)
2. Click **New Project** → **Deploy from GitHub repo** → select `ilm-api`
3. Railway will detect it's a Node.js app and start a first deploy automatically —
   it'll likely fail at this point because there's no database yet. That's expected.

## Step 3 — Add a Postgres database

1. In the same Railway project, click **New** → **Database** → **Add PostgreSQL**
2. Railway provisions it and automatically creates a `DATABASE_URL` variable
3. Click on your app service → **Variables** tab → confirm `DATABASE_URL` is
   there (Railway usually links it automatically via a reference variable;
   if not, copy the value from the Postgres service's Variables tab and add
   it to your app service manually)

## Step 4 — Set the remaining environment variables

On your app service → **Variables** tab, add:
```
JWT_SECRET=<generate a long random string — e.g. run `openssl rand -hex 32` locally>
PORT=4000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
PG_POOL_MAX=20
```
(Skip `REDIS_URL` for now — the app works fine without it, just without caching.)

## Step 5 — Run the migration and seed scripts

Railway gives you a shell into the running service:

1. Click your app service → **Settings** → look for a way to open a shell
   (or install the [Railway CLI](https://docs.railway.app/guides/cli) locally
   and run `railway run npm run migrate` etc. — this is usually the more
   reliable path)

Using the CLI (recommended):
```bash
npm install -g @railway/cli
railway login
railway link          # select your ilm-api project
railway run npm run migrate
railway run npm run seed:quran
railway run npm run seed:hadith
railway run npm run seed:reciters
railway run npm run seed:duas
# tafsir and roots need manual file downloads first — see their script headers
```

**Note on root-word seeding**: `data/` is gitignored (the morphology file is
large and shouldn't live in git). If you want `seed:roots` to work on
Railway, you'll need to get that file onto the deployed filesystem some other
way — e.g. temporarily commit it to a separate branch, or run that one seed
script locally against the Railway database by pointing `DATABASE_URL` in
your local `.env` at Railway's Postgres connection string.

## Step 6 — Get your public URL

Back in the Railway dashboard, your app service → **Settings** → **Networking**
→ **Generate Domain**. This gives you a public `*.up.railway.app` URL —
visiting it should now show the docs site (`public/index.html`).

## Step 7 — Verify

```bash
curl https://your-app.up.railway.app/health
curl -X POST https://your-app.up.railway.app/v1/developers/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

If both return real JSON, you're live.

## Common issues

- **App crashes on boot, logs show connection errors**: `DATABASE_URL` isn't
  set correctly — double check the Variables tab.
- **Migration fails**: usually means `DATABASE_URL` wasn't available when
  `npm run migrate` ran — confirm `railway link` picked the right project.
- **Docs site doesn't show at the root URL**: confirm `public/index.html`
  was actually committed to git (check `.gitignore` didn't accidentally
  exclude it).
