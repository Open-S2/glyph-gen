// @flow
const fs = require('fs')
const fsPromises = fs.promises
const { promisify } = require('util')
const zlib = require('zlib')
const { load } = require('opentype.js')
const { buildFontGlyph } = require('../../lib/binding.js')
const { PNG } = require('pngjs')
const { createCanvas } = require('canvas')
// const { lanczos } = require('@rgba-image/lanczos')
const { encodeLosslessRGBA } = require('webp-wrap')

const brotliCompress = promisify(zlib.brotliCompress)

const log = require('single-line-log').stdout

// const NOTOSANSREGULARFONTS = buildNoto(['Sans', 'Regular'], ['Mono', 'Condensed', 'UI-', 'Italic', 'Unjoined'])
// buildFont({
//   name: 'NotoSansRegular',
//   outPath: './builtGlyphs/Noto',
//   fontPaths: NOTOSANSREGULARFONTS,
//   extent: 8_192,
//   size: 22,
//   range: 6
// })

// FONT METADATA:
// Buffer [metadata, glyphs]
// metadata: size, maxHeight (largest height value), range, scale, alpha, name,
// extent, glyph count

// 54_081 glyphs in noto sans regular
// 10 bytes per glyph explination
// 54_081 * 10 = 540_810 bytes (540 kB) without compression
// open file
async function buildFont ({ name, outPath, fontPaths, extent, size, range }) {
  const buf = Buffer.alloc(512_000) // space for metadata
  buf[0] = 83 // S
  buf[1] = 50 // 2
  buf.writeUInt16LE(1, 2) // version
  // extent: 4 (writeUInt16LE)
  // size: 6 (writeUInt16LE)
  // maxHeight: 8 (writeUInt16LE)
  // range: 10 (writeUInt16LE)
  // defaultAdvance: 12 (writeUInt16LE)
  // 14 glyphMapSize (writeUInt32LE)
  // 18 image length (writeUInt32LE)
  // 22 colors length (writeUInt32LE)
  // 30 glyphs (glyphSize: 8 {unicode (2), position (4), length (2)})
  fs.appendFileSync(`${outPath}/${name}.font`, buf)
  // draw the font image
  const cursor = { file: fs.openSync(`${outPath}/${name}.font`, 'r+'), pos: 512_000 }
  await drawFont(fontPaths[0], cursor)

  // create an msdf object
  const msdf = { name, glyphSet: new Set(), glyphs: [], defaultAdvance: null, extent, range, size, maxHeight: 0 }
  // parse all fonts, if glyph already is stored, then it isn't read again.
  // In other words, whichever font goes first gets precedence on the glyph used.
  for (const path of fontPaths) await parseFont(path, msdf)
  msdf.glyphs = msdf.glyphs.sort((a, b) => a.unicode - b.unicode)
  // setup counter for logging
  const counter = { count: 0, total: msdf.glyphs.length }

  // build
  await buildGlyphs(msdf, cursor, counter)
  // store the metadata
  await serializeMetadata(msdf, cursor)
}

// unicode - width - height 103 27 36
// sizeX - sizeY 1908 3056
// range - xOffset - yOffset 6 4 12
// ACTUAL 21 30 2 37.5 32 2322
// ACTUAL BOUNDS 19.1875 -1.71875 20.21875 -9.65625

// unicode - width - height 103 26 33
// sizeX - sizeY 1908 3056
// range - xOffset - yOffset 6 4 11
// ACTUAL 19 27 2 37.5 32 2322
// ACTUAL BOUNDS 16.7890625 -1.50390625 17.69140625 -8.44921875

