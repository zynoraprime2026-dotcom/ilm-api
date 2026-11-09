'use strict';

// Zero-dependency client for the Ilm API. Node 18+ (global fetch), Deno, Bun,
// Cloudflare Workers and browsers all work with the same file.
const DEFAULT_BASE = 'https://ilm-api.vercel.app';

class IlmApiError extends Error {
  constructor(message, { status, code, hint, url, body } = {}) {
    super(message);
    this.name = 'IlmApiError';
    this.status = status;
    this.code = code;
    this.hint = hint;
    this.url = url;
    this.body = body;
  }
}

class IlmApi {
  /**
   * @param {object} options
   * @param {string} [options.apiKey] required for /v1 routes, omit to use the public /web tier
   * @param {string} [options.baseUrl]
   * @param {number} [options.timeout]
   * @param {number} [options.retries] retries on 429 and 5xx
   * @param {Function} [options.fetch] inject a fetch implementation
   */
  constructor({ apiKey, baseUrl = DEFAULT_BASE, timeout = 15000, retries = 2, fetch: customFetch } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.timeout = timeout;
    this.retries = retries;
    this._fetch = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!this._fetch) throw new IlmApiError('No fetch available. Pass options.fetch on Node < 18.');
    this.lastRateLimit = null;
  }

  /** The public tier needs no key: /web/v1/... */
  static public(baseUrl = DEFAULT_BASE) {
    const c = new IlmApi({ baseUrl });
    c.webTier = true;
    return c;
  }

  async _request(path, params) {
    const url = new URL(`${this.baseUrl}${this.webTier ? '/web' : ''}/v1${path}`);
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const headers = { accept: 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;

    let attempt = 0;
    for (;;) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      let res, body;
      try {
        res = await this._fetch(url.toString(), { headers, signal: controller.signal });
        const text = await res.text();
        body = text ? JSON.parse(text) : null;
      } catch (e) {
        clearTimeout(timer);
        if (attempt++ >= this.retries) throw new IlmApiError(e.message || 'Network error', { url: url.toString() });
        await sleep(250 * 2 ** attempt);
        continue;
      }
      clearTimeout(timer);

      const limit = res.headers.get('x-ratelimit-limit');
      if (limit) {
        this.lastRateLimit = {
          limit: Number(limit),
          remaining: Number(res.headers.get('x-ratelimit-remaining')),
          reset: Number(res.headers.get('x-ratelimit-reset')),
          dailyLimit: numOrNull(res.headers.get('x-ratelimit-daily-limit')),
          dailyRemaining: numOrNull(res.headers.get('x-ratelimit-daily-remaining')),
        };
      }

      if (res.ok) return body;

      const payload = body && typeof body === 'object' ? body : {};
      const err = new IlmApiError(payload.error || `HTTP ${res.status}`, {
        status: res.status,
        code: payload.pg_code || payload.db_error || payload.reason,
        hint: payload.hint,
        url: url.toString(),
        body,
      });

      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt++ >= this.retries) throw err;

      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
    }
  }

  // ---- meta ----
  status() { return this._request('/status'); }
  usage() { return this._request('/usage'); }
  sources() { return this._request('/sources'); }
  version() { return this._request('/version'); }

  // ---- Quran ----
  quran = {
    surahs: () => this._request('/quran/surahs'),
    translations: () => this._request('/quran/translations'),
    languages: () => this._request('/languages'),
    surah: (number, { translation, language, page, limit } = {}) =>
      this._request(`/quran/${number}`, { translation, language, page, limit }),
    ayah: (surah, ayah, { translation, language } = {}) =>
      this._request(`/quran/${surah}/${ayah}`, { translation, language }),
    offline: ({ translation, language } = {}) => this._request('/quran/offline', { translation, language }),
  };

  // ---- Hadith ----
  hadith = {
    collections: () => this._request('/hadith/collections'),
    collection: (slug, { limit, offset, language } = {}) =>
      this._request(`/hadith/${slug}`, { limit, offset, language }),
    get: (slug, number) => this._request(`/hadith/${slug}/${number}`),
    search: (q, { limit, language, collection } = {}) =>
      this._request('/hadith/search', { q, limit, language, collection }),
  };

  // ---- Tafsir ----
  tafsir = {
    sources: () => this._request('/tafsir/sources'),
    get: (surah, ayah) => this._request(`/tafsir/${surah}/${ayah}`),
  };

  // ---- Other corpora ----
  duas = {
    categories: () => this._request('/duas/categories'),
    category: (slug, opts) => this._request(`/duas/${slug}`, opts),
    random: () => this._request('/duas/random'),
  };
  fiqh = {
    books: () => this._request('/fiqh/books'),
    search: (q, opts) => this._request('/fiqh/search', { q, ...(opts || {}) }),
  };
  roots = { list: (opts) => this._request('/roots', opts) };
  narrators = { list: (opts) => this._request('/narrators', opts) };
  reciters = { list: () => this._request('/reciters') };
  prayerTimes = (params) => this._request('/prayer-times', params);

  /** One call across Quran, hadith, duas and fiqh. Also resolves citations like "2:255". */
  search = (q, { limit, language, only } = {}) => this._request('/search', { q, limit, language, only });
}

function numOrNull(v) { return v === null ? null : Number(v); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = IlmApi;
module.exports.IlmApi = IlmApi;
module.exports.IlmApiError = IlmApiError;
