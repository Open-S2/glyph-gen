BEGIN;

CREATE TABLE IF NOT EXISTS glyph (
    code TEXT NOT NULL,
    data TEXT -- base64 encoded string of Uint8Array
);

CREATE TABLE IF NOT EXISTS glyph_multi (
    name TEXT,
    code TEXT NOT NULL,
    data TEXT -- base64 encoded string of Uint8Array
);

CREATE TABLE IF NOT EXISTS metadata (
    name TEXT,
    data TEXT -- base64 encoded string of Uint8Array
);

CREATE UNIQUE INDEX IF NOT EXISTS glyph_index ON glyph (code);
CREATE UNIQUE INDEX IF NOT EXISTS glyph_multi_index ON glyph_multi (name, code);
CREATE UNIQUE INDEX IF NOT EXISTS meta_index ON metadata (name);

CREATE VIEW IF NOT EXISTS glyphs AS
    SELECT
        glyph.code AS code,
        glyph.data AS data
    FROM glyph;

CREATE VIEW IF NOT EXISTS glyphs_multi AS
    SELECT
        glyph_multi.name AS name,
        glyph_multi.code AS code,
        glyph_multi.data AS data
    FROM glyph_multi;

COMMIT;
