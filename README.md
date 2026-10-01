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

`seed:roots` fills `ayah_words` (Arabic form + root + part of speech with case). Transliteration/translation columns are populated by future work.
