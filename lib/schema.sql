BEGIN;

CREATE TABLE IF NOT EXISTS glyph (
    code INTEGER NOT NULL,
    data blob
);

CREATE TABLE IF NOT EXISTS glyph_multi (
    name TEXT,
    code INTEGER NOT NULL,
    data blob
);


CREATE TABLE IF NOT EXISTS metadata (
    name TEXT,
    data blob
);

CREATE TABLE IF NOT EXISTS example_image (
    name TEXT,
    data blob
);

CREATE UNIQUE INDEX IF NOT EXISTS glyph_index ON glyph (code);
CREATE UNIQUE INDEX IF NOT EXISTS glyph_multi_index ON glyph_multi (name, code);
CREATE UNIQUE INDEX IF NOT EXISTS meta_index ON metadata (name);
CREATE UNIQUE INDEX IF NOT EXISTS example_image_index ON example_image (name);

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
