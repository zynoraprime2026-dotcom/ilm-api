-- Dictionary module: word glosses and root-tagged vocabulary.
CREATE TABLE IF NOT EXISTS dictionary_words (
  id          SERIAL PRIMARY KEY,
  word        TEXT NOT NULL,
  word_plain  TEXT NOT NULL,          -- diacritics-stripped form for matching
  root        TEXT,                   -- e.g. ح-ل-ل (letter letters joined by -)
  pos         TEXT,
  gloss_en    TEXT,
  source      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dict_word_plain ON dictionary_words (word_plain);
CREATE INDEX IF NOT EXISTS idx_dict_root ON dictionary_words (root);
CREATE INDEX IF NOT EXISTS idx_dict_gloss_trgm ON dictionary_words USING gin (to_tsvector('english', gloss_en));
