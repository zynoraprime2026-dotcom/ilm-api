-- ==========================================================
-- ILM API — Database Schema
-- Domains: Quran, Hadith, Prayer Times (computed, no table needed),
-- Fiqh/Duas
-- ==========================================================

-- ---------- QURAN ----------

CREATE TABLE IF NOT EXISTS surahs (
    id SERIAL PRIMARY KEY,
    number INTEGER UNIQUE NOT NULL,        -- 1-114
    name_arabic TEXT NOT NULL,
    name_english TEXT NOT NULL,
    name_transliteration TEXT NOT NULL,
    revelation_place TEXT,                  -- Meccan / Medinan
    ayah_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ayahs (
    id SERIAL PRIMARY KEY,
    surah_number INTEGER NOT NULL REFERENCES surahs(number),
    ayah_number INTEGER NOT NULL,           -- number within surah
    text_arabic TEXT NOT NULL,
    juz INTEGER,
    page INTEGER,
    source_edition TEXT DEFAULT 'quran-uthmani',  -- which mushaf edition this Arabic text came from
    UNIQUE(surah_number, ayah_number)
);

CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,              -- e.g. 'en.sahih', 'ur.jalandhry'
    language TEXT NOT NULL,
    translator_name TEXT NOT NULL,
    is_simplified BOOLEAN DEFAULT FALSE      -- flags beginner-friendly/plain-English translations
);

CREATE TABLE IF NOT EXISTS ayah_translations (
    id SERIAL PRIMARY KEY,
    ayah_id INTEGER NOT NULL REFERENCES ayahs(id) ON DELETE CASCADE,
    translation_id INTEGER NOT NULL REFERENCES translations(id),
    text TEXT NOT NULL,
    UNIQUE(ayah_id, translation_id)
);

CREATE TABLE IF NOT EXISTS tafsir (
    id SERIAL PRIMARY KEY,
    ayah_id INTEGER NOT NULL REFERENCES ayahs(id) ON DELETE CASCADE,
    source TEXT NOT NULL,                   -- e.g. 'Ibn Kathir'
    text TEXT NOT NULL,
    publisher TEXT,                          -- e.g. publishing house of the print edition referenced
    source_edition TEXT                      -- which digital dataset/version this text came from
);

-- ---------- HADITH ----------

CREATE TABLE IF NOT EXISTS hadith_collections (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,              -- e.g. 'bukhari', 'muslim'
    name TEXT NOT NULL,
    total_hadith INTEGER
);

CREATE TABLE IF NOT EXISTS hadith_books (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES hadith_collections(id),
    book_number INTEGER NOT NULL,
    name_arabic TEXT,
    name_english TEXT NOT NULL,
    UNIQUE(collection_id, book_number)
);

CREATE TABLE IF NOT EXISTS hadiths (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES hadith_collections(id),
    book_id INTEGER REFERENCES hadith_books(id),
    hadith_number TEXT NOT NULL,             -- text since some use letters
    narrator TEXT,
    text_arabic TEXT,
    text_english TEXT NOT NULL,
    grade TEXT,                              -- e.g. 'Sahih', 'Hasan'
    source_edition TEXT DEFAULT 'fawazahmed0-hadith-api-v1',  -- which dataset/version this text came from
    UNIQUE(collection_id, hadith_number)
);

-- full text search index for hadith search endpoint
CREATE INDEX IF NOT EXISTS idx_hadith_text_search
    ON hadiths USING GIN (to_tsvector('english', text_english));

-- ---------- DUAS / FIQH ----------

