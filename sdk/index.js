'use strict';

// Zero-dependency client for the Ilm API. Node 18+ (global fetch), Deno, Bun,
// Cloudflare Workers and browsers all run the same file.
//
// Two tiers, one shape:
//   new IlmApi({ apiKey })  -> /v1      (your key, your quota)
//   IlmApi.public()         -> /web/v1  (keyless, origin-gated, read-only subset)
//
// The client knows which routes exist on the public tier, so a keyless call to a
// key-only endpoint fails immediately with a clear reason instead of a bare 404.

const DEFAULT_BASE = 'https://ilm-api.vercel.app';

// Route groups mounted under /web/v1 in src/app.js. Everything else on /v1 needs
// an API key. Keep this list in step with that file.
const WEB_TIER_ROUTES = [
  'prayer-times',
  'alarm',
  'quran',
  'tafsir',
  'hadith',
  'hadith-audio',
  'mutoon',
  'duas',
  'dictionary',
  'roots',
];

class IlmApiError extends Error {
  constructor(message, { status, code, hint, url, body, tier } = {}) {
    super(message);
    this.name = 'IlmApiError';
    this.status = status;
    this.code = code;
    this.hint = hint;
    this.url = url;
    this.body = body;
    if (tier) this.tier = tier;
  }
}

class IlmApi {
  /**
   * @param {object} [options]
   * @param {string} [options.apiKey] required for /v1 routes; omit for the public tier
   * @param {string} [options.baseUrl]
   * @param {number} [options.timeout] per attempt, ms
   * @param {number} [options.retries] retries on network errors, 429 and 5xx
   * @param {Function} [options.fetch] inject a fetch implementation
   * @param {'v1'|'web'} [options.tier]
   */
  constructor({ apiKey, baseUrl = DEFAULT_BASE, timeout = 15000, retries = 2, fetch: customFetch, tier } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.timeout = timeout;
    this.retries = retries;
    this.tier = tier || (apiKey ? 'v1' : 'web');
    this._fetch = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
    if (!this._fetch) throw new IlmApiError('No fetch available. Pass options.fetch on Node < 18.');
    this.lastRateLimit = null;
  }

  /** Keyless client against /web/v1. No API key, read-only subset, browser-safe. */
  static public(baseUrl = DEFAULT_BASE) {
    return new IlmApi({ baseUrl, tier: 'web' });
  }

  /** True when this route group is served without a key. */
  static keyless(p) {
    const group = String(p).replace(/^\/+/, '').split(/[/?]/)[0];
    return WEB_TIER_ROUTES.includes(group);
  }

  /** Prefix a path for this client's tier: '/quran/2' -> '/v1/quran/2' or '/web/v1/quran/2'. */
  path(p) {
    const clean = String(p).replace(/^\/+/, '');
    return `${this.tier === 'web' ? '/web' : ''}/v1/${clean}`;
  }

  /** Absolute URL for a path, with query params. Used for media and for sharing. */
  url(p, params) {
    const u = new URL(`${this.baseUrl}${this.path(p)}`);
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  async request(p, params, opts = {}) {
    if (this.tier === 'web' && !IlmApi.keyless(p)) {
      throw new IlmApiError(
        `GET /v1/${String(p).replace(/^\/+/, '')} needs an API key; the public tier does not serve it`,
        {
          code: 'KEY_REQUIRED',
          status: 401,
          tier: 'web',
          hint: 'Construct the client with new IlmApi({ apiKey }) to call this route.',
        }
      );
    }

    const { method = 'GET', body, headers: extraHeaders, signal: outerSignal } = opts;
    const url = this.url(p, params);
    const headers = Object.assign({ accept: 'application/json' }, extraHeaders || {});
    if (this.apiKey) headers['x-api-key'] = this.apiKey;
    if (body !== undefined) headers['content-type'] = 'application/json';

    // A retry must not re-run a write.
    const canRetry = method === 'GET' || method === 'HEAD';

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      const onAbort = () => controller.abort();
      if (outerSignal) {
        if (outerSignal.aborted) controller.abort();
        else outerSignal.addEventListener('abort', onAbort, { once: true });
      }

      let res, text;
      try {
        res = await this._fetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
        text = await res.text();
      } catch (e) {
        clearTimeout(timer);
        if (outerSignal) outerSignal.removeEventListener('abort', onAbort);
        const aborted = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
        const err = new IlmApiError(
          aborted ? `Request timed out after ${this.timeout}ms` : (e && e.message) || 'Network error',
          { code: aborted ? 'TIMEOUT' : 'NETWORK', url, tier: this.tier }
        );
        if (!canRetry || attempt >= this.retries) throw err;
        await sleep(backoff(attempt));
        continue;
      }
      clearTimeout(timer);
      if (outerSignal) outerSignal.removeEventListener('abort', onAbort);

      let parsed = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          parsed = null;
        }
      }

