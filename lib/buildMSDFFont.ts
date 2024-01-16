import fs from 'fs'
import path from 'path'
import { load } from 'opentype.js'
import { buildFontGlyph } from 'binding'
import { createCanvas } from 'canvas'
import sharp from 'sharp'
import DatabaseConstructor from 'better-sqlite3'
import { stdout as log } from 'single-line-log'

import type { Font, GlyphSet } from 'opentype.js'
import type { Database } from 'better-sqlite3'

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

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

export interface FontOptions {
  /** name of the project */
  name: string
  /** path to the output file */
  out: string
  /** path to the font files; Glyphs will be stored in order of the font order provided */
  fontPaths: string[]
  /** if the font already exists, allow to "overwrite" any existing data */
  overwrite?: boolean
  /** extent of the font; Recommend 8_192 */
  extent: number
  /** Size of the glyph image by height; Recommend 32 to start */
  size: number
  /** range of the buffer around the glyph; recommend 6 */
  range: number
}

export interface Glyph {
  /** unicode of the glyph */
  unicode: number
  /** path to the font */
  path: string
  /** if the glyph is dead, it is skipped */
  dead: boolean
  /** unicode character of the glyph */
  char: string
  /** bounding box of the glyph */
  bbox: { x1: number, x2: number, y1: number, y2: number }
  /** width of the glyph */
  width: number
  /** height of the glyph */
  height: number
  /** texture width of the glyph */
  texWidth: number
  /** texture height of the glyph */
  texHeight: number
  /** x offset of the glyph */
  xOffset: number
  /** y offset of the glyph */
  yOffset: number
  /** advance width of the glyph */
  advanceWidth: number
  /** length of the glyph */
  length: number
  /** left side bearing of the glyph */
  leftSideBearing: number
}

export interface MSDF {
  /** name of the project */
  name: string
  /** set of glyph unicodes */
  glyphSet: Set<number>
  /** array of glyphs */
  glyphs: Glyph[]
  /** default advance width */
  defaultAdvance: number
  /** extent of the font */
  extent: number
  /** size of the font */
  size: number
  /** max height of the font */
  maxHeight: number
  /** range of the font */
  range: number
}

export interface Counter {
  count: number
  total: number
}

interface FontGlyph {
  unicodes: number[]
  advanceWidth: number
  leftSideBearing: number
  getBoundingBox: () => { x1: number, x2: number, y1: number, y2: number }
}

// 54_081 glyphs in noto sans regular
// 2 bytes per glyph explination (for glyph list)
// 54_081 * 2 = 108_162 bytes (108 kB)
// 14 kB for head metadata
// open file
export default async function buildFont ({ name, out, fontPaths, overwrite, extent, size, range }: FontOptions): Promise<void> {
  // extent: 4 (writeUInt16LE)
  // size: 6 (writeUInt16LE)
  // maxHeight: 8 (writeUInt16LE)
  // range: 10 (writeUInt16LE)
  // defaultAdvance: 12 (writeUInt16LE)
  // 14 glyphMapSize (writeUInt32LE)
  // 18 image length (writeUInt32LE)
  // 22 colors length (writeUInt32LE)
  // 30 glyphs (glyphSize: 8 {unicode (2), position (4), length (2)})
  // draw the font image
  if (fs.existsSync(out) && overwrite !== true) {
    console.log(`FAILED, "${out}" set already exists.`)
    return
  }

  const db = new DatabaseConstructor(out)
  db.pragma('journal_mode = WAL')
  db.exec(schema)
  await drawFont(fontPaths[0], db)

  // create an msdf object
  const msdf: MSDF = { name, glyphSet: new Set<number>(), glyphs: [], defaultAdvance: -1, extent, range, size, maxHeight: 0 }
  // parse all fonts, if glyph already is stored, then it isn't read again.
  // In other words, whichever font goes first gets precedence on the glyph used.
  for (const path of fontPaths) await parseFont(path, msdf)
  msdf.glyphs = msdf.glyphs.sort((a, b) => a.unicode - b.unicode)
  // setup counter for logging
  const counter: Counter = { count: 0, total: msdf.glyphs.length }

  // build
  await buildGlyphs(msdf, counter, db)
  // store the metadata
  await serializeMetadata(msdf, db)
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

async function drawFont (fontPath: string, db: Database): Promise<void> {
  // get font
  const font = await loadFont(fontPath)
  if (font === undefined) { console.log(`FAILED, ${fontPath} failed to load.`); return }
  // build canvas and get context
  const width = 1200
  const height = 580
  const canvas = createCanvas(width, height)
  // NOTE: not using the same context as the one in the binding
  const context = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
  // @ts-expect-error - private property but I need to use it
  context.antialias = 'subpixel'
  context.fillStyle = 'white'
  // @ts-expect-error - private property but I need to use it
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
  const webp = await sharp(buffer).webp({ lossless: true }).toBuffer()
  // store
  // Write image to sql
  const writeImage = db.prepare('REPLACE INTO example_image (name, data) VALUES (@name, @data)')
  writeImage.run({ name: 'image', data: webp })
}

async function parseFont (path: string, msdf: MSDF): Promise<void> {
  log(`parsing ${path}`)
  const { round, abs } = Math
  const font = await loadFont(path)
  if (font != null) {
    const { unitsPerEm } = font
    const mul = msdf.extent / unitsPerEm
    // @ts-expect-error - private property but I need to use it
    const glyphs = font.glyphs.glyphs as GlyphSet

    for (const glyph of Object.values(glyphs) as FontGlyph[]) {
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
            leftSideBearing,
            // these are filled in later
            width: -1,
            height: -1,
            texWidth: -1,
            texHeight: -1,
            xOffset: -1,
            yOffset: -1,
            length: -1
          })
          msdf.glyphSet.add(unicode)
          if (unicode === 32 && msdf.defaultAdvance === -1) msdf.defaultAdvance = round(advanceWidth * mul)
        }
      }
    }
  } else {
    console.log('\n', path, ' has failed')
  }
}