CREATE TABLE IF NOT EXISTS dua_categories (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,               -- e.g. 'morning', 'travel'
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duas (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES dua_categories(id),
    title TEXT NOT NULL,
    text_arabic TEXT NOT NULL,
    transliteration TEXT,
    translation TEXT NOT NULL,
    reference TEXT                           -- source citation
);

CREATE TABLE IF NOT EXISTS fiqh_rulings (
    id SERIAL PRIMARY KEY,
    topic TEXT NOT NULL,
    madhab TEXT,                             -- Hanafi/Maliki/Shafi'i/Hanbali/General
    question TEXT NOT NULL,
    ruling TEXT NOT NULL,
    reference TEXT
);

-- ---------- ISNAD / NARRATORS ----------

CREATE TABLE IF NOT EXISTS narrators (
    id SERIAL PRIMARY KEY,
    name_arabic TEXT,
    name_english TEXT NOT NULL,
    kunya TEXT,                              -- honorific/teknonym, e.g. Abu Hurairah
    generation TEXT,                          -- e.g. 'Sahabi', 'Tabi'in', 'Tabi al-Tabi'in'
    birth_year_hijri INTEGER,
    death_year_hijri INTEGER,
    reliability_grade TEXT,                   -- e.g. 'Thiqah' (trustworthy), 'Da'if' (weak)
    bio TEXT,
    UNIQUE(name_english, kunya)
);

CREATE TABLE IF NOT EXISTS isnad_chains (
    id SERIAL PRIMARY KEY,
    hadith_id INTEGER NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
    narrator_id INTEGER NOT NULL REFERENCES narrators(id),
    chain_position INTEGER NOT NULL,          -- 1 = closest to the Prophet ﷺ, ascending from there
    UNIQUE(hadith_id, chain_position)
);

-- ---------- ARABIC ROOT WORDS / MORPHOLOGY ----------

CREATE TABLE IF NOT EXISTS quranic_roots (
    id SERIAL PRIMARY KEY,
    root_arabic TEXT UNIQUE NOT NULL,         -- e.g. 'ص ب ر'
    root_transliteration TEXT,
    meaning TEXT,                              -- core semantic meaning of the root
    occurrence_count INTEGER
);

CREATE TABLE IF NOT EXISTS ayah_words (
    id SERIAL PRIMARY KEY,
    ayah_id INTEGER NOT NULL REFERENCES ayahs(id) ON DELETE CASCADE,
    word_position INTEGER NOT NULL,           -- order of the word within the ayah
    text_arabic TEXT NOT NULL,
    transliteration TEXT,
    translation TEXT,
    root_id INTEGER REFERENCES quranic_roots(id),
    part_of_speech TEXT,
    UNIQUE(ayah_id, word_position)
);

CREATE INDEX IF NOT EXISTS idx_ayah_words_root ON ayah_words(root_id);

-- ---------- CROSS-REFERENCING (THEMATIC INDEX) ----------

CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,               -- e.g. 'patience', 'charity'
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ayah_topics (
    ayah_id INTEGER NOT NULL REFERENCES ayahs(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (ayah_id, topic_id)
);

CREATE TABLE IF NOT EXISTS hadith_topics (
    hadith_id INTEGER NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (hadith_id, topic_id)
);

-- ---------- AUDIO RECITATION ----------

CREATE TABLE IF NOT EXISTS reciters (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,               -- e.g. 'alafasy'
    name TEXT NOT NULL,
    audio_base_url TEXT NOT NULL             -- pattern the API fills in with surah/ayah
);

-- ---------- USER ACCOUNTS (students/researchers using bookmarking) ----------
-- Separate from api_keys, which authenticate developer/app access, not people.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- A bookmark can point at an ayah, a hadith, or a dua — item_type + item_ref
-- keeps this flexible without needing a separate table per content type.
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    study_list_id INTEGER REFERENCES study_lists(id) ON DELETE SET NULL,
    item_type TEXT NOT NULL,                 -- 'ayah' | 'hadith' | 'dua'
    item_ref TEXT NOT NULL,                  -- e.g. '2:153' or 'bukhari:1'
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_ref)
);

-- ---------- API KEYS (for public API consumers) ----------

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    owner_email TEXT,
    tier TEXT DEFAULT 'free',                -- free / pro
    requests_made INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