async function drawFont (fontPath, cursor) {
  // get font
  const font = await loadFont(fontPath)
  // build canvas and get context
  const width = 1200
  const height = 580
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.antialias = 'subpixel'
  context.fillStyle = 'white'
  context.quality = 'best'
  context.fillRect(0, 0, width, height)
  // draw
  let path = font.getPath('The quick brown fox', 40, 80, 72)
  path.fill = '#1f272d'
  path.draw(context)
  path = font.getPath('jumped over the lazy dog.', 40, 160, 72)
  path.fill = '#1f272d'
  path.draw(context)
  path = font.getPath('THE QUICK BROWN FOX', 40, 300, 72)
  path.fill = '#1f272d'
  path.draw(context)
  path = font.getPath('JUMPED OVER THE LAZY DOG.', 40, 380, 72)
  path.fill = '#1f272d'
  path.draw(context)
  path = font.getPath('0123456789!"#$%&\'()*+,-./:;<=>?@', 40, 520, 72)
  path.fill = '#1f272d'
  path.draw(context)
  // build buffer and store
  const buffer = canvas.toBuffer('image/png')
  let { data } = PNG.sync.read(buffer)
  data = new Uint8ClampedArray(data)
  let webp = encodeLosslessRGBA(data.buffer, width, height)
  webp = Buffer.from(webp)
  // store
  const webpMeta = Buffer.alloc(4)
  webpMeta.writeUInt32LE(webp.length)
  fs.writeSync(cursor.file, webpMeta, 0, webpMeta.length, 18)
  fs.writeSync(cursor.file, webp, 0, webp.length, 512_000)
  // update position
  cursor.pos += webp.length
}

async function parseFont (path, msdf) {
  log(`parsing ${path}`)
  const { round, abs } = Math
  const font = await loadFont(path)
  if (font) {
    const { unitsPerEm } = font
    const mul = msdf.extent / unitsPerEm
    const { glyphs } = font.glyphs

    for (const glyph of Object.values(glyphs)) {
      const { unicodes, advanceWidth, leftSideBearing } = glyph
      const bbox = glyph.getBoundingBox()
      for (const unicode of unicodes) {
        if (
          !isNaN(unicode) &&
          unicode >= 0 &&
          unicode <= 65535 &&
          !msdf.glyphSet.has(unicode)
        ) {
          msdf.glyphs.push({
            unicode,
            path,
            dead: abs(bbox.x2 - bbox.x1) < 1 && abs(bbox.y2 - bbox.y1) < 1,
            char: String.fromCharCode(unicode),
            bbox: { x1: round(bbox.x1 * mul), x2: round(bbox.x2 * mul), y1: round(bbox.y1 * mul), y2: round(bbox.y2 * mul) },
            advanceWidth: round(advanceWidth * mul),
            leftSideBearing
          })
          msdf.glyphSet.add(unicode)
          if (unicode === 32 && !msdf.defaultAdvance) msdf.defaultAdvance = round(advanceWidth * mul)
        }
      }
    }
  }
}

async function loadFont (path) {
  return new Promise(res => {
    load(path, (err, font) => {
      if (!err && font) res(font)
      else res()
    })
  })
}