async function loadFont (path: string): Promise<Font | undefined> {
  return await new Promise((resolve) => {
    load(path, (err, font) => {
      if (err !== undefined) console.log(err)
      if (err === undefined && (font != null)) resolve(font)
      else resolve(undefined)
    })
  })
}

// build glyph objects and add
async function buildGlyphs (msdf: MSDF, counter: Counter, db: Database): Promise<void> {
  const { extent, size, range, glyphs } = msdf
  // prep variables
  const { round } = Math

  // build each glyph
  for (const glyph of glyphs) {
    log(`${++counter.count} / ${counter.total}`)
    const { path, unicode, dead } = glyph
    let buffer = Buffer.alloc(0)
    // if a "dead" unicode, we skip the image
    if (!dead) {
      // STEP 1) BUILD AND CREATE METADATA
      // create the msdf or mtsdf
      let { data, width, height, r, l, t, b, emSize } = buildFontGlyph(path, unicode, size, range, 'mtsdf', false)
      r = round(r / emSize * extent)
      l = round(l / emSize * extent)
      t = round(t / emSize * extent)
      b = round(b / emSize * extent)
      if (data !== undefined) {
        // update height
        msdf.maxHeight = Math.max(height, msdf.maxHeight)
        // bufferize
        buffer = Buffer.from(data)
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
      const meta = Buffer.alloc(14)
      meta.writeUInt16LE(glyph.unicode, 0)
      meta.writeUInt16LE(glyph.width, 2)
      meta.writeUInt16LE(glyph.height, 4)
      meta.writeUInt8(glyph.texWidth, 6)
      meta.writeUInt8(glyph.texHeight, 7)
      meta.writeUInt16LE(glyphXOffset, 8)
      meta.writeUInt16LE(glyphYOffset, 10)
      meta.writeUInt16LE(glyphAdvanceWidth, 12)

      // bundle
      const glyphBuffer = Buffer.concat([meta, buffer])
      glyph.length = glyphBuffer.length
      // store
      //  Write to SQL ask key->unicode and value->glyphBuffer
      const writeGlyph = db.prepare('REPLACE INTO glyph (code, data) VALUES (@code, @data)')
      writeGlyph.run({ code: unicode, data: glyphBuffer })
    }
  }
}

// FONT METADATA:
// Buffer [metadata, glyphs]
// metadata: size, maxHeight (largest height value), range, scale, name,
// extent, glyphs
async function serializeMetadata (msdf: MSDF, db: Database): Promise<void> {
  const { extent, size, maxHeight, range, glyphs, defaultAdvance } = msdf

  // build the glyph map
  const aliveGlyphs = glyphs.filter(g => !g.dead)
  const glyphCount = aliveGlyphs.length
  const glyphMap = Buffer.alloc(2 * glyphCount)
  let pos = 0
  for (const glyph of aliveGlyphs) {
    glyphMap.writeUInt16LE(glyph.unicode, pos)
    pos += 2
  }

  // build the metadata
  const meta = Buffer.alloc(30)
  meta.writeUInt16LE(extent, 0)
  meta.writeUInt16LE(size, 2)
  meta.writeUInt16LE(maxHeight, 4)
  meta.writeUInt16LE(range, 6)
  meta.writeUInt16LE(defaultAdvance, 8)
  meta.writeUInt16LE(glyphCount, 10)
  meta.writeUInt32LE(0, 12) // iconMapCount (unused in fonts)
  meta.writeUInt16LE(0, 16) // colorCount (unused in fonts)
  const metaBuffer = Buffer.concat([meta, glyphMap])

  // Store metadata in sqlite database
  const writeMetadata = db.prepare('REPLACE INTO metadata (name, data) VALUES (@name, @data)')
  writeMetadata.run({ name: 'metadata', data: metaBuffer })
}

function zigzag (num: number): number {
  return (num << 1) ^ (num >> 31)
}