      this._readRateLimit(res.headers);

      if (res.ok) return parsed;

      const payload = parsed && typeof parsed === 'object' ? parsed : {};
      const err = new IlmApiError(payload.error || `HTTP ${res.status}`, {
        status: res.status,
        code: payload.pg_code || payload.db_error || payload.reason,
        hint: payload.hint,
        url,
        body: parsed === null && text ? text.slice(0, 500) : parsed,
        tier: this.tier,
      });

      const retryable = res.status === 429 || res.status >= 500;
      if (!canRetry || !retryable || attempt >= this.retries) throw err;

      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff(attempt));
    }
  }

  /**
   * Fetch bytes (audio, PDF) as a Response: pipe it, stream it, or await
   * response.arrayBuffer(). Redirects are followed, so an endpoint that 302s to a
   * recording still hands back the recording.
   */
  async media(p, params, { range, method = 'GET', download = false } = {}) {
    if (this.tier === 'web' && !IlmApi.keyless(p)) {
      throw new IlmApiError(`GET /v1/${String(p).replace(/^\/+/, '')} needs an API key; the public tier does not serve it`, {
        code: 'KEY_REQUIRED',
        status: 401,
        tier: 'web',
        hint: 'Construct the client with new IlmApi({ apiKey }) to stream this file.',
      });
    }
    const merged = download ? Object.assign({}, params || {}, { download: 1 }) : params;
    const url = this.url(p, merged);
    const headers = {};
    if (this.apiKey) headers['x-api-key'] = this.apiKey;
    if (range) headers.range = range;
    const res = await this._fetch(url, { method, headers, redirect: 'follow' });
    if (!res.ok) {
      const body = await res.text();
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        payload = { error: body.slice(0, 300) };
      }
      throw new IlmApiError(payload.error || `HTTP ${res.status}`, {
        status: res.status,
        hint: payload.hint,
        url,
        body: payload,
        tier: this.tier,
      });
    }
    return res;
  }

  _readRateLimit(headers) {
    const limit = headers.get('x-ratelimit-limit');
    if (!limit) return;
    this.lastRateLimit = {
      limit: Number(limit),
      remaining: Number(headers.get('x-ratelimit-remaining')),
      reset: Number(headers.get('x-ratelimit-reset')),
      dailyLimit: numOrNull(headers.get('x-ratelimit-daily-limit')),
      dailyRemaining: numOrNull(headers.get('x-ratelimit-daily-remaining')),
    };
  }

  // ---- service ----
  status() { return this.request('/status'); }
  usage() { return this.request('/usage'); }
  sources() { return this.request('/sources'); }
  version() { return this.request('/version'); }
  meta() { return this.request('/meta'); }
  languages() { return this.request('/languages'); }

  // ---- Quran ----
  quran = {
    surahs: () => this.request('/quran/surahs'),
    translations: () => this.request('/quran/translations'),
    surah: (number, { translation, language, page, limit } = {}) =>
      this.request(`/quran/${number}`, { translation, language, page, limit }),
    ayah: (surah, ayah, { translation, language } = {}) =>
      this.request(`/quran/${surah}/${ayah}`, { translation, language }),
    words: (surah, ayah, { limit, offset } = {}) =>
      this.request(`/quran/${surah}/${ayah}/words`, { limit, offset }),
    cite: (surah, ayah) => this.request(`/quran/${surah}/${ayah}/cite`),
    /** Recitation metadata: { surah, ayah, reciter, audio_url }. */
    audio: (surah, ayah, { reciter } = {}) => this.request(`/quran/${surah}/${ayah}/audio`, { reciter }),
    /** Playable URL, byte-proxied by the API so it works cross-origin and offline. */
    audioUrl: (surah, ayah, { reciter, download = false } = {}) =>
      this.url(`/quran/${surah}/${ayah}/audio`, { reciter, [download ? 'download' : 'stream']: 1 }),
    /** Whole translation as JSON, for building an offline store. */
    offline: ({ translation, language } = {}) => this.request('/quran/offline', { translation, language }),
    export: ({ translation, language, surah } = {}) => this.request('/quran/export', { translation, language, surah }),
  };

  // ---- Hadith ----
  hadith = {
    collections: () => this.request('/hadith/collections'),
    languages: () => this.request('/hadith/languages'),
    collection: (slug, { limit, offset, language } = {}) =>
      this.request(`/hadith/${slug}`, { limit, offset, language }),
    get: (slug, number) => this.request(`/hadith/${slug}/${number}`),
    isnad: (slug, number) => this.request(`/hadith/${slug}/${number}/isnad`),
    cite: (slug, number) => this.request(`/hadith/${slug}/${number}/cite`),
    search: (q, { limit, offset, language, collection } = {}) =>
      this.request('/hadith/search', { q, limit, offset, language, collection }),
    scholars: () => this.request('/hadith/scholars'),
    scholar: (id) => this.request(`/hadith/scholars/${id}`),
    /** Pro-tier bulk export. A free key gets a 403 naming the tier required. */
    export: ({ collection, language } = {}) => this.request('/hadith/export', { collection, language }),
    /** { recorded, clip, voice } — clip is tier-correct and streams from the API. */
    audio: (slug, number) => this.request(`/hadith-audio/${slug}/${number}`),
    audioUrl: (slug, number) => this.url(`/hadith-audio/${slug}/${encodeURIComponent(number)}.mp3`),
  };

  // ---- Tafsir ----
  tafsir = {
    sources: () => this.request('/tafsir/sources'),
    search: (q, { limit, offset } = {}) => this.request('/tafsir/search', { q, limit, offset }),
    get: (surah, ayah, { source } = {}) => this.request(`/tafsir/${surah}/${ayah}`, { source }),
  };

  // ---- Duas ----
  duas = {
    categories: () => this.request('/duas/categories'),
    search: (q, { limit, offset } = {}) => this.request('/duas/search', { q, limit, offset }),
    random: () => this.request('/duas/random'),
    category: (slug, { limit, offset } = {}) => this.request(`/duas/${slug}`, { limit, offset }),
  };

  // ---- Mutoon (classical primers) ----
  mutoon = {
    list: () => this.request('/mutoon'),
    paths: () => this.request('/mutoon/paths'),
    get: (slug) => this.request(`/mutoon/${slug}`),
    /** 409 with { ingested: false } when the text is catalogued but not loaded. */
    lines: (slug, { from, to } = {}) => this.request(`/mutoon/${slug}/lines`, { from, to }),
    audioSources: () => this.request('/mutoon/audio-sources'),
    pdfSources: () => this.request('/mutoon/pdf-sources'),
    /** Archive candidates awaiting human review — not download links. */
    pdfCandidates: () => this.request('/mutoon/pdf-candidates'),
    audio: (slug) => this.request(`/mutoon/${slug}/audio`),
    streamUrl: (slug, { download = false } = {}) =>
      this.url(`/mutoon/${slug}/stream`, download ? { download: 1 } : undefined),
    pdfUrl: (slug) => this.url(`/mutoon/${slug}/pdf`),
    /** Whole-matn recording when no per-line files exist yet; check X-Audio-Kind. */
    lineAudioUrl: (slug, line) => this.url(`/mutoon/${slug}/audio/${line}`),
    /** The bytes, ranges intact, redirects followed. */
    download: (slug, { range, pdf = false, download = false } = {}) =>
      pdf
        ? this.media(`/mutoon/${slug}/pdf`, null, { range })
        : this.media(`/mutoon/${slug}/stream`, null, { range, download }),
  };

  // ---- Fiqh ----
  fiqh = {
    overview: () => this.request('/fiqh'),
    chapters: () => this.request('/fiqh/chapters'),
    books: ({ madhab, level } = {}) => this.request('/fiqh/books', { madhab, level }),
    scholars: () => this.request('/fiqh/scholars'),
    topics: () => this.request('/fiqh/topics'),
    search: (q, { madhab, limit, offset } = {}) => this.request('/fiqh/search', { q, madhab, limit, offset }),
    get: (id) => this.request(`/fiqh/${id}`),
  };

  // ---- Language tools ----
  roots = {
    list: (opts) => this.request('/roots', opts),
    occurrences: (root, { limit, offset } = {}) =>
      this.request(`/roots/${encodeURIComponent(root)}/occurrences`, { limit, offset }),
  };
  narrators = {
    list: (opts) => this.request('/narrators', opts),
    search: (q, opts) => this.request('/narrators/search', Object.assign({ q }, opts || {})),
    get: (id) => this.request(`/narrators/${id}`),
    isnads: (id) => this.request(`/narrators/${id}/isnads`),
  };
  dictionary = {
    search: (q, { language, limit } = {}) => this.request('/dictionary/search', { q, language, limit }),
    roots: () => this.request('/dictionary/roots'),
    root: (root) => this.request(`/dictionary/root/${encodeURIComponent(root)}`),
    word: (word) => this.request(`/dictionary/word/${encodeURIComponent(word)}`),
    words: (letter, { limit, offset } = {}) => this.request('/dictionary/words', { letter, limit, offset }),
    audioUrl: (word) => this.url('/dictionary/audio', { word }),
    offline: () => this.request('/dictionary/offline'),
  };

  // ---- Reading aids ----
  topics = {
    list: () => this.request('/topics'),
    get: (slug) => this.request(`/topics/${slug}`),
  };
  stories = {
    list: ({ part, limit, offset } = {}) => this.request('/stories', { part, limit, offset }),
    parts: () => this.request('/stories/parts'),
    part: (partId) => this.request(`/stories/part/${partId}`),
    daily: () => this.request('/stories/daily'),
    random: () => this.request('/stories/random'),
    get: (id) => this.request(`/stories/${id}`),
  };
  reciters = { list: () => this.request('/reciters') };

  // ---- Practice ----
  prayerTimes = (params) => this.request('/prayer-times', params);
  alarm = {
    vapid: () => this.request('/alarm/vapid'),
    subscribe: (subscription) => this.request('/alarm/subscribe', null, { method: 'POST', body: subscription }),
    unsubscribe: (endpoint) => this.request('/alarm/unsubscribe', null, { method: 'POST', body: { endpoint } }),
    stats: () => this.request('/alarm/stats'),
  };

  // ---- Cross-corpus ----
  /** One query across Quran, hadith, duas, tafsir and fiqh. Resolves "2:255", "Bukhari 1". */
  search = (q, { limit, offset, language, only } = {}) =>
    this.request('/search', { q, limit, offset, language, only });

  /** Canonical citation string for a reference, e.g. { ref: '2:255' } -> "Quran 2:255". */
  cite = (ref) => this.request('/cite', { ref });

  /** Self-serve API key. The key is emailed; the response carries only a hint. */
  developers = {
    signup: (email) => this.request('/developers/signup', null, { method: 'POST', body: { email } }),
    recover: (email) => this.request('/developers/keys/recover', null, { method: 'POST', body: { email } }),
  };
}

function numOrNull(v) {
  return v === null || v === undefined ? null : Number(v);
}
function backoff(attempt, base = 400) {
  return Math.min(base * 2 ** attempt, 8000) + Math.floor(Math.random() * 120);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

IlmApi.IlmApi = IlmApi;
IlmApi.IlmApiError = IlmApiError;
IlmApi.WEB_TIER_ROUTES = WEB_TIER_ROUTES;
IlmApi.DEFAULT_BASE = DEFAULT_BASE;

module.exports = IlmApi;
module.exports.IlmApi = IlmApi;
module.exports.IlmApiError = IlmApiError;
module.exports.WEB_TIER_ROUTES = WEB_TIER_ROUTES;
module.exports.default = IlmApi;
