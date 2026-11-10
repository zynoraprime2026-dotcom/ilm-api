// Types for the Ilm API client. Hand-written to match the live responses; the
// live suite in test/live.test.mjs is what keeps them honest.

export type Tier = 'v1' | 'web';

export interface IlmApiOptions {
  /** Required for /v1 routes. Omit to use the public /web tier. */
  apiKey?: string;
  baseUrl?: string;
  /** Per attempt, ms. */
  timeout?: number;
  /** Retries on network errors, 429 and 5xx. Honours Retry-After. GET/HEAD only. */
  retries?: number;
  fetch?: typeof fetch;
  tier?: Tier;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  dailyLimit: number | null;
  dailyRemaining: number | null;
}

export interface RequestOptions {
  method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// ---- Quran ----
export interface Surah {
  id: number;
  number: number;
  name_arabic: string;
  name_english: string;
  name_transliteration: string;
  revelation_place: string;
  ayah_count: number;
}

export interface Ayah {
  ayah_number: number;
  text_arabic: string;
  translation: string;
  translation_code?: string;
}

export interface SurahResponse {
  surah: Surah;
  translation_code: string;
  language: string;
  pagination: { page: number; limit: number; total: number } | null;
  ayahs: Ayah[];
}

export interface AyahResponse {
  surah_number: number;
  ayah_number: number;
  text_arabic: string;
  source_edition: string;
  translation: string;
  language: string;
  translation_code: string;
}

export interface Word {
  word_position: number;
  text_arabic: string;
  transliteration: string | null;
  translation: string | null;
  grammar: string | null;
  root: string | null;
  audio_url: string | null;
}

export interface WordsResponse {
  surah: number;
  ayah: number;
  words: Word[];
}

export interface Translation {
  code: string;
  language: string;
  translator_name: string;
  is_simplified: boolean;
}

export interface AudioMeta {
  surah: number;
  ayah: number;
  reciter: string;
  audio_url: string;
}

// ---- Hadith ----
export interface HadithCollection {
  id: number;
  slug: string;
  name: string;
  name_arabic: string;
  total_hadith: number;
}

export interface Hadith {
  hadith_number: string;
  narrator: string | null;
  text_arabic: string;
  text_english: string | null;
  grade: string | null;
  source_edition: string | null;
  collection_name: string;
  book_name: string | null;
  prev_number: string | null;
  next_number: string | null;
  language: string;
}

export interface Isnad {
  collection: string;
  hadith_number: string;
  chain: Array<{ chain_position: number; narrator: string; death_year_hijri?: number | null; reliability_grade?: string | null }>;
}

export interface HadithAudio {
  recorded: boolean;
  clip?: string;
  voice?: string;
  tts?: boolean;
}

// ---- Tafsir ----
export interface TafsirEntry {
  source: string;
  text: string;
}

export interface TafsirResponse {
  surah: number;
  ayah: number;
  excerpted: boolean;
  tafsir: TafsirEntry[];
}

// ---- Duas ----
export interface Dua {
  id?: number;
  title: string;
  text_arabic: string;
  transliteration: string | null;
  translation: string;
  reference: string | null;
}

// ---- Mutoon ----
export interface MatnAudio {
  kind: 'matn' | 'line';
  url?: string;
  source?: string;
  speaker?: string | null;
  license?: string | null;
  verified_at?: string | null;
  bytes?: number | null;
}

export interface Matn {
  slug: string;
  title_arabic: string;
  title_english: string;
  author_arabic: string | null;
  author: string | null;
  death_ah: number | null;
  field: string;
  field_arabic: string | null;
  level: 'beginner' | 'intermediate' | 'advanced' | string;
  form: 'prose' | 'verse' | string;
  verses: number | null;
  note: string | null;
  audio: MatnAudio | null;
  ingested: boolean;
  audio_kind: 'matn' | 'line' | null;
  audio_available: boolean;
  audio_url: string | null;
  audio_download_url: string | null;
  audio_url_template: string | null;
  pdf_available: boolean;
  pdf_url: string | null;
}

export interface MutoonCatalogue {
  count: number;
  fields: string[];
  levels: string[];
  paths: unknown[];
  mutoon: Matn[];
}

export interface MatnLine {
  n: number;
  arabic: string;
  translation: string | null;
  transliteration: string | null;
  audio_url: string | null;
}

export interface MatnLines {
  slug: string;
  title_english: string;
  total_lines: number;
  from: number;
  to: number;
  source: string | null;
  audio_available: boolean;
  lines: MatnLine[];
}

// ---- Service ----
export interface StatusResponse {
  service: string;
  version: string;
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  db_error: string | null;
  data: Record<string, number | null>;
  checked_at: string;
  uptime_seconds: number;
}

export interface UsageResponse {
  key: string | null;
  tier: string;
  minute: { limit: number; used: number; remaining: number; resets_in_seconds: number };
  day: { limit: number; used: number; remaining: number; resets_at: string };
  requests_made_total: number | null;
  upgrade_hint: string | null;
}

export interface SearchSection {
  count: number;
  results: unknown[];
  error?: string;
  matched?: { type: 'ayah' | 'hadith'; surah?: number; ayah?: number; collection?: string; number?: number };
}

export interface SearchResponse {
  query: string;
  language: string;
  limit: number;
  offset: number;
  count: number;
  sections: Record<string, SearchSection>;
}

export interface PrayerTimes {
  date: string;
  city?: string;
  coordinates: { lat: number; lng: number };
  method: string;
  times: { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string };
}

export type Paged<T, K extends string> = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  has_more: boolean;
} & Record<K, T[]>;