// build glyph objects and add
async function buildGlyphs (msdf, cursor, counter) {
  const { extent, size, range, glyphs } = msdf
  // prep variables
  const { ceil, round } = Math

  // build each glyph
  for (const glyph of glyphs) {
    log(`${++counter.count} / ${counter.total}`)
    const { path, unicode, bbox, dead } = glyph
    // if a "dead" unicode, we skip the image
    if (!dead) {
      // STEP 1) BUILD AND CREATE METADATA
      // create the msdf or mtsdf
      let { data, width, height, r, l, t, b, emSize } = buildFontGlyph(path, unicode, size, range, true)
      r = round(r / emSize * extent)
      l = round(l / emSize * extent)
      t = round(t / emSize * extent)
      b = round(b / emSize * extent)
      if (data) {
        // update height
        msdf.maxHeight = Math.max(height, msdf.maxHeight)
        // bufferize
        data = Buffer.from(data)
        // update glyph information
        glyph.width = r - l // size * ceil(width / extent) = texture-width
        glyph.height = t - b // size * ceil(height / extent) = texture-height
        glyph.texWidth = width
        glyph.texHeight = height
        glyph.xOffset = l
        glyph.yOffset = b
      } else { glyph.dead = true; continue }
      // kill glyph if certain values are out of bounds
      if (glyph.width < 1 || glyph.width > 65535) { glyph.dead = true; continue }
      if (glyph.height < 1 || glyph.height > 65535) { glyph.dead = true; continue }
      if (glyph.texWidth < 1 || glyph.texWidth > 255) { glyph.dead = true; continue }
      if (glyph.texHeight < 1 || glyph.texHeight > 255) { glyph.dead = true; continue }

      const glyphXOffset = zigzag(glyph.xOffset)
      const glyphYOffset = zigzag(glyph.yOffset)
      const glyphAdvanceWidth = zigzag(glyph.advanceWidth)
      if (glyphXOffset < 0 || glyphXOffset > 65535) { glyph.dead = true; continue }
      if (glyphYOffset < 0 || glyphYOffset > 65535) { glyph.dead = true; continue }
      if (glyphAdvanceWidth < 0 || glyphAdvanceWidth > 65535) { glyph.dead = true; continue }

      // STEP 2: STORE METADATA AND IMAGE DATA
      let meta = Buffer.alloc(14)
      meta.writeUInt16LE(glyph.unicode, 0)
      meta.writeUInt16LE(glyph.width, 2)
      meta.writeUInt16LE(glyph.height, 4)
      meta.writeUInt8(glyph.texWidth, 6)
      meta.writeUInt8(glyph.texHeight, 7)
      meta.writeUInt16LE(glyphXOffset, 8)
      meta.writeUInt16LE(glyphYOffset, 10)
      meta.writeUInt16LE(glyphAdvanceWidth, 12)

      // bundle
      const glyphBuffer = Buffer.concat([meta, data])
      glyph.length = glyphBuffer.length
      glyph.pos = cursor.pos
      // store
      fs.writeSync(cursor.file, glyphBuffer, 0, glyphBuffer.length, cursor.pos)
      // update position
      cursor.pos += glyphBuffer.length
    }
  }
}

// FONT METADATA:
// Buffer [metadata, glyphs]
// metadata: size, maxHeight (largest height value), range, scale, name,
// extent, glyphs
async function serializeMetadata (msdf, cursor) {
  const { name, extent, size, maxHeight, range, glyphs, defaultAdvance } = msdf

  // build the glyph map
  const aliveGlyphs = glyphs.filter(g => !g.dead)
  const glyphCount = aliveGlyphs.length
  const glyphMap = Buffer.alloc(8 * glyphCount)
  let pos = 0
  for (const glyph of aliveGlyphs) {
    glyphMap.writeUInt16LE(glyph.unicode, pos)
    glyphMap.writeUInt32LE(glyph.pos, pos + 2)
    glyphMap.writeUInt16LE(glyph.length, pos + 6)
    pos += 8
  }
  // br encode the map
  const glyphMapBR = await brotliCompress(glyphMap, {
    chunkSize: 32 * 1024,
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_GENERIC,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: glyphMap.length
    }
  })
  // store the map
  fs.writeSync(cursor.file, glyphMapBR, 0, glyphMapBR.length, 30)

  // store the metadata
  const meta = Buffer.alloc(14)
  meta.writeUInt16LE(extent, 0)
  meta.writeUInt16LE(size, 2)
  meta.writeUInt16LE(maxHeight, 4)
  meta.writeUInt16LE(range, 6)
  meta.writeUInt16LE(defaultAdvance, 8)
  meta.writeUInt32LE(glyphMapBR.length, 10)
  fs.writeSync(cursor.file, meta, 0, meta.length, 4)
}

function zigzag (num) {
  return (num << 1) ^ (num >> 31)
}

exports.buildFont = buildFont