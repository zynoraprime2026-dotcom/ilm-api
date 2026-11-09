// Types for the Ilm API client. Hand-written to match the live responses.

export interface IlmApiOptions {
  /** Required for /v1 routes. Omit to use the public /web tier. */
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  /** Retries on 429 and 5xx, honouring Retry-After. */
  retries?: number;
  fetch?: typeof fetch;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  dailyLimit: number | null;
  dailyRemaining: number | null;
}

export interface Surah {
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
}

export interface SurahResponse {
  surah: Surah;
  translation_code: string;
  language: string;
  pagination: { page: number; limit: number; total: number } | null;
  ayahs: Ayah[];
}

export interface Translation {
  code: string;
  language: string;
  translator_name: string;
  is_simplified: boolean;
}

export interface Hadith {
  id: number;
  hadith_number: number;
  narrator: string | null;
  text_english: string | null;
  text_arabic: string | null;
}

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
  sections: Record<string, SearchSection>;
}

export declare class IlmApiError extends Error {
  status?: number;
  code?: string;
  hint?: string;
  url?: string;
  body?: unknown;
}

export declare class IlmApi {
  constructor(options?: IlmApiOptions);
  static public(baseUrl?: string): IlmApi;
  lastRateLimit: RateLimit | null;

  status(): Promise<StatusResponse>;
  usage(): Promise<UsageResponse>;
  sources(): Promise<unknown>;
  version(): Promise<{ version: string; changelog_url: string }>;

  quran: {
    surahs(): Promise<Surah[]>;
    translations(): Promise<Translation[]>;
    languages(): Promise<unknown>;
    surah(number: number, opts?: { translation?: string; language?: string; page?: number; limit?: number }): Promise<SurahResponse>;
    ayah(surah: number, ayah: number, opts?: { translation?: string; language?: string }): Promise<Ayah>;
    offline(opts?: { translation?: string; language?: string }): Promise<unknown>;
  };

  hadith: {
    collections(): Promise<unknown>;
    collection(slug: string, opts?: { limit?: number; offset?: number; language?: string }): Promise<unknown>;
    get(slug: string, number: number): Promise<Hadith>;
    search(q: string, opts?: { limit?: number; language?: string; collection?: string }): Promise<unknown>;
  };

  tafsir: {
    sources(): Promise<unknown>;
    get(surah: number, ayah: number): Promise<TafsirResponse>;
  };

  duas: {
    categories(): Promise<unknown>;
    category(slug: string, opts?: { limit?: number }): Promise<unknown>;
    random(): Promise<unknown>;
  };

  fiqh: {
    books(): Promise<unknown>;
    search(q: string, opts?: Record<string, unknown>): Promise<unknown>;
  };

  roots: { list(opts?: Record<string, unknown>): Promise<unknown> };
  narrators: { list(opts?: Record<string, unknown>): Promise<unknown> };
  reciters: { list(): Promise<unknown> };
  prayerTimes(params: Record<string, unknown>): Promise<unknown>;

  search(q: string, opts?: { limit?: number; language?: string; only?: string }): Promise<SearchResponse>;
}

export default IlmApi;