export declare class IlmApiError extends Error {
  status?: number;
  code?: string;
  hint?: string;
  url?: string;
  body?: unknown;
  tier?: Tier;
  constructor(message: string, init?: { status?: number; code?: string; hint?: string; url?: string; body?: unknown; tier?: Tier });
}

export declare class IlmApi {
  constructor(options?: IlmApiOptions);
  static public(baseUrl?: string): IlmApi;
  /** True when this route group is served without a key. */
  static keyless(path: string): boolean;
  static readonly WEB_TIER_ROUTES: string[];
  static readonly DEFAULT_BASE: string;

  apiKey?: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  tier: Tier;
  lastRateLimit: RateLimit | null;

  path(p: string): string;
  url(p: string, params?: Record<string, unknown>): string;
  request<T = unknown>(p: string, params?: Record<string, unknown> | null, opts?: RequestOptions): Promise<T>;
  media(p: string, params?: Record<string, unknown> | null, opts?: { range?: string; method?: string; download?: boolean }): Promise<Response>;

  status(): Promise<StatusResponse>;
  usage(): Promise<UsageResponse>;
  sources(): Promise<{ service: string; quran: unknown; hadith: unknown; tafsir: unknown; notes: unknown }>;
  version(): Promise<{ version: string; changelog_url: string }>;
  meta(): Promise<{ name: string; description: string; endpoints: unknown }>;
  languages(): Promise<{ note?: string; languages: unknown[] }>;

  quran: {
    surahs(): Promise<Surah[]>;
    translations(): Promise<Translation[]>;
    surah(number: number, opts?: { translation?: string; language?: string; page?: number; limit?: number }): Promise<SurahResponse>;
    ayah(surah: number, ayah: number, opts?: { translation?: string; language?: string }): Promise<AyahResponse>;
    words(surah: number, ayah: number, opts?: { limit?: number; offset?: number }): Promise<WordsResponse>;
    cite(surah: number, ayah: number): Promise<{ citation: string }>;
    audio(surah: number, ayah: number, opts?: { reciter?: string }): Promise<AudioMeta>;
    /** Byte-proxied, so it plays cross-origin and saves with a filename. */
    audioUrl(surah: number, ayah: number, opts?: { reciter?: string; download?: boolean }): string;
    offline(opts?: { translation?: string; language?: string }): Promise<unknown>;
    export(opts?: { translation?: string; language?: string; surah?: number }): Promise<unknown>;
  };

  hadith: {
    collections(): Promise<HadithCollection[]>;
    languages(): Promise<{ languages: Array<{ code: string; name: string; native_name: string }>; total_languages: number }>;
    collection(slug: string, opts?: { limit?: number; offset?: number; language?: string }): Promise<unknown>;
    get(slug: string, number: number | string): Promise<Hadith>;
    isnad(slug: string, number: number | string): Promise<Isnad>;
    cite(slug: string, number: number | string): Promise<{ citation: string }>;
    search(q: string, opts?: { limit?: number; offset?: number; language?: string; collection?: string }): Promise<unknown>;
    scholars(): Promise<{ count: number; scholars: unknown[] }>;
    scholar(id: string): Promise<unknown>;
    /** Pro tier. A free key gets a 403 naming the tier required. */
    export(opts?: { collection?: string; language?: string }): Promise<unknown>;
    audio(slug: string, number: number | string): Promise<HadithAudio>;
    audioUrl(slug: string, number: number | string): string;
  };

  tafsir: {
    sources(): Promise<string[]>;
    search(q: string, opts?: { limit?: number; offset?: number }): Promise<unknown>;
    get(surah: number, ayah: number, opts?: { source?: string }): Promise<TafsirResponse>;
  };

