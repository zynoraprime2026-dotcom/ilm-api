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
    version: '1.6.0',
    description: 'Islamic knowledge API: Quran with translations and tafsir, 34k+ bilingual hadith, duas, comparative fiqh, prayer times, Arabic dictionary and root search, manuscript records via Turath.',
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
  },
};

module.exports = spec;
module.exports.pagedHelper = paged;
