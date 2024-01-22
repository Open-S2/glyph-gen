const fs = require('fs')
const Database = require('better-sqlite3')
const log = require('single-line-log').stdout
const schema = fs.readFileSync(__dirname + '/../lib/schema.sql', 'utf8')

const db = new Database(__dirname + '/../builtGlyphsTmp/merged.glyphs')
db.exec(schema)

const glyphs = getGlyphs()
// const glyphs = [
//   './builtGlyphsTmp/Roboto/RobotoRegular.font',
//   './builtGlyphsTmp/Roboto/RobotoMedium.font',
//   './builtGlyphsTmp/Noto/NotoSansRegular.font',
//   './builtGlyphsTmp/Noto/NotoSansMedium.font'
// ]

for (const glyph of glyphs) mergeGlyph(glyph)

function mergeGlyph (glyph) {
  const name = glyph.endsWith('font')
    ? glyph.split('.font')[0].split('/').pop()
    : glyph.split('.icon')[0].split('/').pop()
  console.log(name)
  const glyphDB = new Database(glyph, { readonly: true })
  // metadata
  const getMetadata = glyphDB.prepare('SELECT data FROM metadata WHERE name = @name')
  const meta = getMetadata.get({ name: 'metadata' })
  const writeMetadata = db.prepare('REPLACE INTO metadata (name, data) VALUES (@name, @data)')
  writeMetadata.run({ name, data: meta.data })

  // image
  const getExampleImage = glyphDB.prepare('SELECT data FROM example_image WHERE name = @name')
  const webp = getExampleImage.get({ name: 'image' })
  if (webp && webp.data) {
    const writeImage = db.prepare('REPLACE INTO example_image (name, data) VALUES (@name, @data)')
    writeImage.run({ name, data: webp.data })
  }

  // glyphs
  const writeGlyph = db.prepare('REPLACE INTO glyph_multi (name, code, data) VALUES (@name, @code, @data)')
  // grab codes
  const glyphs = meta.data.slice(30)
  const glyphCount = meta.data.readUInt16LE(10)
  const codes = []
  for (let i = 0; i < glyphCount; i++) {
    const code = glyphs.readUInt16LE(i * 2)
    codes.push(code)
  }
  // for each code get data
  const getGlyph = glyphDB.prepare('SELECT data FROM glyph WHERE code = @code')
  let i = 0
  for (const code of codes) {
    log(`${++i}/${glyphCount}`)
    const unicode = getGlyph.get({ code })
    writeGlyph.run({ name, code, data: unicode.data })
  }
  console.log()
}

function getGlyphs () {
  const glyphs = []
  const base = './builtGlyphsTmp'
  const folders = fs.readdirSync(base)
  for (const folder of folders) {
    if (folder === 'merged.glyphs') continue
    const files = fs.readdirSync(`${base}/${folder}`)
    for (const file of files) {
      if (file.endsWith('.font') || file.endsWith('icon')) glyphs.push(`${base}/${folder}/${file}`)
    }
  }
  return glyphs
}