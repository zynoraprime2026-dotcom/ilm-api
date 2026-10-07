// Shared Express app — used by src/server.js (local/Replit) and api/index.js (Vercel)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const apiKeyAuth = require('./middleware/apiKeyAuth');
const quranRoutes = require('./routes/quran');
const hadithRoutes = require('./routes/hadith');
const prayerTimesRoutes = require('./routes/prayerTimes');
const duasRoutes = require('./routes/duas');
const narratorsRoutes = require('./routes/narrators');
const tafsirRoutes = require('./routes/tafsir');
const rootsRoutes = require('./routes/roots');
const topicsRoutes = require('./routes/topics');
const fiqhRoutes = require('./routes/fiqh');
const reciterRoutes = require('./routes/reciters');
const authRoutes = require('./routes/auth');
const bookmarksRoutes = require('./routes/bookmarks');
const developersRoutes = require('./routes/developers');
const path = require('path');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...require('helmet').contentSecurityPolicy.getDefaultDirectives(),
      // Allow Google Fonts styles
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'script-src': ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(compression());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Serve static docs/landing page
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// Public health check — no API key needed
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ilm-api' }));

// GET /v1/version — for researchers who need to cite a stable API version
app.get('/v1/version', (req, res) => {
  res.json({
    version: '1.4.0',
    changelog_url: 'See CHANGELOG.md in the project repository',
  });
});

// GET /v1/languages — the app-wide language registry. One ?language=xx setting
// works across modules; this endpoint reports what each language can serve.
app.get('/v1/languages', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  const { LANGUAGES, QURAN_TRANSLATIONS, HADITH_CODES } = require('./config/languages');
  const db = require('./config/db');

  const [quran, hadith] = await Promise.all([
    db.query('SELECT language, count(*) AS c FROM translations GROUP BY language'),
    db.query(
      `SELECT 'ar' AS code, count(*) FILTER (WHERE text_arabic IS NOT NULL AND text_arabic <> '') AS c FROM hadiths
       UNION ALL SELECT 'en', count(*) FILTER (WHERE text_english IS NOT NULL AND text_english <> '') FROM hadiths
       UNION ALL SELECT t.language, count(*) FROM hadith_translations t GROUP BY t.language`
    ),
  ]);

  const quranCount = {};
  quran.rows.forEach((r) => { quranCount[r.language] = parseInt(r.c, 10); });
  const hadithCount = {};
  hadith.rows.forEach((r) => {
    const canon = r.code === 'ben' ? 'bn' : r.code === 'fra' ? 'fr' : r.code === 'ind' ? 'id'
      : r.code === 'rus' ? 'ru' : r.code === 'tur' ? 'tr' : r.code === 'urd' ? 'ur' : r.code === 'tam' ? 'ta' : r.code;
    if (canon) hadithCount[canon] = parseInt(r.c, 10);
  });

  const languages = Object.entries(LANGUAGES).map(([code, l]) => ({
    code,
    name: l.name,
    native_name: l.native,
    quran: code === 'ar'
      ? { available: true, note: 'base text (text_arabic) — pass ?language=ar to receive Arabic without a translation' }
      : quranCount[code] ? { available: true, verses: quranCount[code], preferred_translation: (QURAN_TRANSLATIONS[code] || null) } : { available: false },
    hadith: hadithCount[code] ? { available: true, hadiths: hadithCount[code] } : { available: false },
    duas: code === 'en' ? { available: true } : { available: false },
    tafsir: code === 'en' ? { available: true } : { available: false },
    fiqh: code === 'en' ? { available: true } : { available: false },
  }));

  res.json({
    note: 'Pass ?language=<code> to any endpoint. Modules without data in that language fall back to English and mark it in the response.',
    languages,
  });
});

// Machine-readable endpoint listing, kept at /v1/meta for tooling that wants it
app.get('/v1/meta', (req, res) => {
  res.json({
    name: 'Ilm API',
    description: "A unified Islamic knowledge API — Quran, Hadith, Prayer Times, and Du'as",
    endpoints: [
      'GET /v1/version',
      'GET /v1/languages',
      'GET /v1/quran/surahs',
      'GET /v1/quran/export?translation= (academic/pro tier)',
      'GET /v1/quran/:surah?translation=en.sahih',
      'GET /v1/quran/:surah/:ayah',
      'GET /v1/quran/:surah/:ayah/words',
      'GET /v1/quran/translations',
      'GET /v1/quran/:surah/:ayah/cite?format=',
      'GET /v1/quran/:surah/:ayah/audio?reciter=',
      'GET /v1/reciters',
      'POST /v1/developers/signup',
      'POST /v1/auth/signup',
      'POST /v1/auth/login',
      'GET /v1/bookmarks (requires user login)',
      'POST /v1/bookmarks (requires user login)',
      'DELETE /v1/bookmarks/:id (requires user login)',
      'GET /v1/bookmarks/lists (requires user login)',
      'POST /v1/bookmarks/lists (requires user login)',
      'GET /v1/tafsir/sources',
      'GET /v1/tafsir/:surah/:ayah?source=',
      'GET /v1/roots',
      'GET /v1/roots/:root/occurrences',
      'GET /v1/topics',
      'GET /v1/topics/:slug',
      'GET /v1/fiqh/search?topic=',
      'GET /v1/fiqh/:id',
      'GET /v1/hadith/collections',
      'GET /v1/hadith/export?collection= (academic/pro tier)',
      'GET /v1/hadith/search?q=&language=',
      'GET /v1/hadith/languages',
      'GET /v1/hadith/:collection?language=',
      'GET /v1/hadith/search?q=',
      'GET /v1/hadith/:collection/:number',
      'GET /v1/hadith/:collection/:number/isnad',
      'GET /v1/hadith/:collection/:number/cite?format=',
      'GET /v1/prayer-times?lat=&lng=&date=',
      'GET /v1/duas/categories',
      'GET /v1/duas/:category',
      'GET /v1/dictionary/search?q=',
      'GET /v1/dictionary/roots',
      'GET /v1/dictionary/root/:root',
      'GET /v1/dictionary/word/:word',
    ],
  });
});

// User-account routes (signup/login/bookmarks) use their own JWT auth,
// separate from the developer x-api-key gate below — mounted first so they
// aren't blocked by apiKeyAuth.
app.use('/v1/auth', authRoutes);
app.use('/v1/bookmarks', bookmarksRoutes);

// Developer API key signup is public by design — mounted before the gate
app.use('/v1/developers', developersRoutes);

// Prayer times are computed locally (no database) — free teaser endpoint,
// mounted before the API key gate so developers can try it without a key.
app.use('/v1/prayer-times', prayerTimesRoutes);

// Everything else under /v1 requires a developer API key
app.use('/v1', apiKeyAuth);
app.use('/v1/quran', quranRoutes);
app.use('/v1/tafsir', tafsirRoutes);
app.use('/v1/hadith', hadithRoutes);
app.use('/v1/roots', rootsRoutes);
app.use('/v1/topics', topicsRoutes);
app.use('/v1/fiqh', fiqhRoutes);
app.use('/v1/reciters', reciterRoutes);
app.use('/v1/duas', duasRoutes);
app.use('/v1/narrators', narratorsRoutes);
const dictionaryRoutes = require('./routes/dictionary');
app.use('/v1/dictionary', dictionaryRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;
