// Quran, hadith, tafsir and fiqh text never changes once seeded, so every read
// of it should be served from the edge, not from Neon. s-maxage lets Vercel's
// CDN hold it for a day and serve stale for a week while revalidating, which is
// what makes a Ramadan traffic spike free instead of fatal. Only successful GETs
// are marked, and never the authenticated 401/429 paths.
const ONE_DAY = 86400;
const ONE_WEEK = 604800;

// Responses that belong to ONE key (usage, budgets) must never be held at the
// edge: the CDN keys its cache on the URL alone, so a shared /v1/usage would
// answer every developer with whichever key called first.
const PER_KEY = ['/v1/usage'];

function immutableCache(req, res, next) {
  if (req.method !== 'GET') return next();
  const full = (req.baseUrl || '') + (req.path || '');
  const perKey = PER_KEY.some((p) => full === p || full.startsWith(p + '/'));
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200 && !perKey) {
      res.set('Cache-Control', `public, s-maxage=${ONE_DAY}, stale-while-revalidate=${ONE_WEEK}`);
    } else {
      res.set('Cache-Control', 'private, no-store');
    }
    return json(body);
  };
  next();
}

module.exports = immutableCache;
