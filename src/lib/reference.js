// Parse the ways people actually cite scripture: "2:255", "Quran 2:255",
// "Al-Baqarah 255", "Bukhari 1", "Sahih Muslim 8", "sahih-muslim:8".
// Returns a typed hint the caller can resolve directly, or null.
const QURAN_ALIASES = {
  'fatihah': 1, 'baqarah': 2, 'imran': 3, 'nisa': 4, 'maidah': 5, 'anam': 6,
  'araf': 7, 'anfal': 8, 'tawbah': 9, 'yunus': 10, 'kahf': 18, 'maryam': 19,
  'taha': 20, 'nur': 24, 'furqan': 25, 'naml': 27, 'qasas': 28, 'ankabut': 29,
  'luqman': 31, 'sajdah': 32, 'yasin': 36, 'zumar': 39, 'ghafir': 40,
  'fussilat': 41, 'shura': 42, 'zukhruf': 43, 'dukhan': 44, 'jathiyah': 45,
  'ahqaf': 46, 'muhammad': 47, 'fath': 48, 'hujurat': 49, 'dhariyat': 51,
  'tur': 52, 'najm': 53, 'qamar': 54, 'rahman': 55, 'waqiah': 56, 'hadid': 57,
  'mujadilah': 58, 'hashr': 59, 'mumtahanah': 60, 'saff': 61, 'jumuah': 62,
  'munafiqun': 63, 'taghabun': 64, 'talaq': 65, 'tahrim': 66, 'mulk': 67,
  'qalam': 68, 'haqqah': 69, 'maarij': 70, 'nuh': 71, 'jinn': 72, 'muzzammil': 73,
  'muddaththir': 74, 'qiyamah': 75, 'insan': 76, 'mursalat': 77, 'naba': 78,
  'naziat': 79, 'abasa': 80, 'takwir': 81, 'infitar': 82, 'mutaffifin': 83,
  'inshiqaq': 84, 'buruj': 85, 'tariq': 86, 'ala': 87, 'ghashiyah': 88,
  'fajr': 89, 'balad': 90, 'shams': 91, 'layl': 92, 'duha': 93, 'sharh': 94,
  'tin': 95, 'alaq': 96, 'qadr': 97, 'bayyinah': 98, 'zalzalah': 99,
  'adiyat': 100, 'qariah': 101, 'takathur': 102, 'asr': 103, 'humazah': 104,
  'fil': 105, 'quraysh': 106, 'maun': 107, 'kawthar': 108, 'kafirun': 109,
  'nasr': 110, 'masad': 111, 'ikhlas': 112, 'falaq': 113, 'nas': 114,
};

const COLLECTION_ALIASES = {
  bukhari: 'bukhari', sahihbukhari: 'bukhari', bukhary: 'bukhari',
  muslim: 'muslim', sahihmuslim: 'muslim',
  nasai: 'nasai', sunannasai: 'nasai',
  abudawud: 'abudawud', sunanabudawud: 'abudawud', dawud: 'abudawud',
  tirmidhi: 'tirmidhi', jamiattirmidhi: 'tirmidhi',
  ibnmajah: 'ibnmajah', sunannibnmajah: 'ibnmajah', majah: 'ibnmajah',
  malik: 'malik', muwatta: 'malik', muwattamalik: 'malik',
  ahmed: 'ahmed', ahmad: 'ahmed', musnadahmad: 'ahmed',
  riyad: 'riyad', riyadussalihin: 'riyad',
  shamail: 'shamail', mishkat: 'mishkat', adab: 'adab', bulugh: 'bulugh',
  nawawi40: 'nawawi40', nawawi: 'nawawi40',
  qudsi40: 'qudsi40', qudsi: 'qudsi40',
  dehlawi40: 'dehlawi40', dehlawi: 'dehlawi40',
};

const squash = (s) => String(s || '').toLowerCase().replace(/[\u2018\u2019'"`.,]/g, ' ').replace(/[^a-z0-9:\s-]/g, ' ').replace(/\s+/g, ' ').trim();
const compact = (s) => squash(s).replace(/[\s-]/g, '');

function parseReference(q) {
  const raw = String(q || '').trim();
  if (!raw) return null;
  // hyphens are word separators in citations ("Al-Baqarah"), not part of names
  const s = squash(raw).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

  // 2:255 or quran 2:255 or surah 2 verse 255
  let m = s.match(/(?:quran|qur an|surah|sura|surat)?\s*(\d{1,3})\s*[:.]\s*(\d{1,3})$/);
  if (m) {
    const surah = +m[1], ayah = +m[2];
    if (surah >= 1 && surah <= 114 && ayah >= 1) return { type: 'ayah', surah, ayah, confidence: 0.95 };
  }
  // Al-Baqarah 255 / baqarah 255 / kahf 10
  m = s.match(/^([a-z' ]+?)\s+(\d{1,3})$/);
  if (m) {
    const name = compact(m[1]).replace(/^(al|an|as|at|ash|ar|az|adh|ad)(?=[a-z]{3,})/, '');
    for (const [alias, num] of Object.entries(QURAN_ALIASES)) {
      if (name === alias || name.startsWith(alias) && name.length <= alias.length + 2) {
        return { type: 'ayah', surah: num, ayah: +m[2], confidence: 0.9, matched_name: alias };
      }
    }
  }
  // hadith: bukhari 1 / sahih muslim 8 / nawawi 13
  m = s.match(/^(.*?)\s*(?:#|no\.?|number)?\s*(\d{1,5})$/);
  if (m) {
    const name = compact(m[1]);
    if (name) {
      for (const [alias, slug] of Object.entries(COLLECTION_ALIASES)) {
        if (name === alias || name.startsWith(alias) || alias.startsWith(name)) {
          return { type: 'hadith', collection: slug, number: +m[2], confidence: 0.85, matched_name: alias };
        }
      }
    }
  }
  return null;
}

module.exports = { parseReference, QURAN_ALIASES, COLLECTION_ALIASES };
