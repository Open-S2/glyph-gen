const fs = require('fs')
const Database = require('better-sqlite3')
const log = require('single-line-log').stdout
const schema = fs.readFileSync(__dirname + '/../lib/schema.sql', 'utf8')

// const BASE = 'http://localhost:8789/v1'
const BASE = 'http://localhost:8781'
// const BASE = 'https://uploadglyphs.s2maps.workers.dev'

const glyphs = getGlyphs()

setup()
  .then(async () => {
    for (const glyph of glyphs) await mergeGlyph(glyph)
  })

async function mergeGlyph (glyph) {
  const name = glyph.endsWith('font')
    ? glyph.split('.font')[0].split('/').pop()
    : glyph.split('.icon')[0].split('/').pop()
  console.log(name)
  const glyphDB = new Database(glyph, { readonly: true })
  // metadata
  const getMetadata = glyphDB.prepare('SELECT data FROM metadata WHERE name = @name')
  const meta = getMetadata.get({ name: 'metadata' })
  // UPLOAD METADATA
  await uploadMetadata(name, meta.data)

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
    await uploadGlyphs(name, code, unicode.data)
  }
  console.log()
  glyphDB.close()
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

async function setup () {
  await fetch(`${BASE}/setup`, {
    method: 'POST',
  })
    .then(async (res) => {
      console.log(res.status)
      console.log(await res.text())
    })
    .catch(err => {
      console.log('FAILED', err)
    })
}

async function uploadMetadata (name, data) {
  await fetch(`${BASE}/metadata/${name}`, {
    method: 'POST',
    body: data
  })
    .then((res) => {
      console.log(res.status)
    })
    .catch(err => {
      console.log('FAILED', err)
    })
}

async function uploadGlyphs (name, code, data) {
  await fetch(`${BASE}/glyphs/${name}/${code}`, {
    method: 'POST',
    body: data
  })
    .then((res) => {
      if (res.status !== 200) console.log(res.status)
    })
    .catch(err => {
      console.log('FAILED', err)
    })
}
