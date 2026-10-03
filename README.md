# Ilm API

Islamic knowledge API — a work in progress.

*Ilm (علم)* means knowledge. The goal: one clean API serving Islamic data for apps built in Ghana and beyond.

## Planned features

1. Prayer times by city / coordinates (Ghana-first: Tarkwa, Accra, Takoradi, Kumasi...)
2. Quran text and translation lookups
3. Hadith search (sahih collections)
4. Hijri / Gregorian date conversion

## Status

Early development. TypeScript / Node.js. Not deployed publicly yet — no stability guarantees.

## Related projects

* [Al-Haqq Digital](../alhaqq-digital) — web & AI services + shop (live)
* [alhaqq-wa](../alhaqq-wa) — Masjid WhatsApp Assistant (live demo)

---
Built by Abdulrahim Abubakar · Zynora AI · Tarkwa, Ghana

## Seeding the database

1. `npm run migrate` (create tables)
2. `npm run seed:quran` — surahs, ayahs, translations (Al Quran Cloud API)
3. `npm run seed:roots` — word-by-word morphology + roots from `data/quran-morphology.txt` (Quranic Arabic Corpus, GNU-licensed, included in this repo; format verified 2026-10-01)
4. `npm run seed:hadith`, `seed:tafsir`, `seed:duas`, `seed:fiqh`, `seed:topics`, `seed:reciters` — the remaining datasets
5. `node scripts/fetchWords.cjs` + `node scripts/rebuildWords.cjs` — complete word-by-word data (all 77,429 Quran words: Arabic, translation, transliteration, grammar + root merged from the Quranic Arabic Corpus, per-word audio) sourced from the quran.com API v4
6. `node scripts/fetchTranslations.cjs` + `node scripts/seedNewTranslations.cjs` — 14 additional Quran translations (French, Spanish, German, Portuguese, Russian, Urdu, Bengali, Indonesian, Malay, Chinese, Hausa, Swahili, Amharic, Turkish), sourced from the quran.com API v4
7. `node scripts/seedNewReciters.cjs` — expands reciters to 13 (everyayah.com audio)
8. `node scripts/seedFiqh.cjs` — comparative fiqh dataset: 65 topics, 180 rulings across 10 chapters (Tahara, Salah, Zakah, Sawm, Hajj, Muamalat, Nikah, At'imah, Libas, Janaiz), each cited to classical manuals (Al-Hidayah, Minhaj al-Talibin, Mukhtasar Khalil, Al-Mughni) with evidence where applicable. To grow the dataset, add topics to `data/fiqh-part*.js` and rerun the seeder.

`rebuildWords.cjs` fills `ayah_words` completely: every word of the Quran (77,429 rows covering all 6,236 ayahs) with full Uthmani text, translation, transliteration, per-word audio, and (where the corpus alignment matched) part of speech with case and root. Coverage: 100% translation/transliteration, 43% grammar + root.
