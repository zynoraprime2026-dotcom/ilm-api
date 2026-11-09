// GET /v1/sources — provenance, so a masjid committee or a teacher can check
// where text came from before trusting it in public. Every edition is listed
// with its translator, license family and review state. Review states are
// honest: 'unreviewed' means nobody has formally checked it, not that it is bad.
const express = require('express');
const router = express.Router();
const db = require('../config/db');

const HADITH_LICENSES = {
  bukhari: 'Sahih al-Bukhari — public domain classical text, English from Muhsin Khan',
  muslim: 'Sahih Muslim — public domain classical text, English from Abdul Hamid Siddiqui',
  nasai: "Sunan an-Nasa'i — public domain classical text, English translation",
  abudawud: 'Sunan Abu Dawud — public domain classical text, English from Ahmad Hasan',
  tirmidhi: 'Jami at-Tirmidhi — public domain classical text, English translation',
  ibnmajah: 'Sunan Ibn Majah — public domain classical text, English translation',
  malik: 'Muwatta Malik — public domain classical text, English from Aisha Bewley',
  ahmed: 'Musnad Ahmad — public domain classical text, English translation',
  riyad: 'Riyad as-Salihin — Nawawi, English translation',
  shamail: 'Shamail at-Tirmidhi — English translation',
  adab: 'Al-Adab al-Mufrad — Bukhari, English translation',
  bulugh: 'Bulugh al-Maram — Ibn Hajar, English translation',
  mishkat: 'Mishkat al-Masabih — English translation',
  nawawi40: "Al-Arba'in an-Nawawiyyah — Nawawi, forty hadith",
  qudsi40: 'Forty Hadith Qudsi',
  dehlawi40: "Arba'in of Shah Waliullah al-Dehlawi",
};

router.get('/', async (req, res) => {
  const out = { service: 'ilm-api', quran: [], hadith: [], tafsir: [], notes: [] };

  try {
    const { rows } = await db.query(
      'SELECT code, language, translator_name, is_simplified FROM translations ORDER BY language, translator_name'
    );
    out.quran = rows.map(r => ({
      code: r.code,
      language: r.language,
      translator: r.translator_name,
      simplified: !!r.is_simplified,
      license: 'Public Islamic translation, distributed for study',
      review: 'unreviewed',
    }));
  } catch (e) {
    out.notes.push('Quran translation list unavailable right now.');
  }

  try {
    const { rows } = await db.query('SELECT DISTINCT source FROM tafsir ORDER BY source');
    out.tafsir = rows.map(r => ({
      source: r.source,
      license: 'Classical commentary, English rendering',
      review: 'unreviewed',
    }));
  } catch (e) {
    out.notes.push('Tafsir source list unavailable right now.');
  }

  try {
    const { rows } = await db.query(
      'SELECT c.slug, count(h.id)::int AS rows FROM hadith_collections c LEFT JOIN hadiths h ON h.collection_id = c.id GROUP BY c.slug ORDER BY c.slug'
    );
    out.hadith = rows.map(r => ({
      collection: r.slug,
      hadiths: r.rows,
      source: HADITH_LICENSES[r.slug] || 'Classical collection',
      review: 'unreviewed',
    }));
  } catch (e) {
    out.notes.push('Hadith collection list unavailable right now.');
  }

  out.notes.push('Fiqh rulings are attributed to their classical manual on every record; see /v1/fiqh/books.');
  out.notes.push('Report an error in any edition and it is corrected at source, not patched per client.');
  res.json(out);
});

module.exports = router;
