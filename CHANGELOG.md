# Changelog

All notable changes to the Ilm API are recorded here, so researchers citing
specific content can reference a stable version.

## [1.4.0] — Phase 5: Trust & Scale
- Added source verification metadata: `source_edition` on ayahs and hadith,
  `publisher`/`source_edition` on tafsir entries
- Added gzip compression and tuned database connection pooling for scale
- Added `Cache-Control` headers on rarely-changing reference endpoints
  (surahs, translations, hadith collections, reciters)
- Added this changelog and the `/v1/version` endpoint

## [1.3.0] — Phase 4: Developer/Researcher Portal
- Added public docs site (`public/index.html`) served at the deployed root URL
- Added self-serve developer signup (`POST /v1/developers/signup`)
- Added bulk export endpoints (`/v1/quran/export`, `/v1/hadith/export`),
  gated to academic/pro tiers

## [1.2.0] — Phase 3: Student/Accessibility Features
- Added simplified translation flag (`is_simplified` on translations)
- Added user accounts, bookmarks, and study lists (separate JWT auth from
  developer API keys)
- Added audio recitation URLs (`/v1/quran/:surah/:ayah/audio`)

## [1.1.0] — Phase 2: Scholarly/Research Tools
- Added thematic cross-referencing (`/v1/topics`)
- Added citation export (BibTeX/APA) for ayahs and hadith
- Added madhab comparison (`/v1/fiqh/search`)

## [1.0.0] — Phase 1: Content Depth
- Initial release: Quran (4 translations), tafsir (2 sources), all six
  canonical hadith collections, isnad chain schema, Arabic root-word schema,
  prayer times, du'as
