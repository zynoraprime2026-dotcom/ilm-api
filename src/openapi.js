// OpenAPI 3.0 description of the Ilm API. Served at /openapi.json (public) and
// rendered by /docs, so a developer or an LLM agent can discover the API
// without reading source.
const BASE = 'https://ilm-api.vercel.app';

const paged = (name, itemRef) => ({
  type: 'object',
  properties: {
    count: { type: 'integer' },
    total: { type: 'integer' },
    limit: { type: 'integer' },
    offset: { type: 'integer' },
    has_more: { type: 'boolean' },
    [name]: { type: 'array', items: itemRef },
  },
});

const common = {
  limit: { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Page size' },
  offset: { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Rows to skip' },
  excerpt: { name: 'excerpt', in: 'query', schema: { type: 'integer' }, description: 'Truncate long text fields to this many characters' },
  compact: { name: 'compact', in: 'query', schema: { type: 'boolean' }, description: 'Shorthand for excerpt=400' },
  fields: { name: 'fields', in: 'query', schema: { type: 'string' }, description: 'Comma-separated projection, e.g. hadith_number,text_english' },
  language: { name: 'language', in: 'query', schema: { type: 'string', default: 'en' }, description: 'Language code, see /v1/languages' },
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Ilm API',
    version: '1.7.0',
    description: 'Islamic knowledge API: Quran with translations and tafsir, 47k+ bilingual hadith across 16 collections, duas, comparative fiqh, prayer times, Arabic dictionary and root search, manuscript records via Turath.\n\nAuthenticate with the x-api-key header on every /v1 request. Free tier: 60 requests a minute, 2,000 a day; every response carries X-RateLimit-* headers and GET /v1/usage reports the budget. Sign up self-serve at POST /v1/developers/signup; rotate or revoke with POST /v1/developers/keys/rotate or /revoke.\n\nData note: numbers missing from a collection return 404 rather than an empty record. Where the edition this data was seeded from carried a placeholder instead of text, the segment was removed rather than shown blank, so a handful of printed numbers (375 of 47,457, mostly in Sahih Muslim) have no record here. Treat a 404 as absent, not broken.',
    contact: { name: 'Zynora AI', url: BASE },
  },
  servers: [{ url: BASE, description: 'Production' }],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key', description: 'Developer API key' },
    },
  },
  paths: {
    '/health': { get: { summary: 'Liveness probe', security: [], responses: { 200: { description: 'Service up' } } } },
    '/v1/version': { get: { summary: 'API and dataset version', responses: { 200: { description: 'Version info' } } } },
    '/v1/languages': {
      get: { summary: 'Supported languages for ?language=', responses: { 200: { description: 'Language registry' } } },
    },
    '/v1/prayer-times': {
      get: {
        summary: 'Prayer times for a city and date',
        parameters: [
          { name: 'city', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'method', in: 'query', schema: { type: 'string', default: 'MuslimWorldLeague' } },
        ],
        responses: { 200: { description: 'Times for fajr through isha' } },
      },
    },
    '/v1/quran/{surah}': {
      get: {
        summary: 'A whole surah, optionally paginated',
        parameters: [
          { name: 'surah', in: 'path', required: true, schema: { type: 'integer', minimum: 1, maximum: 114 } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          common.limit, common.language,
        ],
        responses: { 200: { description: 'Surah with ayahs' }, 404: { description: 'Surah not found' } },
      },
    },
    '/v1/quran/{surah}/{ayah}': {
      get: {
        summary: 'A single ayah with translation',
        parameters: [
          { name: 'surah', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'ayah', in: 'path', required: true, schema: { type: 'integer' } },
          common.language,
        ],
        responses: { 200: { description: 'Ayah' }, 404: { description: 'Ayah not found' } },
      },
    },
    '/v1/tafsir/{surah}/{ayah}': {
      get: {
        summary: 'Tafsir commentary for an ayah',
        parameters: [
          { name: 'surah', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'ayah', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'source', in: 'query', schema: { type: 'string' } },
          common.excerpt, common.compact, common.fields,
        ],
        responses: { 200: { description: 'Tafsir entries' }, 404: { description: 'No tafsir' } },
      },
    },
    '/v1/hadith/search': {
      get: {
        summary: 'Search hadith, ranked by relevance',
        description: 'Arabic-script queries search the Arabic text automatically; Latin queries search translations.',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'collection', in: 'query', schema: { type: 'string' }, description: 'bukhari, muslim, tirmidhi, ...' },
          { name: 'grade', in: 'query', schema: { type: 'string' }, description: 'Filter by authenticity, e.g. sahih' },
          { name: 'book', in: 'query', schema: { type: 'integer' }, description: 'Book number within the collection' },
          common.language, common.limit, common.offset, common.excerpt, common.compact, common.fields,
        ],
        responses: { 200: { description: 'Ranked matches with total and has_more' } },
      },
    },
    '/v1/hadith/{collection}': {
      get: {
        summary: 'Browse a collection page by page',
        parameters: [
          { name: 'collection', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'book', in: 'query', schema: { type: 'integer' } },
          common.limit,
        ],
        responses: { 200: { description: 'Page of hadith' } },
      },
    },
    '/v1/cite': {
      get: {
        summary: 'Build a canonical citation',
        description: 'Returns a stable reference, source text in both languages and a URL. Use this instead of assembling references by hand.',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['ayah', 'hadith'] } },
          { name: 'surah', in: 'query', schema: { type: 'integer' } },
          { name: 'ayah', in: 'query', schema: { type: 'integer' } },
          { name: 'collection', in: 'query', schema: { type: 'string' } },
          { name: 'number', in: 'query', schema: { type: 'integer' } },
          common.language,
        ],
        responses: { 200: { description: 'Citation object' }, 404: { description: 'Record not found' } },
      },
    },
    '/v1/search': {
      get: {
        summary: 'One query across every corpus',
        description: 'Searches Quran, hadith, duas and fiqh together and returns labelled sections with stable URLs.',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'only', in: 'query', schema: { type: 'string' }, description: 'Comma list of corpora: quran,hadith,duas,fiqh' },
          common.language, common.limit,
        ],
        responses: { 200: { description: 'Results grouped by corpus' } },
      },
    },
    '/v1/duas/search': {
      get: {
        summary: 'Search duas (Arabic, transliteration, translation)',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          common.limit, common.excerpt, common.compact, common.fields,
        ],
        responses: { 200: { description: 'Matching duas' } },
      },
    },
    '/v1/fiqh/search': {
      get: {
        summary: 'Comparative fiqh rulings across the four madhabs',
        parameters: [
          { name: 'topic', in: 'query', schema: { type: 'string' } },
          { name: 'madhab', in: 'query', schema: { type: 'string' } },
          { name: 'chapter', in: 'query', schema: { type: 'string' } },
          common.excerpt, common.compact, common.fields,
        ],
        responses: { 200: { description: 'Rulings with references' } },
      },
    },
    '/v1/dictionary/search': {
      get: {
        summary: 'Arabic dictionary lookup by word or root',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'mode', in: 'query', schema: { type: 'string', enum: ['word', 'root'] } },
        ],
        responses: { 200: { description: 'Glosses' } },
      },
    },
    '/v1/roots': {
      get: {
        summary: 'Quranic roots with occurrence counts',
        description: 'Asking for limit/offset returns an envelope with total and has_more; a plain request returns an array capped at 500 with X-Total-Count.',
        parameters: [common.limit, common.offset, common.excerpt, common.compact, common.fields],
        responses: { 200: { description: 'Roots' } },
      },
    },
    '/v1/narrators/search': {
      get: {
        summary: 'Search hadith narrators by name, kunya or grade',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, common.limit],
        responses: { 200: { description: 'Narrator profiles' } },
      },
    },
    '/v1/hadith/collections': {
      get: {
        summary: 'The hadith collections with live counts',
        description: 'One row per collection: slug, name, narrator counts and how many narrations are currently readable. Use the slug in every other hadith path.',
        responses: { 200: { description: 'Collections' } },
      },
    },
    '/v1/hadith/{collection}/{number}': {
      get: {
        summary: 'One narration: Arabic, translation, grade, reference',
        parameters: [
          { name: 'collection', in: 'path', required: true, schema: { type: 'string' }, description: 'Collection slug from /v1/hadith/collections, e.g. bukhari' },
          { name: 'number', in: 'path', required: true, schema: { type: 'string' }, description: 'Number as printed in the collection' },
          common.language,
        ],
        responses: { 200: { description: 'Narration' }, 404: { description: 'No narration at that number. Whether a number exists in print and whether this edition carries it are not the same thing; see the note in the API description.' } },
      },
    },
    '/v1/hadith/{collection}/{number}/isnad': {
      get: {
        summary: 'The chain of narration for one hadith',
        description: 'Narrators in order with their grades where known, plus the compiler biography link.',
        parameters: [
          { name: 'collection', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'number', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Isnad chain' }, 404: { description: 'No chain recorded for that narration' } },
      },
    },
    '/v1/hadith-audio/{collection}/{number}': {
      get: {
        summary: 'Recitation audio for one hadith',
        description: 'Returns audio/mpeg bytes when a recitation exists. A narration that exists but carries no Arabic answers 404 with text_available: false, which is different from a number that does not exist at all.',
        parameters: [
          { name: 'collection', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'number', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'MP3 bytes', content: { 'audio/mpeg': {} } }, 404: { description: 'No audio or no Arabic text' } },
      },
    },
    '/v1/quran/{surah}/{ayah}/words': {
      get: {
        summary: 'Word-by-word Arabic with transliteration, grammar and root',
        parameters: [
          { name: 'surah', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'ayah', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Word segments' } },
      },
    },
    '/v1/duas/categories': {
      get: {
        summary: 'Du’a categories, in the order a person needs them',
        responses: { 200: { description: 'Categories' } },
      },
    },
    '/v1/fiqh/topics': {
      get: {
        summary: 'Fiqh chapters and the topics answered under each',
        responses: { 200: { description: 'Chapters and topics' } },
      },
    },
    '/v1/stories/random': {
      get: {
        summary: 'A random prophetic story',
        parameters: [{ name: 'part', in: 'query', schema: { type: 'integer' }, description: 'Return a specific part instead of a random one' }],
        responses: { 200: { description: 'Story part' } },
      },
    },
    '/v1/usage': {
      get: {
        summary: 'This key’s tier, budget and what it has spent',
        description: 'Per-key, so it is never cached at the edge. Use it to pace yourself instead of discovering the limit through a 429.',
        responses: { 200: { description: 'Usage' }, 401: { description: 'Missing key' } },
      },
    },
    '/v1/developers/signup': {
      post: {
        summary: 'Get a free API key (self-serve, no approval)',
        description: 'Where a mailer is configured the key is emailed to the address and not returned in the response, so signing up with somebody else\u2019s email cannot yield their key; without a mailer it is returned once in the response. If the email already has a key, no key is returned at all: only a masked hint plus the recovery endpoint.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: { 201: { description: 'Key created' }, 200: { description: 'A key already exists for that email; key is null' }, 400: { description: 'Invalid email' } },
        security: [],
      },
    },
    '/v1/developers/keys/revoke': {
      post: {
        summary: 'Delete this key',
        description: 'Authenticated by the key itself. For a compromised key or a project that is finished; sign up again for a new one.',
        responses: { 200: { description: 'Deleted' }, 401: { description: 'Missing key' }, 403: { description: 'Unknown key' } },
      },
    },
    '/v1/developers/keys/recover': {
      post: {
        summary: 'Have your key emailed to you',
        description: 'Answers the same way whether or not the address has a key, and only ever mails the address on file, so it cannot be used to discover who has an account. One email per address per ten minutes. Returns 503 if the API has no mailer configured.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: { 200: { description: 'Generic acknowledgement' }, 400: { description: 'Invalid email' }, 503: { description: 'Email delivery not configured' } },
        security: [],
      },
    },
    '/v1/developers/keys/rotate': {
      post: {
        summary: 'Replace this key with a fresh one',
        description: 'Authenticated by the key itself. The old value stops working immediately, and the row, tier and usage history are kept. This is the way out of a leaked key.',
        responses: { 200: { description: 'New key' }, 401: { description: 'Missing key' }, 403: { description: 'Unknown key' } },
      },
    },
  },
};

module.exports = spec;
module.exports.pagedHelper = paged;
