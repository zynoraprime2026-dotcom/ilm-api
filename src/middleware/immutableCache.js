// Quran, hadith, tafsir and fiqh text never changes once seeded, so every read
// of it should be served from the edge, not from Neon. s-maxage lets Vercel's
// CDN hold it for a day and serve stale for a week while revalidating, which is
// what makes a Ramadan traffic spike free instead of fatal. Only successful GETs
// are marked, and never the authenticated 401/429 paths.
const ONE_DAY = 86400;
const ONE_WEEK = 604800;

function immutableCache(req, res, next) {
  if (req.method !== 'GET') return next();
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      res.set('Cache-Control', `public, s-maxage=${ONE_DAY}, stale-while-revalidate=${ONE_WEEK}`);
    } else {
      res.set('Cache-Control', 'no-store');
    }
    return json(body);
  };
  next();
}

module.exports = immutableCache;
