// Global language registry for the Ilm API.
// One canonical language setting (?language=xx) that every module understands:
// Quran resolves it to a translation code, hadith to a translation table row,
// and modules without data in that language fall back to English and say so
// in the response.

const LANGUAGES = {
  ar: { name: 'Arabic', native: 'العربية' },
  en: { name: 'English', native: 'English' },
  bn: { name: 'Bengali', native: 'বাংলা' },
  fr: { name: 'French', native: 'Français' },
  de: { name: 'German', native: 'Deutsch' },
  es: { name: 'Spanish', native: 'Español' },
  ha: { name: 'Hausa', native: 'Hausa' },
  id: { name: 'Indonesian', native: 'Bahasa Indonesia' },
  ms: { name: 'Malay', native: 'Bahasa Melayu' },
  pt: { name: 'Portuguese', native: 'Português' },
  ru: { name: 'Russian', native: 'Русский' },
  sw: { name: 'Swahili', native: 'Kiswahili' },
  ta: { name: 'Tamil', native: 'தமிழ்' },
  tr: { name: 'Turkish', native: 'Türkçe' },
  ur: { name: 'Urdu', native: 'اردو' },
  zh: { name: 'Chinese', native: '中文' },
};

// Aliases users may pass. fawazahmed0 hadith editions use 639-2 style codes
// (ben, fra, ind, rus, tur, urd, tam) — normalize everything to the keys above.
const ALIASES = {
  ben: 'bn', bn: 'bn',
  fra: 'fr', fr: 'fr',
  ind: 'id', id: 'id',
  rus: 'ru', ru: 'ru',
  tur: 'tr', tr: 'tr',
  urd: 'ur', ur: 'ur',
  tam: 'ta', ta: 'ta',
  eng: 'en', english: 'en',
  arb: 'ar', arabic: 'ar',
};

// Preferred Quran translation code(s) per language, in priority order.
const QURAN_TRANSLATIONS = {
  bn: ['bn.mujiburrahman'],
  fr: ['fr.hamidullah'],
  de: ['de.bubenheim'],
  es: ['es.garcia'],
  ha: ['ha.gumi'],
  id: ['id.kemenag'],
  ms: ['ms.basmeih'],
  pt: ['pt.nasr'],
  ru: ['ru.kuliev'],
  sw: ['sw.barwani'],
  tr: ['tr.diyanet'],
  ur: ['ur.jalandhari'],
  zh: ['zh.majian'],
};

// Canonical language → hadith translation table code (null = lives on hadiths
// itself for ar/en, or no data for languages absent here).
const HADITH_CODES = {
  bn: 'ben', fr: 'fra', id: 'ind', ru: 'rus', tr: 'tur', ur: 'urd', ta: 'tam',
};

function normalizeLanguage(raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().trim();
  return LANGUAGES[key] ? key : (ALIASES[key] || null);
}

// Strip Arabic diacritics (harakat, tanwin, shadda, sukun, etc.) for search.
function stripArabicDiacritics(text) {
  return String(text || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/\u0640/g, ''); // tatweel
}

module.exports = { LANGUAGES, QURAN_TRANSLATIONS, HADITH_CODES, normalizeLanguage, stripArabicDiacritics };