  duas: {
    categories(): Promise<Array<{ id: number; slug: string; name: string }>>;
    search(q: string, opts?: { limit?: number; offset?: number }): Promise<unknown>;
    random(): Promise<Dua>;
    /** Returns the duas themselves, not an envelope. */
    category(slug: string, opts?: { limit?: number; offset?: number }): Promise<Dua[]>;
  };

  mutoon: {
    list(): Promise<MutoonCatalogue>;
    paths(): Promise<{ count: number; paths: unknown[] }>;
    get(slug: string): Promise<Matn>;
    /** Rejects with status 409 and { ingested: false } when the text is not loaded. */
    lines(slug: string, opts?: { from?: number; to?: number }): Promise<MatnLines>;
    audioSources(): Promise<{ count: number; note?: string; sources: unknown[] }>;
    pdfSources(): Promise<{ count: number; note?: string; sources: unknown[] }>;
    /** Archive candidates awaiting human review, not download links. */
    pdfCandidates(): Promise<{ count: number; fetchable: number; note?: string; candidates: unknown[] }>;
    audio(slug: string): Promise<{ url: string }>;
    streamUrl(slug: string, opts?: { download?: boolean }): string;
    pdfUrl(slug: string): string;
    lineAudioUrl(slug: string, line: number): string;
    download(slug: string, opts?: { range?: string; pdf?: boolean; download?: boolean }): Promise<Response>;
  };

  fiqh: {
    overview(): Promise<{ module: string; counts: Record<string, number>; note?: string; endpoints: unknown }>;
    chapters(): Promise<{ count: number; chapters: unknown[] }>;
    books(opts?: { madhab?: string; level?: string }): Promise<{ count: number; books: unknown[] }>;
    scholars(): Promise<{ count: number; scholars: unknown[] }>;
    topics(): Promise<{ count: number; topics: unknown[] }>;
    /** Needs a scope: one of madhab, topic or chapter. */
    search(q: string, opts?: { madhab?: string; topic?: string; chapter?: string; limit?: number; offset?: number }): Promise<unknown>;
    get(id: number | string): Promise<unknown>;
  };

  roots: {
    /** Without limit/offset the API answers an array (capped); with them, an envelope. */
    list(opts?: { limit?: number; offset?: number }): Promise<Paged<unknown, 'roots'> | unknown[]>;
    occurrences(root: string, opts?: { limit?: number; offset?: number }): Promise<unknown>;
  };

  narrators: {
    list(opts?: { limit?: number; offset?: number }): Promise<{ count: number; narrators: unknown[] }>;
    search(q: string, opts?: Record<string, unknown>): Promise<{ query: string; count: number; results: unknown[] }>;
    get(id: number | string): Promise<unknown>;
    isnads(id: number | string): Promise<unknown>;
  };

  dictionary: {
    search(q: string, opts?: { language?: string; limit?: number }): Promise<{ query: string; language: string; count: number; results: unknown[] }>;
    roots(): Promise<{ count: number; roots: unknown[] }>;
    root(root: string): Promise<unknown>;
    word(word: string): Promise<unknown>;
    words(letter: string, opts?: { limit?: number; offset?: number }): Promise<unknown>;
    audioUrl(word: string): string;
    offline(): Promise<unknown>;
  };

  topics: {
    list(): Promise<Array<{ id: number; slug: string; name: string; description: string }>>;
    get(slug: string): Promise<unknown>;
  };

  stories: {
    list(opts?: { part?: string; limit?: number; offset?: number }): Promise<{ count: number; note?: string; parts: unknown[]; stories: unknown[] }>;
    parts(): Promise<unknown[]>;
    part(partId: string): Promise<unknown>;
    daily(): Promise<{ date: string; story: unknown }>;
    random(): Promise<unknown>;
    get(id: string): Promise<unknown>;
  };

  reciters: { list(): Promise<Array<{ slug: string; name: string }>> };

  prayerTimes(params: { lat?: number; lng?: number; city?: string; date?: string; method?: string }): Promise<PrayerTimes>;

  alarm: {
    vapid(): Promise<{ publicKey: string }>;
    subscribe(subscription: { endpoint: string; p256dh: string; auth: string; lat: number; lng: number; timezone?: string; method?: string; prayers?: Record<string, boolean> }): Promise<unknown>;
    unsubscribe(endpoint: string): Promise<unknown>;
    stats(): Promise<unknown>;
  };

  search(q: string, opts?: { limit?: number; offset?: number; language?: string; only?: string }): Promise<SearchResponse>;
  cite(ref: string): Promise<{ citation: string }>;

  developers: {
    signup(email: string): Promise<{ key: string | null; key_hint: string; tier: string; message?: string }>;
    recover(email: string): Promise<unknown>;
  };
}

export default IlmApi;
export { IlmApi as IlmApiClient };
export declare const WEB_TIER_ROUTES: string[];
